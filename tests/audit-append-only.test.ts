import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

// PRD Section 10: audit log entries are append-only — no deletion, no
// in-place edits. Enforced by Postgres triggers, verified here against the
// real database.
describe("audit log append-only enforcement", () => {
  async function insertEntry() {
    await writeAuditLog(prisma, {
      entityType: "Tender",
      entityId: `tender-${Date.now()}-${Math.random()}`,
      action: "tender.created",
      actorId: null,
    });
    const entry = await prisma.auditLogEntry.findFirstOrThrow({
      orderBy: { timestamp: "desc" },
    });
    return entry;
  }

  it("rejects UPDATE", async () => {
    const entry = await insertEntry();
    await expect(
      prisma.$executeRaw`UPDATE audit_log_entries SET action = 'tampered' WHERE id = ${entry.id}`,
    ).rejects.toThrow(/append-only/);
  });

  it("rejects DELETE", async () => {
    const entry = await insertEntry();
    await expect(
      prisma.$executeRaw`DELETE FROM audit_log_entries WHERE id = ${entry.id}`,
    ).rejects.toThrow(/append-only/);

    await expect(
      prisma.auditLogEntry.findUnique({ where: { id: entry.id } }),
    ).resolves.not.toBeNull();
  });

  it("rejects TRUNCATE", async () => {
    await insertEntry();
    await expect(
      prisma.$executeRawUnsafe("TRUNCATE audit_log_entries"),
    ).rejects.toThrow(/append-only/);
  });

  it("rejects Prisma-level update/delete too", async () => {
    const entry = await insertEntry();
    await expect(
      prisma.auditLogEntry.update({
        where: { id: entry.id },
        data: { action: "tampered" },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.auditLogEntry.delete({ where: { id: entry.id } }),
    ).rejects.toThrow();
  });
});
