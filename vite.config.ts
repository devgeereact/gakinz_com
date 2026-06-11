import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  base: "/",
  server: {
    // 5174: gakinz's own dev port (5173 is taken by another local project);
    // listed in the API's ALLOWED_ORIGINS for dev CORS.
    port: Number(process.env.PORT) || 5174,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
