import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { DuplicateEmailError, signUp } from "@/lib/auth/signup";
import { verifyCredentials } from "@/lib/auth/credentials";
import { manufacturerSignup, supplierSignup } from "./helpers";

describe("signUp", () => {
  it("creates a manufacturer user and company, both pending verification", async () => {
    const input = manufacturerSignup();
    const user = await signUp(input);

    expect(user.role).toBe("MANUFACTURER");
    expect(user.verificationStatus).toBe("PENDING");
    expect(user.email).toBe(input.email);

    const company = await prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
    });
    expect(company.type).toBe("MANUFACTURER");
    expect(company.name).toBe(input.companyName);
    expect(company.country).toBe("Jordan");
    expect(company.verificationStatus).toBe("PENDING");
    expect(company.categories).toEqual([]);
  });

  it("creates a supplier with category specializations", async () => {
    const user = await signUp(supplierSignup());

    expect(user.role).toBe("SUPPLIER");
    const company = await prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
    });
    expect(company.type).toBe("SUPPLIER");
    expect(company.categories).toEqual(["TABLET_PRESS", "GRANULATION_EQUIPMENT"]);
  });

  it("stores a bcrypt hash, never the plaintext password", async () => {
    const input = manufacturerSignup();
    const user = await signUp(input);

    expect(user.passwordHash).not.toBe(input.password);
    expect(user.passwordHash).not.toContain(input.password);
    await expect(bcrypt.compare(input.password, user.passwordHash)).resolves.toBe(
      true,
    );
  });

  it("normalizes email to lowercase", async () => {
    const email = `Upper-${Date.now()}@Example.COM`;
    const user = await signUp(manufacturerSignup({ email }));
    expect(user.email).toBe(email.toLowerCase());
  });

  it("writes audit log entries for user and company in the same transaction", async () => {
    const user = await signUp(manufacturerSignup());

    const entries = await prisma.auditLogEntry.findMany({
      where: { actorId: user.id },
      orderBy: { action: "asc" },
    });
    expect(entries.map((e) => e.action)).toEqual([
      "company.created",
      "user.signed_up",
    ]);

    const companyEntry = entries[0];
    expect(companyEntry.entityType).toBe("Company");
    expect(companyEntry.entityId).toBe(user.companyId);
    expect(companyEntry.newValue).toMatchObject({ verificationStatus: "PENDING" });

    const userEntry = entries[1];
    expect(userEntry.entityType).toBe("User");
    expect(userEntry.entityId).toBe(user.id);
    // Credentials must never reach the audit trail.
    expect(JSON.stringify(userEntry.newValue)).not.toContain("password");
  });

  it("rejects duplicate emails without creating an orphan company", async () => {
    const input = manufacturerSignup();
    await signUp(input);

    const companiesBefore = await prisma.company.count();
    await expect(signUp(manufacturerSignup({ email: input.email }))).rejects.toThrow(
      DuplicateEmailError,
    );
    await expect(prisma.company.count()).resolves.toBe(companiesBefore);
  });

  it("rejects passwords shorter than 8 characters", async () => {
    await expect(signUp(manufacturerSignup({ password: "short" }))).rejects.toThrow(
      ZodError,
    );
  });

  it("rejects a supplier signup without category specializations", async () => {
    await expect(signUp(supplierSignup({ categories: [] }))).rejects.toThrow(
      ZodError,
    );
  });

  it("rejects an admin role at signup", async () => {
    await expect(
      signUp(manufacturerSignup({ role: "ADMIN" as never })),
    ).rejects.toThrow(ZodError);
  });
});

describe("verifyCredentials", () => {
  it("returns the user for a correct email/password pair", async () => {
    const input = manufacturerSignup();
    const created = await signUp(input);

    const user = await verifyCredentials(input.email, input.password);
    expect(user?.id).toBe(created.id);
  });

  it("matches email case-insensitively", async () => {
    const input = manufacturerSignup();
    const created = await signUp(input);

    const user = await verifyCredentials(input.email.toUpperCase(), input.password);
    expect(user?.id).toBe(created.id);
  });

  it("returns null for a wrong password", async () => {
    const input = manufacturerSignup();
    await signUp(input);

    await expect(verifyCredentials(input.email, "wrong-password")).resolves.toBeNull();
  });

  it("returns null for an unknown email", async () => {
    await expect(
      verifyCredentials("nobody@example.com", "whatever-password"),
    ).resolves.toBeNull();
  });

  it("returns null for malformed credential types", async () => {
    await expect(verifyCredentials(undefined, undefined)).resolves.toBeNull();
    await expect(verifyCredentials({ evil: true }, "pw")).resolves.toBeNull();
  });
});
