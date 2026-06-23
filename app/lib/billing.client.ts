/**
 * Client-side helpers for billing (/api/billing/*). Cookies ride along via
 * api.client's `withCredentials: true`.
 */

import { apiGet, apiRequest } from "~/lib/api.client";

export type PlanTier = "free" | "plus" | "pro";

export interface PlanLimits {
  label: string;
  priceMonthly: number;
  dailyMessages: number;
  dailyImages: number;
  maxCompanions: number;
  offlinePings: boolean;
  characterAvatars: boolean;
  memoryDepth: number;
  maxPacing: "slow" | "moderate" | "active";
  storyMode: "read" | "full";
  premiumModel: boolean;
}

export interface BillingState {
  plan: PlanTier;
  plans: Record<PlanTier, PlanLimits>;
  usage: { messages: number; images: number; beats: number };
  billingMode: "live" | "mock";
}

/** Thrown when the backend gates an action behind a paid plan (HTTP 402, upgradeRequired). */
export class UpgradeRequiredError extends Error {
  readonly requiredPlan: string;
  constructor(message: string, requiredPlan: string) {
    super(message);
    this.name = "UpgradeRequiredError";
    this.requiredPlan = requiredPlan;
  }
}

/** Throw UpgradeRequiredError if an API response body carries `upgradeRequired`. */
export function checkUpgrade(res: {
  upgradeRequired?: boolean;
  requiredPlan?: string;
  message?: string;
}) {
  if (res.upgradeRequired) {
    throw new UpgradeRequiredError(res.message ?? "Upgrade to continue", res.requiredPlan ?? "plus");
  }
}

function unwrap<T>(res: { success: boolean; data?: T; message?: string }): T {
  if (!res.success) throw new Error(res.message ?? "Request failed");
  return res.data as T;
}

export async function fetchBilling(): Promise<BillingState> {
  return unwrap(await apiGet<BillingState>("/api/billing/plan"));
}

export interface CheckoutResult {
  mock: boolean;
  plan: PlanTier;
  redirectUrl: string;
  planExpiresAt: string | null;
}

export async function startCheckout(plan: "plus" | "pro"): Promise<CheckoutResult> {
  return unwrap(
    await apiRequest<CheckoutResult>("/api/billing/checkout", { method: "POST", data: { plan } }),
  );
}

export async function confirmCheckout(
  sessionId: string,
): Promise<{ plan: PlanTier; planExpiresAt: string }> {
  return unwrap(
    await apiRequest("/api/billing/confirm", { method: "POST", data: { sessionId } }),
  );
}

export async function cancelPlan(): Promise<void> {
  const res = await apiRequest("/api/billing/cancel", { method: "POST" });
  if (!res.success) throw new Error(res.message ?? "Cancel failed");
}

export interface AdminBillingStats {
  mrr: number;
  currency: string;
  totalUsers: number;
  paidUsers: number;
  conversionRate: number;
  planCounts: Record<PlanTier, number>;
  plans: Record<PlanTier, PlanLimits>;
  usageToday: { messages: number; images: number; beats: number };
  recentUpgrades: Array<{
    name: string;
    email: string;
    plan: PlanTier;
    planExpiresAt: string | null;
    updatedAt: string;
  }>;
}

export async function fetchAdminBillingStats(): Promise<AdminBillingStats> {
  return unwrap(await apiGet<AdminBillingStats>("/api/admin/billing/stats"));
}
