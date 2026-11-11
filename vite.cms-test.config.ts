import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

// A test-only build of the app for tests/browser/cms-layout.test.ts. It is NOT what ships: `pnpm run build` uses
// vite.config.ts. Here `@clerk/clerk-react` is replaced by a stub that is always signed in and hands back a session
// token the test minted in its throwaway database, so the CMS opens against the real PHP without Clerk's servers.
// The output goes to .local-test/dist-cms (scratch, gitignored) and nothing in release.json or CI sends it anywhere.
export default defineConfig({
  base: "/",
  plugins: [tailwindcss(), react()], // the same plugin order as vite.config.ts, or the CMS would be built unstyled
  define: { "import.meta.env.VITE_CLERK_PUBLISHABLE_KEY": JSON.stringify("pk_test_cms_layout_stub") },
  build: { outDir: ".local-test/dist-cms", emptyOutDir: true },
  resolve: {
    alias: [
      { find: "@clerk/clerk-react", replacement: path.resolve(__dirname, "./tests/browser/clerk-stub.tsx") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
})
