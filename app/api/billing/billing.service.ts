/**
 * Billing service — freemium subscription upgrades.
 *
 * Two modes, switched on the presence of STRIPE_SECRET_KEY:
 *
 *  - MOCK (no key): "checkout" upgrades the user synchronously and points them
 *    at the in-app success page. Lets the whole tier/quota flow be exercised
 *    locally without a Stripe account.
 *  - LIVE (key set): a real Stripe Checkout Session (subscription mode) is
 *    created. The plan is applied when the user returns to success_url and we
 *    confirm the session (`confirmCheckout`), and/or when Stripe fires a webhook
 *    (`handleWebhook`). Both funnel through `applyPaidPlan`, so either path —
 *    whichever lands first — produces the same result.
 *
 * Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PLUS,
 * STRIPE_PRICE_PRO, APP_URL (fallback base for redirect URLs).
 */

import Stripe from "stripe";
import { UserModel, type PlanTier } from "../models/user.model";

const PAID_PLANS: PlanTier[] = ["plus", "pro"];
const FALLBACK_DAYS = 30; // expiry used when Stripe gives us no period end

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function isPaidPlan(plan: string): plan is PlanTier {
  return PAID_PLANS.includes(plan as PlanTier);
}

function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

/**
 * Subscription period end (unix seconds), read defensively: newer Stripe API
 * versions expose it on subscription items rather than the subscription root.
 */
function periodEndOf(sub: Stripe.Subscription | null | undefined): number | null {
  if (!sub || typeof sub !== "object") return null;
  const s = sub as unknown as {
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  return s.current_period_end ?? s.items?.data?.[0]?.current_period_end ?? null;
}

/** Stripe Price id for a paid plan, from env. */
function priceFor(plan: PlanTier): string {
  const id = plan === "plus" ? process.env.STRIPE_PRICE_PLUS : process.env.STRIPE_PRICE_PRO;
  if (!id) throw new Error(`No Stripe price configured for the ${plan} plan`);
  return id;
}

export interface CheckoutResult {
  mock: boolean;
  plan: PlanTier;
  redirectUrl: string;
  planExpiresAt: string | null;
}

/**
 * Start a checkout for `plan`. Mock mode applies the upgrade immediately; live
 * mode returns a Stripe-hosted Checkout URL. `origin` is the app base URL used
 * to build the return links (live mode only).
 */
export async function startCheckout(
  userId: string,
  plan: PlanTier,
  origin: string,
): Promise<CheckoutResult> {
  if (!isPaidPlan(plan)) {
    throw new Error("Only paid plans (plus, pro) can be purchased");
  }

  if (!isStripeConfigured()) {
    // ── Mock mode ──────────────────────────────────────────────────────────
    const expires = new Date(Date.now() + FALLBACK_DAYS * 24 * 60 * 60 * 1000);
    await UserModel.updateOne({ _id: userId }, { $set: { plan, planExpiresAt: expires } }).exec();
    return {
      mock: true,
      plan,
      redirectUrl: `/billing/success?plan=${plan}&mock=1`,
      planExpiresAt: expires.toISOString(),
    };
  }

  // ── Live mode ────────────────────────────────────────────────────────────
  const base = (origin || process.env.APP_URL || "").replace(/\/$/, "");
  const user = await UserModel.findById(userId).select("email stripeCustomerId").lean().exec();

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceFor(plan), quantity: 1 }],
    success_url: `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/billing?canceled=1`,
    client_reference_id: userId,
    ...(user?.stripeCustomerId
      ? { customer: user.stripeCustomerId }
      : user?.email
        ? { customer_email: user.email }
        : {}),
    metadata: { userId, plan },
    subscription_data: { metadata: { userId, plan } },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { mock: false, plan, redirectUrl: session.url, planExpiresAt: null };
}

