/**
 * Auth API — mounted explicitly under /api by app/api/routes.ts.
 *
 *   POST /api/auth/register  — { email, password, name } create account + sign in.
 *   POST /api/auth/login     — { email, password } sign in.
 *   POST /api/auth/logout    — clear the session cookie.
 *   GET  /api/auth/me        — current user (null when signed out).
 */

import { Router, type Request, type Response } from "express";
import { createLogger } from "~/lib/logger";
import {
  AuthError,
  loginUser,
  registerUser,
} from "../services/auth.service";
import { signSession } from "../lib/session";
import { buildSessionCookie, clearSessionCookie } from "../lib/cookies";
import { SESSION_TTL_SECONDS } from "../lib/session";
import type { AuthedRequest } from "../middleware/auth.guard";

const logger = createLogger("AuthRoutes");
const router = Router();

function fail(res: Response, status: number, message: string) {
  return res.status(status).json({ success: false, message });
}

router.post("/auth/register", async (req: Request, res: Response) => {
  const { email, password, name } = req.body ?? {};
  try {
    const user = await registerUser({ email, password, name });
    res.setHeader("Set-Cookie", buildSessionCookie(signSession(user.id), SESSION_TTL_SECONDS));
    return res.json({ success: true, data: user });
  } catch (error) {
    if (error instanceof AuthError) return fail(res, error.status, error.message);
    logger.error("POST /auth/register failed", error);
    return fail(res, 500, "Registration failed");
  }
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  try {
    const user = await loginUser({ email, password });
    res.setHeader("Set-Cookie", buildSessionCookie(signSession(user.id), SESSION_TTL_SECONDS));
    return res.json({ success: true, data: user });
  } catch (error) {
    if (error instanceof AuthError) return fail(res, error.status, error.message);
    logger.error("POST /auth/login failed", error);
    return fail(res, 500, "Login failed");
  }
});

router.post("/auth/logout", async (_req: Request, res: Response) => {
  res.setHeader("Set-Cookie", clearSessionCookie());
  return res.json({ success: true, data: { ok: true } });
});

router.get("/auth/me", async (req: Request, res: Response) => {
  // attachOptionalUser (mounted globally) has already populated req.user.
  const user = (req as AuthedRequest).user ?? null;
  return res.json({ success: true, data: user });
});

export default router;
