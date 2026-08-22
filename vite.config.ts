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
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