/** Apply a paid plan to a user — the single seam both confirm and webhook hit. */
async function applyPaidPlan(
  userId: string,
  plan: PlanTier,
  opts: { customerId?: string | null; subscriptionId?: string | null; periodEnd?: number | null },
): Promise<Date> {
  const expires = opts.periodEnd
    ? new Date(opts.periodEnd * 1000)
    : new Date(Date.now() + FALLBACK_DAYS * 24 * 60 * 60 * 1000);
  await UserModel.updateOne(
    { _id: userId },
    {
      $set: {
        plan,
        planExpiresAt: expires,
        ...(opts.customerId ? { stripeCustomerId: opts.customerId } : {}),
        ...(opts.subscriptionId ? { stripeSubscriptionId: opts.subscriptionId } : {}),
      },
    },
  ).exec();
  return expires;
}

export interface ConfirmResult {
  plan: PlanTier;
  planExpiresAt: string;
}

/**
 * Confirm a completed Checkout Session (called from the success_url landing) and
 * apply the plan. Idempotent: re-confirming an already-applied session is safe.
 */
export async function confirmCheckout(sessionId: string): Promise<ConfirmResult> {
  const session = await stripe().checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  if (session.payment_status !== "paid" && session.status !== "complete") {
    throw new Error("Payment has not completed yet");
  }

  const userId = session.client_reference_id || session.metadata?.userId;
  const plan = session.metadata?.plan;
  if (!userId || !isPaidPlan(plan ?? "")) {
    throw new Error("Checkout session is missing plan metadata");
  }

  const sub = session.subscription as Stripe.Subscription | string | null;
  const subscriptionId = typeof sub === "string" ? sub : (sub?.id ?? null);
  const periodEnd = typeof sub === "object" ? periodEndOf(sub) : null;

  const expires = await applyPaidPlan(userId, plan as PlanTier, {
    customerId: typeof session.customer === "string" ? session.customer : null,
    subscriptionId,
    periodEnd,
  });
  return { plan: plan as PlanTier, planExpiresAt: expires.toISOString() };
}

/**
 * Verify and handle a Stripe webhook event. Requires the raw request body —
 * works only behind a raw-body parser for this route (the global express.json
 * consumes the stream otherwise). The confirm-on-redirect path is the primary
 * upgrade mechanism; this is the lifecycle backstop (renewals, cancellations).
 */
export async function handleWebhook(rawBody: Buffer | string, signature: string): Promise<void> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

  const event = stripe().webhooks.constructEvent(rawBody, signature, secret);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id || session.metadata?.userId;
      const plan = session.metadata?.plan;
      if (userId && isPaidPlan(plan ?? "")) {
        await applyPaidPlan(userId, plan as PlanTier, {
          customerId: typeof session.customer === "string" ? session.customer : null,
          subscriptionId: typeof session.subscription === "string" ? session.subscription : null,
        });
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const plan = sub.metadata?.plan;
      const userId = sub.metadata?.userId;
      if (userId && isPaidPlan(plan ?? "") && sub.status === "active") {
        await applyPaidPlan(userId, plan as PlanTier, {
          subscriptionId: sub.id,
          periodEnd: periodEndOf(sub),
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await UserModel.updateOne(
        { stripeSubscriptionId: sub.id },
        { $set: { plan: "free", planExpiresAt: null, stripeSubscriptionId: null } },
      ).exec();
      break;
    }
    default:
      break; // ignore unrelated events
  }
}

/** Cancel/downgrade. Live mode cancels the Stripe subscription too. */
export async function cancelSubscription(userId: string): Promise<void> {
  if (isStripeConfigured()) {
    const user = await UserModel.findById(userId).select("stripeSubscriptionId").lean().exec();
    if (user?.stripeSubscriptionId) {
      await stripe().subscriptions.cancel(user.stripeSubscriptionId).catch(() => {});
    }
  }
  await UserModel.updateOne(
    { _id: userId },
    { $set: { plan: "free", planExpiresAt: null, stripeSubscriptionId: null } },
  ).exec();
}
