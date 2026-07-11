import bcrypt from "bcryptjs";
import { z } from "zod";
import { CompanyType, UserRole } from "@/generated/prisma/enums";
import { EquipmentCategory } from "@/generated/prisma/enums";
import type { User } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

// Signup (PRD 6.1 step 1 / 6.2 step 1): account + company details. Both the
// user and the company start with verification_status = PENDING; approval
// happens in the admin verification queue (later phase). Verification
// document upload also arrives with that phase.

// Public signup only offers the two marketplace roles — ADMIN accounts are
// provisioned out-of-band, never via this form.
export const signupRoles = [UserRole.MANUFACTURER, UserRole.SUPPLIER] as const;

export const signupSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    email: z.email("Enter a valid email address").trim().toLowerCase(),
    password: z.string().min(8, "Password must be at least 8 characters").max(200),
    role: z.enum(signupRoles, { error: "Choose Manufacturer or Supplier" }),
    companyName: z.string().trim().min(1, "Company name is required").max(200),
    country: z.string().trim().min(1, "Country is required").max(100),
    // Supplier category specializations (PRD 6.2 step 1).
    categories: z.array(z.enum(EquipmentCategory)).default([]),
  })
  .check((ctx) => {
    if (ctx.value.role === UserRole.SUPPLIER && ctx.value.categories.length === 0) {
      ctx.issues.push({
        code: "custom",
        message: "Select at least one equipment category",
        path: ["categories"],
        input: ctx.value.categories,
      });
    }
  });

export type SignupInput = z.input<typeof signupSchema>;

export class DuplicateEmailError extends Error {
  constructor() {
    super("An account with this email already exists");
    this.name = "DuplicateEmailError";
  }
}

export async function signUp(input: SignupInput): Promise<User> {
  const data = signupSchema.parse(input);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new DuplicateEmailError();

  const passwordHash = await bcrypt.hash(data.password, 10);

  const companyType =
    data.role === UserRole.MANUFACTURER
      ? CompanyType.MANUFACTURER
      : CompanyType.SUPPLIER;

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: data.companyName,
        type: companyType,
        country: data.country,
        categories: data.role === UserRole.SUPPLIER ? data.categories : [],
      },
    });

    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        companyId: company.id,
      },
    });

    await writeAuditLog(tx, [
      {
        entityType: "Company",
        entityId: company.id,
        action: "company.created",
        actorId: user.id,
        newValue: {
          name: company.name,
          type: company.type,
          country: company.country,
          categories: company.categories,
          verificationStatus: company.verificationStatus,
        },
      },
      {
        entityType: "User",
        entityId: user.id,
        action: "user.signed_up",
        actorId: user.id,
        // Never log credentials — password hashes stay out of the audit trail.
        newValue: {
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          verificationStatus: user.verificationStatus,
        },
      },
    ]);

    return user;
  });
}
