import mongoose, { type Document, type Model, Schema } from "mongoose";

/**
 * Application user. Auth is email + scrypt password hash. `roles` backs the
 * permissionGuard (default ["user"]; grant "admin" for elevated access).
 */

export type UserRole = "user" | "admin";

/**
 * Subscription tier. `free` is the default for every registered user; `plus`
 * and `pro` are granted by the billing flow (or, when STRIPE_SECRET_KEY is
 * absent, by the mock checkout). Tier limits themselves live in the
 * configurables `plans` object so the owner can tune them without a redeploy.
 */
export type PlanTier = "free" | "plus" | "pro";

export interface User extends Document {
  email: string;
  name: string;
  passwordHash: string;
  roles: UserRole[];
  plan: PlanTier;
  /** When the paid plan lapses. Null/unset = no expiry (free or manual grant). */
  planExpiresAt?: Date | null;
  /** Stripe customer id once a real checkout has run (unused in mock mode). */
  stripeCustomerId?: string | null;
  /** Active Stripe subscription id, for cancel/lifecycle (unused in mock mode). */
  stripeSubscriptionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<User>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    roles: { type: [String], default: ["user"] },
    plan: { type: String, enum: ["free", "plus", "pro"], default: "free", index: true },
    planExpiresAt: { type: Date, default: null },
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
  },
  { timestamps: true },
);

export const UserModel: Model<User> =
  (mongoose.models.DriftoriaUser as Model<User>) ||
  mongoose.model<User>("DriftoriaUser", UserSchema);

/**
 * The plan a user is actually entitled to right now: their stored tier, unless
 * a paid plan has lapsed (planExpiresAt in the past), in which case they fall
 * back to `free`. Use this everywhere instead of reading `user.plan` raw.
 */
export function effectivePlan(
  user: Pick<User, "plan" | "planExpiresAt">,
  now: Date = new Date(),
): PlanTier {
  const plan = user.plan ?? "free";
  if (plan === "free") return "free";
  if (user.planExpiresAt && new Date(user.planExpiresAt).getTime() < now.getTime()) {
    return "free";
  }
  return plan;
}

export interface UserView {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  plan: PlanTier;
  planExpiresAt: string | null;
}

export function toUserView(user: User): UserView {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    roles: (user.roles ?? ["user"]) as UserRole[],
    plan: effectivePlan(user),
    planExpiresAt: user.planExpiresAt ? new Date(user.planExpiresAt).toISOString() : null,
  };
}
