import mongoose, { type Document, type Model, Schema } from "mongoose";

/**
 * Application user. Auth is email + scrypt password hash. `roles` backs the
 * permissionGuard (default ["user"]; grant "admin" for elevated access).
 */

export type UserRole = "user" | "admin";

export interface User extends Document {
  email: string;
  name: string;
  passwordHash: string;
  roles: UserRole[];
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
  },
  { timestamps: true },
);

export const UserModel: Model<User> =
  (mongoose.models.DriftoriaUser as Model<User>) ||
  mongoose.model<User>("DriftoriaUser", UserSchema);

export interface UserView {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
}

export function toUserView(user: User): UserView {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    roles: (user.roles ?? ["user"]) as UserRole[],
  };
}
