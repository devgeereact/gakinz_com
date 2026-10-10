import { defineConfig } from "vitest/config"

// Server integration tests: real PHP endpoints against a throwaway local
// database. See tests/server/global-setup.ts. Run with `npm run test:server`.
export default defineConfig({
  test: {
    include: ["tests/server/**/*.test.ts"],
    globalSetup: ["tests/server/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
})
