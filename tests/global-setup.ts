import { execSync } from "node:child_process";
import { Client } from "pg";

// Rebuilds the test database from migrations before every run, so tests
// always exercise the real schema — including the audit append-only triggers.
export default async function setup() {
  const url = process.env.DATABASE_URL;
  if (!url || !/test/.test(url)) {
    throw new Error(
      `Refusing to run tests: DATABASE_URL must point at a test database (got: ${url ?? "unset"}). ` +
        "Run tests via `npm test` so .env.test is loaded.",
    );
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await client.end();

  execSync("npx prisma migrate deploy", { stdio: "inherit" });
}
