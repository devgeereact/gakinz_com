import { defineConfig, mergeConfig } from "vitest/config"
import viteConfig from "./vite.config"

// Unit tests only. Server integration tests have their own config
// (vitest.server.config.ts) because they need a local database.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
    },
  }),
)
