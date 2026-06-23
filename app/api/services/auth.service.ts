/**
 * Auth service — registration, login, and lookup.
 */

import { createLogger } from "~/lib/logger";
import { UserModel, toUserView, type UserView } from "../models/user.model";
import { hashPassword, verifyPassword } from "../lib/password";

const logger = createLogger("AuthService");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
}): Promise<UserView> {
  const email = normalizeEmail(input.email ?? "");
  const name = (input.name ?? "").trim();
  const password = input.password ?? "";

  if (!EMAIL_RE.test(email)) throw new AuthError("A valid email is required");
  if (!name) throw new AuthError("Name is required");
  if (password.length < MIN_PASSWORD) {
    throw new AuthError(`Password must be at least ${MIN_PASSWORD} characters`);
  }

  const existing = await UserModel.findOne({ email }).exec();
  if (existing) throw new AuthError("An account with this email already exists", 409);

  const passwordHash = await hashPassword(password);
  const user = await UserModel.create({ email, name, passwordHash, roles: ["user"] });
  logger.info(`Registered user ${email}`);
  return toUserView(user);
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<UserView> {
  const email = normalizeEmail(input.email ?? "");
  const password = input.password ?? "";

  const user = await UserModel.findOne({ email }).exec();
  // Run a verify even when the user is missing to blunt timing/enumeration.
  const ok = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, "scrypt$00$00").then(() => false);

  if (!user || !ok) throw new AuthError("Invalid email or password", 401);
  return toUserView(user);
}

export async function getUserById(id: string): Promise<UserView | null> {
  const user = await UserModel.findById(id).exec();
  return user ? toUserView(user) : null;
}
