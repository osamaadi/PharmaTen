import { z } from "zod";
import { EquipmentCategory, TenderVisibility, UserRole } from "@/generated/prisma/enums";
import type { Tender, TenderVersion } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { tenderSpecSchema } from "@/lib/tender-spec";

// Tender creation (PRD 6.1 step 2, Spec Wizard MVP subset). Creates the
// Tender and TenderVersion v1 in one transaction and points
// currentVersionId at v1. Amendments (PRD Section 7) will append v2, v3, …

export const createTenderSchema = z.object({
  category: z.enum(EquipmentCategory, { error: "Select an equipment category" }),
  visibility: z.enum(TenderVisibility).default("OPEN"),
  spec: tenderSpecSchema,
});

export type CreateTenderInput = z.input<typeof createTenderSchema>;

export class NotAuthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotAuthorizedError";
  }
}

export async function createTender(
  actorUserId: string,
  input: CreateTenderInput,
): Promise<Tender & { currentVersion: TenderVersion | null }> {
  const data = createTenderSchema.parse(input);

  // RBAC at the API layer (PRD Section 10): re-read the actor from the DB
  // rather than trusting session claims.
  const actor = await prisma.user.findUnique({ where: { id: actorUserId } });
  if (!actor) throw new NotAuthorizedError("Unknown user");
  if (actor.role !== UserRole.MANUFACTURER) {
    throw new NotAuthorizedError("Only manufacturers can create tenders");
  }

  return prisma.$transaction(async (tx) => {
    const tender = await tx.tender.create({
      data: {
        companyId: actor.companyId,
        category: data.category,
        visibility: data.visibility,
      },
    });

    const version = await tx.tenderVersion.create({
      data: {
        tenderId: tender.id,
        versionNumber: 1,
        specJson: data.spec,
        reason: null, // reasons apply to amendments, not initial creation
        createdById: actor.id,
      },
    });

    const updated = await tx.tender.update({
      where: { id: tender.id },
      data: { currentVersionId: version.id },
      include: { currentVersion: true },
    });

    await writeAuditLog(tx, [
      {
        entityType: "Tender",
        entityId: tender.id,
        action: "tender.created",
        actorId: actor.id,
        newValue: {
          companyId: tender.companyId,
          category: tender.category,
          status: tender.status,
          visibility: tender.visibility,
          currentVersionId: version.id,
        },
      },
      {
        entityType: "TenderVersion",
        entityId: version.id,
        action: "tender_version.created",
        actorId: actor.id,
        newValue: {
          tenderId: tender.id,
          versionNumber: 1,
          spec: data.spec,
        },
      },
    ]);

    return updated;
  });
}
