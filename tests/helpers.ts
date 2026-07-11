import { randomUUID } from "node:crypto";
import type { SignupInput } from "@/lib/auth/signup";

export function uniqueEmail(prefix = "user") {
  return `${prefix}-${randomUUID()}@example.com`;
}

export function manufacturerSignup(
  overrides: Partial<SignupInput> = {},
): SignupInput {
  return {
    name: "Amal Haddad",
    email: uniqueEmail("manufacturer"),
    password: "correct-horse-battery",
    role: "MANUFACTURER",
    companyName: "Amman Pharma Industries",
    country: "Jordan",
    ...overrides,
  };
}

export function supplierSignup(overrides: Partial<SignupInput> = {}): SignupInput {
  return {
    name: "Wei Chen",
    email: uniqueEmail("supplier"),
    password: "correct-horse-battery",
    role: "SUPPLIER",
    companyName: "Shanghai Equipment Co",
    country: "China",
    categories: ["TABLET_PRESS", "GRANULATION_EQUIPMENT"],
    ...overrides,
  };
}
