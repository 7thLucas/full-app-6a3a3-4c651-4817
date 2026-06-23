/**
 * Billing API — freemium subscription surface.
 *
 *   GET  /api/billing/plan      — current tier, all tier definitions, today's usage.
 *   POST /api/billing/checkout  — { plan } start an upgrade (mock-applies, or returns a Stripe URL).
 *   POST /api/billing/confirm   — { sessionId } confirm a returned Checkout Session and apply the plan.
 *   POST /api/billing/cancel    — downgrade to free (cancels the Stripe subscription in live mode).
 *   POST /api/billing/webhook   — Stripe lifecycle events (live mode; needs a raw-body parser).
 *
 * Mounted explicitly in app/api/routes.ts (this lives outside the module
 * auto-discovery scan). All mutating routes except the webhook require auth.
 */

import { Router, type Request, type Response } from "express";
import { createLogger } from "~/lib/logger";
import { ConfigurablesService } from "~/modules/configurables/src/services/configurables.service";
import { defaultConfigurablesData, type TPlans } from "~/modules/configurables/src/constants/configurables.default";
import { authGuard, type AuthedRequest } from "../middleware/auth.guard";
import { getUsageToday } from "../services/usage.service";
import {
  cancelSubscription,
  confirmCheckout,
  handleWebhook,
  isStripeConfigured,
  startCheckout,
} from "./billing.service";

const logger = createLogger("BillingRoutes");
const router = Router();

function fail(res: Response, status: number, message: string) {
  return res.status(status).json({ success: false, message });
}

async function getPlans(): Promise<TPlans> {
  const data = (await ConfigurablesService.getData()) as Partial<{ plans: TPlans }>;
  return data.plans ?? defaultConfigurablesData.plans;
}

router.get("/billing/plan", authGuard, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthedRequest).user!;
    const [plans, usage] = await Promise.all([getPlans(), getUsageToday(user.id)]);
    return res.json({
      success: true,
      data: {
        plan: user.plan,
        plans,
        usage,
        billingMode: isStripeConfigured() ? "live" : "mock",
      },
    });
  } catch (error) {
    logger.error("GET /billing/plan failed", error);
    return fail(res, 500, error instanceof Error ? error.message : "Failed to load billing");
  }
});

router.post("/billing/checkout", authGuard, async (req: Request, res: Response) => {
  const plan = String(req.body?.plan ?? "");
  if (plan !== "plus" && plan !== "pro") {
    return fail(res, 400, "plan must be 'plus' or 'pro'");
  }
  try {
    const user = (req as AuthedRequest).user!;
    const origin = `${req.protocol}://${req.get("host")}`;
    const result = await startCheckout(user.id, plan, origin);
    return res.json({ success: true, data: result });
  } catch (error) {
    logger.error("POST /billing/checkout failed", error);
    return fail(res, 400, error instanceof Error ? error.message : "Checkout failed");
  }
});

router.post("/billing/confirm", authGuard, async (req: Request, res: Response) => {
  const sessionId = String(req.body?.sessionId ?? "");
  if (!sessionId) return fail(res, 400, "sessionId is required");
  try {
    const result = await confirmCheckout(sessionId);
    return res.json({ success: true, data: result });
  } catch (error) {
    logger.error("POST /billing/confirm failed", error);
    return fail(res, 400, error instanceof Error ? error.message : "Could not confirm checkout");
  }
});

router.post("/billing/cancel", authGuard, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthedRequest).user!;
    await cancelSubscription(user.id);
    return res.json({ success: true, data: { plan: "free" } });
  } catch (error) {
    logger.error("POST /billing/cancel failed", error);
    return fail(res, 500, error instanceof Error ? error.message : "Cancel failed");
  }
});

// Stripe lifecycle webhook. Signature verification needs the raw request bytes;
// the global express.json on /api consumes them, so this works only if a
// raw-body parser is mounted ahead of it for this path (and `req.rawBody` set).
// Until then the primary upgrade path is POST /billing/confirm on success_url.
router.post("/billing/webhook", async (req: Request, res: Response) => {
  if (!isStripeConfigured()) {
    return res.json({ success: true, data: { ignored: true, reason: "mock mode" } });
  }
  const signature = req.headers["stripe-signature"];
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!raw || typeof signature !== "string") {
    logger.warn("Webhook missing raw body or signature; cannot verify (use /billing/confirm)");
    return res.status(400).json({ success: false, message: "Raw body unavailable for signature verification" });
  }
  try {
    await handleWebhook(raw, signature);
    return res.json({ success: true, data: { received: true } });
  } catch (error) {
    logger.error("POST /billing/webhook failed", error);
    return fail(res, 400, error instanceof Error ? error.message : "Webhook error");
  }
});

export default router;
