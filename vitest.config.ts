import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    globalSetup: "./tests/global-setup.ts",
    // Suites share one Postgres test database; run files serially.
    fileParallelism: false,
    testTimeout: 15000,
  },
});
