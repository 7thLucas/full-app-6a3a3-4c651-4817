/**
 * Usage & entitlement service — the bridge between the configurables `plans`
 * limits, a user's effective tier, and the daily UsageMeter counters.
 *
 * Phase 1 wires metering (record + read) and entitlement resolution. Hard
 * blocking at every cost point (messages/images/companions/pacing) layers on in
 * the next phase via `withinLimit` + the structured QuotaError below.
 */

import { ConfigurablesService } from "~/modules/configurables/src/services/configurables.service";
import {
  defaultConfigurablesData,
  type TPlanLimits,
  type TPlans,
} from "~/modules/configurables/src/constants/configurables.default";
import { effectivePlan, UserModel, type PlanTier } from "../models/user.model";
import { UsageMeterModel, type UsageLever } from "../models/usage-meter.model";

/** Mongo ObjectId hex string — distinguishes a real user from an `anon_*` guest. */
const OBJECT_ID = /^[a-f0-9]{24}$/i;

export interface QuotaErrorDetail {
  lever: UsageLever | "companions";
  plan: PlanTier;
  limit: number;
  used: number;
}

/** Thrown when a metered action would exceed the owner's plan limit. */
export class QuotaError extends Error {
  readonly detail: QuotaErrorDetail;
  constructor(detail: QuotaErrorDetail) {
    super(`Quota exceeded for ${detail.lever} on the ${detail.plan} plan`);
    this.name = "QuotaError";
    this.detail = detail;
  }
}

function dayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** The tier one step up from `plan` (the upgrade that lifts the limit). */
export function nextPlanUp(plan: PlanTier): PlanTier {
  return plan === "free" ? "plus" : "pro";
}

/** Structured 402 body for a hit quota, shared by chat + story routes. */
export function quotaBody(err: QuotaError) {
  return {
    success: false as const,
    message: err.message,
    upgradeRequired: true as const,
    lever: err.detail.lever,
    limit: err.detail.limit,
    used: err.detail.used,
    currentPlan: err.detail.plan,
    requiredPlan: nextPlanUp(err.detail.plan),
  };
}

async function getPlans(): Promise<TPlans> {
  const data = (await ConfigurablesService.getData()) as Partial<{ plans: TPlans }>;
  return data.plans ?? defaultConfigurablesData.plans;
}

/**
 * Resolve the tier an owner is entitled to. Guests (`anon_*` / cookie ids) are
 * always free; registered users get their stored plan, downgraded to free if
 * the subscription has lapsed (see `effectivePlan`).
 */
export async function resolvePlan(ownerId: string): Promise<PlanTier> {
  if (!OBJECT_ID.test(ownerId)) return "free";
  const user = await UserModel.findById(ownerId).select("plan planExpiresAt").lean().exec();
  if (!user) return "free";
  return effectivePlan(user);
}

/** The concrete limits an owner is operating under right now. */
export async function getLimitsFor(ownerId: string): Promise<{ plan: PlanTier; limits: TPlanLimits }> {
  const [plan, plans] = await Promise.all([resolvePlan(ownerId), getPlans()]);
  return { plan, limits: plans[plan] };
}

/** Today's counters for an owner (zeroes if nothing recorded yet). */
export async function getUsageToday(
  ownerId: string,
): Promise<{ messages: number; images: number; beats: number }> {
  const doc = await UsageMeterModel.findOne({ ownerId, dayKey: dayKey() }).lean().exec();
  return {
    messages: doc?.messages ?? 0,
    images: doc?.images ?? 0,
    beats: doc?.beats ?? 0,
  };
}

/** `true` if `used` is still under `limit`; a limit of -1 means unlimited. */
export function withinLimit(used: number, limit: number): boolean {
  return limit < 0 || used < limit;
}

/** Record `amount` units of a metered action for today (atomic upsert). */
export async function recordUsage(
  ownerId: string,
  lever: UsageLever,
  amount = 1,
): Promise<void> {
  await UsageMeterModel.updateOne(
    { ownerId, dayKey: dayKey() },
    { $inc: { [lever]: amount } },
    { upsert: true },
  ).exec();
}
