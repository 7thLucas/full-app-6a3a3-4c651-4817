/**
 * Billing API — freemium subscription surface.
 *
 *   GET  /api/billing/plan      — current tier, all tier definitions, today's usage.
 *   POST /api/billing/checkout  — { plan } upgrade (mock-applies when Stripe unconfigured).
 *   POST /api/billing/cancel    — downgrade to free.
 *   POST /api/billing/webhook   — Stripe event sink (live mode; no-op while mock).
 *
 * Mounted explicitly in app/api/routes.ts (this lives outside the module
 * auto-discovery scan). All mutating routes require auth.
 */

import { Router, type Request, type Response } from "express";
import { createLogger } from "~/lib/logger";
import { ConfigurablesService } from "~/modules/configurables/src/services/configurables.service";
import { defaultConfigurablesData, type TPlans } from "~/modules/configurables/src/constants/configurables.default";
import { authGuard, type AuthedRequest } from "../middleware/auth.guard";
import { getUsageToday } from "../services/usage.service";
import { cancelSubscription, isStripeConfigured, startCheckout } from "./billing.service";

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
    const result = await startCheckout(user.id, plan);
    return res.json({ success: true, data: result });
  } catch (error) {
    logger.error("POST /billing/checkout failed", error);
    // Live checkout not yet implemented → 501; everything else is a 400-class input issue.
    const msg = error instanceof Error ? error.message : "Checkout failed";
    return fail(res, msg.includes("not implemented") ? 501 : 400, msg);
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

// Stripe webhook sink. Signature verification + event handling land with the
// live payment path; in mock mode there are no events to receive.
router.post("/billing/webhook", (_req: Request, res: Response) => {
  if (!isStripeConfigured()) {
    return res.json({ success: true, data: { ignored: true, reason: "mock mode" } });
  }
  logger.warn("Stripe webhook received but live handling is not implemented yet");
  return res.status(501).json({ success: false, message: "Webhook handling not implemented" });
});

export default router;
