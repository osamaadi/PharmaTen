import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { signUp } from "@/lib/auth/signup";
import {
  createTender,
  type CreateTenderInput,
  NotAuthorizedError,
} from "@/lib/tenders/create";
import { manufacturerSignup, supplierSignup } from "./helpers";

function tenderInput(overrides: Partial<CreateTenderInput> = {}): CreateTenderInput {
  return {
    category: "TABLET_PRESS",
    spec: {
      capacity: "50,000 tablets/hour",
      complianceStandard: "EU_GMP",
      timeline: "Delivery and installation within 6 months",
    },
    ...overrides,
  };
}

describe("createTender", () => {
  it("creates a tender with version 1 as the current version", async () => {
    const user = await signUp(manufacturerSignup());
    const tender = await createTender(user.id, tenderInput());

    expect(tender.companyId).toBe(user.companyId);
    expect(tender.category).toBe("TABLET_PRESS");
    expect(tender.status).toBe("OPEN");
    expect(tender.visibility).toBe("OPEN");

    expect(tender.currentVersion).not.toBeNull();
    expect(tender.currentVersion!.versionNumber).toBe(1);
    expect(tender.currentVersion!.reason).toBeNull();
    expect(tender.currentVersion!.createdById).toBe(user.id);
    expect(tender.currentVersion!.specJson).toEqual({
      capacity: "50,000 tablets/hour",
      complianceStandard: "EU_GMP",
      timeline: "Delivery and installation within 6 months",
    });

    const versions = await prisma.tenderVersion.findMany({
      where: { tenderId: tender.id },
    });
    expect(versions).toHaveLength(1);
  });

  it("supports invite-only visibility", async () => {
    const user = await signUp(manufacturerSignup());
    const tender = await createTender(
      user.id,
      tenderInput({ visibility: "INVITE_ONLY" }),
    );
    expect(tender.visibility).toBe("INVITE_ONLY");
  });

  it("writes audit entries for tender and version, attributed to the actor", async () => {
    const user = await signUp(manufacturerSignup());
    const tender = await createTender(user.id, tenderInput());

    const tenderEntry = await prisma.auditLogEntry.findFirstOrThrow({
      where: { entityType: "Tender", entityId: tender.id },
    });
    expect(tenderEntry.action).toBe("tender.created");
    expect(tenderEntry.actorId).toBe(user.id);
    expect(tenderEntry.newValue).toMatchObject({
      category: "TABLET_PRESS",
      status: "OPEN",
    });

    const versionEntry = await prisma.auditLogEntry.findFirstOrThrow({
      where: {
        entityType: "TenderVersion",
        entityId: tender.currentVersionId!,
      },
    });
    expect(versionEntry.action).toBe("tender_version.created");
    expect(versionEntry.actorId).toBe(user.id);
    expect(versionEntry.newValue).toMatchObject({ versionNumber: 1 });
  });

  it("rejects suppliers (RBAC at the API layer, not just UI)", async () => {
    const supplier = await signUp(supplierSignup());
    await expect(createTender(supplier.id, tenderInput())).rejects.toThrow(
      NotAuthorizedError,
    );
    await expect(
      prisma.tender.count({ where: { companyId: supplier.companyId } }),
    ).resolves.toBe(0);
  });

  it("rejects unknown users", async () => {
    await expect(createTender("no-such-user", tenderInput())).rejects.toThrow(
      NotAuthorizedError,
    );
  });

  it("rejects a spec with missing required fields", async () => {
    const user = await signUp(manufacturerSignup());
    await expect(
      createTender(
        user.id,
        tenderInput({
          spec: {
            capacity: "",
            complianceStandard: "EU_GMP",
            timeline: "6 months",
          },
        }),
      ),
    ).rejects.toThrow(ZodError);
  });

  it("rejects an invalid compliance standard", async () => {
    const user = await signUp(manufacturerSignup());
    await expect(
      createTender(
        user.id,
        tenderInput({
          spec: {
            capacity: "10,000 capsules/hour",
            complianceStandard: "ISO9001" as never,
            timeline: "6 months",
          },
        }),
      ),
    ).rejects.toThrow(ZodError);
  });

  it("does not leave partial rows when the transaction fails", async () => {
    const user = await signUp(manufacturerSignup());
    const before = {
      tenders: await prisma.tender.count(),
      versions: await prisma.tenderVersion.count(),
    };

    // Force a failure inside validation before any row is written.
    await expect(
      createTender(user.id, tenderInput({ category: "SPACESHIP" as never })),
    ).rejects.toThrow(ZodError);

    expect(await prisma.tender.count()).toBe(before.tenders);
    expect(await prisma.tenderVersion.count()).toBe(before.versions);
  });
});
