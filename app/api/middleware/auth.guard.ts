/**
 * Auth middleware.
 *
 *  - attachOptionalUser: reads the session cookie, loads the user if valid, and
 *    populates req.user / res.locals.userId. Never blocks. Mounted globally on
 *    /api so downstream code (e.g. chat ownerId resolution) sees the user.
 *  - authGuard: 401s unless a user is attached.
 *  - permissionGuard(...roles): 403s unless the user holds one of the roles.
 */

import type { NextFunction, Request, Response } from "express";
import { effectivePlan, UserModel, type PlanTier, type UserRole } from "../models/user.model";
import { parseCookies, SESSION_COOKIE } from "../lib/cookies";
import { verifySession } from "../lib/session";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  plan: PlanTier;
}

export type AuthedRequest = Request & { user?: AuthUser };

export async function attachOptionalUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    const session = verifySession(token);
    if (session) {
      const user = await UserModel.findById(session.uid).lean().exec();
      if (user) {
        const authUser: AuthUser = {
          id: String(user._id),
          email: user.email,
          name: user.name,
          roles: (user.roles ?? ["user"]) as UserRole[],
          plan: effectivePlan(user),
        };
        (req as AuthedRequest).user = authUser;
        res.locals.userId = authUser.id;
      }
    }
  } catch {
    // Optional auth never blocks the request.
  }
  next();
}

export function authGuard(req: Request, res: Response, next: NextFunction): void {
  if (!(req as AuthedRequest).user) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }
  next();
}

export function permissionGuard(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    if (roles.length && !roles.some((r) => user.roles?.includes(r))) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }
    next();
  };
}

const PLAN_RANK: Record<PlanTier, number> = { free: 0, plus: 1, pro: 2 };

/**
 * Gate a route on a minimum subscription tier. 401 if unauthenticated, 402
 * (Payment Required) with `upgradeRequired` if the user's effective plan ranks
 * below `minPlan`. Admins bypass the tier check.
 */
export function planGuard(minPlan: PlanTier) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    if (user.roles?.includes("admin")) return next();
    if (PLAN_RANK[user.plan ?? "free"] < PLAN_RANK[minPlan]) {
      res.status(402).json({
        success: false,
        message: `This feature requires the ${minPlan} plan`,
        upgradeRequired: true,
        requiredPlan: minPlan,
        currentPlan: user.plan ?? "free",
      });
      return;
    }
    next();
  };
}
