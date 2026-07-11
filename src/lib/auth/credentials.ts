import bcrypt from "bcryptjs";
import type { User } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Email/password check used by the Auth.js credentials provider. Returns the
// user on success, null on any failure — deliberately the same result for
// "unknown email" and "wrong password" so responses don't reveal which
// emails are registered.
export async function verifyCredentials(
  email: unknown,
  password: unknown,
): Promise<User | null> {
  if (typeof email !== "string" || typeof password !== "string") return null;

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}
