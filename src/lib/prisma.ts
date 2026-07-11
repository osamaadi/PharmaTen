import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Singleton so Next.js dev-mode hot reloads don't leak connection pools.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// All state-changing use cases run inside a transaction together with their
// audit log writes (PRD Section 8: contemporaneous, complete). This type lets
// helpers accept either the root client or a transaction handle.
export type PrismaClientOrTx = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];
