import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  base: "/",
  // Project block 10 in the workspace port scheme (see ~/.claude/CLAUDE.md, "Dev-server ports").
  // strictPort so a clash fails loudly instead of drifting to a random port —
  // a drifted port is silently rejected by the live API's ALLOWED_ORIGINS,
  // which surfaces as an opaque CORS failure rather than "port in use".
  server: {
    port: 5102,
    strictPort: true,
  },
  preview: {
    port: 5102,
    strictPort: true,
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Two hand-cut chunks. Everything else keeps Rollup's default splitting.
        //  - "vendor": the framework runtime every route needs anyway, so it is
        //    one long-cached request instead of several.
        //  - "icons": lucide-react ships one module per glyph, which Rollup
        //    otherwise emits as ~30 chunks of 150-500 bytes, one HTTP request each.
        manualChunks(id: string) {
          const path = id.replace(/\\/g, "/")
          if (!path.includes("/node_modules/")) return
          if (/\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(path)) {
            return "vendor"
          }
          if (path.includes("/node_modules/lucide-react/")) return "icons"
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
