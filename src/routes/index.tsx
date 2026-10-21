import type { ComponentType } from "react"
import { createBrowserRouter } from "react-router-dom"

// 🌐 PUBLIC CORPORATE SITE: eager, and shared with the build-time prerender
import { publicRoute } from "./public"

// 🔐 AUTH — eager only for the route guard + error boundary (both tiny). The
// login/register/cover/error PAGES are lazy (see below) so a marketing visitor
// never downloads the auth bundle on first paint.
import RequireAuth from "@/app/RequireAuth"
import ErrorPage from "@/pages/ErrorPage"

// 📊 CMS (/app/*) + 🔐 auth pages — lazy. The whole admin tree (charts, calendar,
// tiptap, pdf, xlsx) and the auth pages load only when their route is visited,
// so the public marketing site never downloads them. `lz` turns a default-export
// dynamic import into a React Router lazy route module; `lzNamed` does the same
// for a named export.
const lz = (factory: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await factory()).default,
})

export const router = createBrowserRouter([
  // 🔐 Member login (standalone, full-screen) — lazy
  { path: "login", lazy: lz(() => import("@/app/Login")) },

  // 🔗 Public read-only proposal (share link) — standalone, lazy
  { path: "p/:token", lazy: lz(() => import("@/marketing/pages/ProposalView")) },

  // 🔑 Set / reset password (invite + forgot flows) — standalone, lazy
  { path: "set-password", lazy: lz(() => import("@/app/SetPassword")) },

  // 🌐 PUBLIC CORPORATE SITE (gakinz.com), prerendered at build time
  publicRoute,

  // 📊 APP ROUTES (CMS) — guarded by RequireAuth, mounted under /app, all lazy
  {
    element: <RequireAuth />,
    children: [
      {
        path: "app",
        lazy: lz(() => import("@/layouts/AppLayout")),
        errorElement: <ErrorPage />,
        children: [
      { index: true, lazy: lz(() => import("@/app/modules/Dashboard")) },

      // ── GAkinzOS modules ────────────────────────────────────────────────
      { path: "leads", lazy: lz(() => import("@/app/modules/Leads")) },
      { path: "clients", lazy: lz(() => import("@/app/modules/Clients")) },
      { path: "projects", lazy: lz(() => import("@/app/modules/Projects")) },
      { path: "proposals", lazy: lz(() => import("@/app/modules/Proposals")) },
      { path: "invoicing", lazy: lz(() => import("@/app/modules/Invoicing")) },
      { path: "portal", lazy: lz(() => import("@/app/modules/Portal")) },
      { path: "time", lazy: lz(() => import("@/app/modules/Time")) },
      { path: "support", lazy: lz(() => import("@/app/modules/Support")) },
      { path: "comms", lazy: lz(() => import("@/app/modules/Comms")) },
      { path: "mailbox", lazy: lz(() => import("@/app/modules/Mailbox")) },
      { path: "analytics", lazy: lz(() => import("@/app/modules/Analytics")) },
      { path: "design", lazy: lz(() => import("@/app/modules/Design")) },
      { path: "devpipeline", lazy: lz(() => import("@/app/modules/DevPipeline")) },
      { path: "resourcing", lazy: lz(() => import("@/app/modules/Resourcing")) },
      { path: "contracts", lazy: lz(() => import("@/app/modules/Contracts")) },
      { path: "knowledge", lazy: lz(() => import("@/app/modules/Knowledge")) },
      { path: "content", lazy: lz(() => import("@/app/modules/Content")) },
      { path: "blog", lazy: lz(() => import("@/app/modules/Blog")) },
      { path: "testimonials", lazy: lz(() => import("@/app/modules/Testimonials")) },
      { path: "work", lazy: lz(() => import("@/app/modules/Work")) },
      { path: "site", lazy: lz(() => import("@/app/modules/Site")) },
      { path: "files", lazy: lz(() => import("@/app/modules/Files")) },
      { path: "careplan", lazy: lz(() => import("@/app/modules/CarePlan")) },
      { path: "platform", lazy: lz(() => import("@/app/modules/Platform")) },
      // My account: every signed-in role, client included (K-023, K-024).
      { path: "account", lazy: lz(() => import("@/app/modules/Account")) },

      // ✅ 404 HANDLER
          { path: "*", lazy: lz(() => import("@/pages/NotFound")) },
        ],
      },
    ],
  },
])
