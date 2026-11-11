import { defineConfig } from "vitest/config"

// Browser tests: a real headless Chromium driving the built site (dist/) against the real PHP endpoints on a
// throwaway local database, the same stack the server tests use (tests/server/global-setup.ts). Nothing
// reaches the live site. Build first: `pnpm run build`. Run with `pnpm run test:browser`.
export default defineConfig({
  test: {
    include: ["tests/browser/**/*.test.ts"],
    globalSetup: ["tests/server/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
})
