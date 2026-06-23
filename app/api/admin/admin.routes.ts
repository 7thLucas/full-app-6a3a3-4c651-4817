/**
 * Admin API — billing & usage analytics for the owner dashboard.
 *
 *   GET /api/admin/billing/stats — plan distribution, MRR, usage today, recent upgrades.
 *
 * Mounted explicitly in app/api/routes.ts. Locked to the "admin" role.
 */

import { Router, type Request, type Response } from "express";
import { createLogger } from "~/lib/logger";
import { ConfigurablesService } from "~/modules/configurables/src/services/configurables.service";
import { defaultConfigurablesData, type TPlans } from "~/modules/configurables/src/constants/configurables.default";
import { authGuard, permissionGuard } from "../middleware/auth.guard";
import { UserModel, type PlanTier } from "../models/user.model";
import { UsageMeterModel } from "../models/usage-meter.model";

const logger = createLogger("AdminRoutes");
const router = Router();

function dayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

async function getPlans(): Promise<TPlans> {
  const data = (await ConfigurablesService.getData()) as Partial<{ plans: TPlans }>;
  return data.plans ?? defaultConfigurablesData.plans;
}

router.get(
  "/admin/billing/stats",
  authGuard,
  permissionGuard("admin"),
  async (_req: Request, res: Response) => {
    try {
      const now = new Date();
      const plans = await getPlans();

      // Effective plan: a paid tier counts only while unexpired, else it's free.
      const grouped = await UserModel.aggregate<{ _id: PlanTier; count: number }>([
        {
          $addFields: {
            effPlan: {
              $cond: [
                {
                  $and: [
                    { $in: ["$plan", ["plus", "pro"]] },
                    {
                      $or: [
                        { $eq: ["$planExpiresAt", null] },
                        { $not: ["$planExpiresAt"] },
                        { $gt: ["$planExpiresAt", now] },
                      ],
                    },
                  ],
                },
                "$plan",
                "free",
              ],
            },
          },
        },
        { $group: { _id: "$effPlan", count: { $sum: 1 } } },
      ]).exec();

      const planCounts: Record<PlanTier, number> = { free: 0, plus: 0, pro: 0 };
      for (const row of grouped) {
        if (row._id in planCounts) planCounts[row._id] = row.count;
      }

      const totalUsers = planCounts.free + planCounts.plus + planCounts.pro;
      const paidUsers = planCounts.plus + planCounts.pro;
      const mrr =
        planCounts.plus * (plans.plus.priceMonthly ?? 0) +
        planCounts.pro * (plans.pro.priceMonthly ?? 0);

      // Today's metered activity across all owners.
      const [usage] = await UsageMeterModel.aggregate<{
        messages: number;
        images: number;
        beats: number;
      }>([
        { $match: { dayKey: dayKey() } },
        {
          $group: {
            _id: null,
            messages: { $sum: "$messages" },
            images: { $sum: "$images" },
            beats: { $sum: "$beats" },
          },
        },
      ]).exec();

      const recent = await UserModel.find({ plan: { $in: ["plus", "pro"] } })
        .sort({ updatedAt: -1 })
        .limit(8)
        .select("name email plan planExpiresAt updatedAt")
        .lean()
        .exec();

      return res.json({
        success: true,
        data: {
          mrr,
          currency: "USD",
          totalUsers,
          paidUsers,
          conversionRate: totalUsers ? paidUsers / totalUsers : 0,
          planCounts,
          plans,
          usageToday: {
            messages: usage?.messages ?? 0,
            images: usage?.images ?? 0,
            beats: usage?.beats ?? 0,
          },
          recentUpgrades: recent.map((u) => ({
            name: u.name,
            email: u.email,
            plan: u.plan,
            planExpiresAt: u.planExpiresAt ? new Date(u.planExpiresAt).toISOString() : null,
            updatedAt: new Date(u.updatedAt).toISOString(),
          })),
        },
      });
    } catch (error) {
      logger.error("GET /admin/billing/stats failed", error);
      return res
        .status(500)
        .json({ success: false, message: error instanceof Error ? error.message : "Failed to load stats" });
    }
  },
);

export default router;
