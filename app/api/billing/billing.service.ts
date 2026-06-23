/**
 * Billing service — freemium subscription upgrades.
 *
 * Real Stripe wiring is gated behind STRIPE_SECRET_KEY. When that env var is
 * absent (local dev, demos, previews) we run in MOCK mode: "checkout" upgrades
 * the user immediately and returns a fake redirect, so the whole tier/quota
 * flow is exercisable end-to-end without a Stripe account. When the key is
 * present, the real Checkout + webhook path takes over (added in the payments
 * phase) — this module is the single seam where that swap happens.
 */

import { UserModel, type PlanTier } from "../models/user.model";

const PAID_PLANS: PlanTier[] = ["plus", "pro"];
const SUBSCRIPTION_DAYS = 30;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function isPaidPlan(plan: string): plan is PlanTier {
  return PAID_PLANS.includes(plan as PlanTier);
}

export interface CheckoutResult {
  mock: boolean;
  plan: PlanTier;
  redirectUrl: string;
  planExpiresAt: string | null;
}

/**
 * Start a checkout for `plan`. In mock mode the upgrade is applied synchronously
 * and the caller is pointed at the in-app success page. In live mode this is
 * where a Stripe Checkout Session would be created and its URL returned.
 */
export async function startCheckout(userId: string, plan: PlanTier): Promise<CheckoutResult> {
  if (!isPaidPlan(plan)) {
    throw new Error("Only paid plans (plus, pro) can be purchased");
  }

  if (isStripeConfigured()) {
    // Real Stripe Checkout Session creation lands in the payments phase; the
    // webhook then flips the plan on `checkout.session.completed`.
    throw new Error("Live Stripe checkout is not implemented yet");
  }

  // ── Mock mode ──────────────────────────────────────────────────────────
  const expires = new Date(Date.now() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);
  await UserModel.updateOne(
    { _id: userId },
    { $set: { plan, planExpiresAt: expires } },
  ).exec();

  return {
    mock: true,
    plan,
    redirectUrl: `/billing/success?plan=${plan}&mock=1`,
    planExpiresAt: expires.toISOString(),
  };
}

/** Cancel/downgrade a user back to the free tier immediately. */
export async function cancelSubscription(userId: string): Promise<void> {
  await UserModel.updateOne(
    { _id: userId },
    { $set: { plan: "free", planExpiresAt: null } },
  ).exec();
}
