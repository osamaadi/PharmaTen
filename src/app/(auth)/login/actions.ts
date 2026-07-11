"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export interface LoginFormState {
  error?: string;
}

export async function loginAction(
  _prev: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (err) {
    // Same message for unknown email and wrong password (no user enumeration).
    if (err instanceof AuthError) return { error: "Invalid email or password" };
    throw err; // NEXT_REDIRECT on success, rethrown for Next to handle
  }
  return {};
}
