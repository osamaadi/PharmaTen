# PharmaTen

Two-sided marketplace where pharmaceutical manufacturers post structured equipment
tenders (RFQs) and receive comparable, verified bids from global suppliers. See the
PRD for full product scope.

## Stack

- **Next.js (App Router) + TypeScript + Tailwind**
- **PostgreSQL** — plain Postgres via Prisma; production target is a managed
  provider (Neon recommended, see below). Local dev/tests run against local Postgres.
- **Prisma 7** (new `prisma-client` generator + `@prisma/adapter-pg` driver adapter)
- **Auth.js (NextAuth v5)** — email/password credentials, JWT sessions
- **Vitest** — integration tests against a real Postgres test database

### Why Neon over Supabase

Both are managed Postgres, and nothing in this codebase is provider-specific. Neon
is recommended because we use Prisma + NextAuth rather than Supabase's own auth/RLS
client stack, so Supabase's extra platform features (GoTrue auth, PostgREST,
Realtime) would sit unused — while Neon's branching gives cheap per-preview
databases which pair well with Vercel previews. If we later want Supabase Storage
for certificate/bid documents, switching is a one-line `DATABASE_URL` change.

## Getting started

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # set DATABASE_URL + AUTH_SECRET

# local postgres (dev + test databases)
createuser pharmaten --createdb  # or via psql, see .env.test for expected creds
createdb pharmaten_dev -O pharmaten
createdb pharmaten_test -O pharmaten

npx prisma migrate dev      # apply migrations
npm run dev                 # http://localhost:3000
```

## Tests

```bash
npm test
```

Tests run via `.env.test` against `pharmaten_test` and apply migrations
automatically before the suite.

## Data-integrity invariants (PRD Sections 8 & 10)

- **Audit trail**: every state-changing use case writes `AuditLogEntry` rows in the
  *same transaction* as the change (`src/lib/audit.ts`).
- **Append-only**: a Postgres trigger rejects `UPDATE`/`DELETE` on
  `audit_log_entries` (migration `audit_log_append_only`).
- **Tender versioning**: tender specs live in `TenderVersion` (v1 on creation);
  amendments will create v2, v3, … — never overwrite.
