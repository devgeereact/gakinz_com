import type { ComponentType } from "react"
import { createBrowserRouter } from "react-router-dom"

// 🌐 PUBLIC CORPORATE SITE — eager (first paint, light bundle)
import PublicLayout from "@/marketing/PublicLayout"
import Home from "@/marketing/pages/Home"
import About from "@/marketing/pages/About"
import ServicesPage from "@/marketing/pages/Services"
import ServiceDetail from "@/marketing/pages/ServiceDetail"
import Pricing from "@/marketing/pages/Pricing"
import Sectors from "@/marketing/pages/Sectors"
import Work from "@/marketing/pages/Work"
import Resources from "@/marketing/pages/Resources"
import ResourceDetail from "@/marketing/pages/ResourceDetail"
import Contact from "@/marketing/pages/Contact"
import { Privacy, Terms, Cookies } from "@/marketing/pages/Legal"
import Verify from "@/marketing/pages/Verify"
import PublicNotFound from "@/marketing/pages/NotFound"

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

  // 🌐 PUBLIC CORPORATE SITE (gakinz.com)
  {
    element: <PublicLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Home /> },
      { path: "about", element: <About /> },
      { path: "services", element: <ServicesPage /> },
      { path: "services/:slug", element: <ServiceDetail /> },
      { path: "pricing", element: <Pricing /> },
      { path: "sectors", element: <Sectors /> },
      { path: "work", element: <Work /> },
      { path: "resources", element: <Resources /> },
      { path: "resources/:slug", element: <ResourceDetail /> },
      { path: "contact", element: <Contact /> },
      { path: "privacy", element: <Privacy /> },
      { path: "terms", element: <Terms /> },
      { path: "cookies", element: <Cookies /> },
      { path: "verify/:id", element: <Verify /> },
      { path: "*", element: <PublicNotFound /> },
    ],
  },

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
      { path: "files", lazy: lz(() => import("@/app/modules/Files")) },
      { path: "careplan", lazy: lz(() => import("@/app/modules/CarePlan")) },
      { path: "platform", lazy: lz(() => import("@/app/modules/Platform")) },

      // ✅ 404 HANDLER
          { path: "*", lazy: lz(() => import("@/pages/NotFound")) },
        ],
      },
    ],
  },
])
