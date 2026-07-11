import type { Prisma } from "@/generated/prisma/client";
import type { PrismaClientOrTx } from "@/lib/prisma";

// Immutable audit trail (PRD Sections 8 & 10). Every create/update use case
// must call writeAuditLog INSIDE the same transaction as the change itself,
// so a change can never be committed without its audit entry (and vice
// versa). The audit_log_entries table is append-only at the DB layer — a
// Postgres trigger rejects UPDATE/DELETE (see the audit_log_append_only
// migration).

// Column types are strings in the DB so new entities never need a migration;
// these unions keep application code honest. Extend them as entities are
// added (Bid, CertificateRecord, ...).
export type AuditEntityType =
  | "User"
  | "Company"
  | "Tender"
  | "TenderVersion";

export type AuditAction =
  | "user.signed_up"
  | "company.created"
  | "tender.created"
  | "tender_version.created";

export interface AuditEvent {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  // Attributable (ALCOA+): the acting user. Null only for system actions
  // with no user context (e.g. signup, where the user doesn't exist yet at
  // the start of the transaction — we still set it to the created user).
  actorId: string | null;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
}

export async function writeAuditLog(
  db: PrismaClientOrTx,
  event: AuditEvent | AuditEvent[],
): Promise<void> {
  const events = Array.isArray(event) ? event : [event];
  await db.auditLogEntry.createMany({
    data: events.map((e) => ({
      entityType: e.entityType,
      entityId: e.entityId,
      action: e.action,
      actorId: e.actorId,
      oldValue: e.oldValue,
      newValue: e.newValue,
    })),
  });
}
