"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { createTender, createTenderSchema, NotAuthorizedError } from "@/lib/tenders/create";

export interface CreateTenderFormState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export async function createTenderAction(
  _prev: CreateTenderFormState,
  formData: FormData,
): Promise<CreateTenderFormState> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const parsed = createTenderSchema.safeParse({
    category: formData.get("category"),
    visibility: formData.get("visibility") ?? undefined,
    spec: {
      capacity: formData.get("capacity"),
      complianceStandard: formData.get("complianceStandard"),
      timeline: formData.get("timeline"),
    },
  });
  if (!parsed.success) {
    // Flatten nested spec errors onto their field names for the form.
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path.at(-1) ?? "form");
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { fieldErrors };
  }

  try {
    await createTender(session.user.id, parsed.data);
  } catch (err) {
    if (err instanceof NotAuthorizedError) return { error: err.message };
    if (err instanceof z.ZodError) return { error: "Invalid tender details" };
    throw err;
  }

  redirect("/dashboard");
}
