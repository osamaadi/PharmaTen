"use server";

import { z } from "zod";
import { signIn } from "@/auth";
import { DuplicateEmailError, signUp, signupSchema } from "@/lib/auth/signup";

export interface SignupFormState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export async function signupAction(
  _prev: SignupFormState,
  formData: FormData,
): Promise<SignupFormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    companyName: formData.get("companyName"),
    country: formData.get("country"),
    categories: formData.getAll("categories"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    await signUp(parsed.data);
  } catch (err) {
    if (err instanceof DuplicateEmailError) return { error: err.message };
    throw err;
  }

  // Sign the new user in; throws a framework redirect on success.
  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/dashboard",
  });
  return {};
}
