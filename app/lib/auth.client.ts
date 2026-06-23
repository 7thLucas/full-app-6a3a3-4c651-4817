/**
 * Client-side helpers for auth (/api/auth/*). Cookies ride along automatically
 * via api.client's `withCredentials: true`.
 */

import { apiGet, apiRequest } from "~/lib/api.client";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  plan?: "free" | "plus" | "pro";
  planExpiresAt?: string | null;
}

function unwrap<T>(res: { success: boolean; data?: T; message?: string }): T {
  if (!res.success) throw new Error(res.message ?? "Request failed");
  return res.data as T;
}

export async function register(input: {
  email: string;
  password: string;
  name: string;
}): Promise<AuthUser> {
  return unwrap(
    await apiRequest<AuthUser>("/api/auth/register", { method: "POST", data: input }),
  );
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  return unwrap(
    await apiRequest<AuthUser>("/api/auth/login", { method: "POST", data: input }),
  );
}

export async function logout(): Promise<void> {
  await apiRequest("/api/auth/logout", { method: "POST" });
}

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await apiGet<AuthUser | null>("/api/auth/me");
  return res.success ? (res.data ?? null) : null;
}
