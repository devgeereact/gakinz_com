import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

// A test-only build of the app for tests/browser/cms-layout.test.ts. It is NOT what ships: `npm run build` uses
// vite.config.ts. Here `@clerk/clerk-react` is replaced by a stub that is always signed in and hands back a session
// token the test minted in its throwaway database, so the CMS opens against the real PHP without Clerk's servers.
// The output goes to dist-cms-test (gitignored) and nothing in release.json or CI sends it anywhere.
export default defineConfig({
  base: "/",
  plugins: [react()],
  define: { "import.meta.env.VITE_CLERK_PUBLISHABLE_KEY": JSON.stringify("pk_test_cms_layout_stub") },
  build: { outDir: "dist-cms-test", emptyOutDir: true },
  resolve: {
    alias: [
      { find: "@clerk/clerk-react", replacement: path.resolve(__dirname, "./tests/browser/clerk-stub.tsx") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
})
