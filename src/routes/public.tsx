import type { RouteObject } from "react-router-dom"

// 🌐 PUBLIC CORPORATE SITE: eager (first paint, light bundle)
import PublicLayout from "@/marketing/PublicLayout"
import Home from "@/marketing/pages/Home"
import About from "@/marketing/pages/About"
import ServicesPage from "@/marketing/pages/Services"
import ServiceDetail from "@/marketing/pages/ServiceDetail"
import Pricing from "@/marketing/pages/Pricing"
import Sectors from "@/marketing/pages/Sectors"
import Work from "@/marketing/pages/Work"
import WorkDetail from "@/marketing/pages/WorkDetail"
import Resources from "@/marketing/pages/Resources"
import ResourceDetail from "@/marketing/pages/ResourceDetail"
import Contact from "@/marketing/pages/Contact"
import { Privacy, Terms, Cookies } from "@/marketing/pages/Legal"
import Verify from "@/marketing/pages/Verify"
import PublicNotFound from "@/marketing/pages/NotFound"
import ErrorPage from "@/pages/ErrorPage"

/**
 * The public site's route branch, shared by the browser router
 * (src/routes/index.tsx) and the build-time prerender (src/entry-server.tsx),
 * so both render the same tree for the same path. Nothing here may be lazy:
 * the prerender renders synchronously.
 */
export const publicRoute: RouteObject = {
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
    // The one public route this relaunch adds.
    { path: "work/:slug", element: <WorkDetail /> },
    { path: "resources", element: <Resources /> },
    { path: "resources/:slug", element: <ResourceDetail /> },
    { path: "contact", element: <Contact /> },
    { path: "privacy", element: <Privacy /> },
    { path: "terms", element: <Terms /> },
    { path: "cookies", element: <Cookies /> },
    { path: "verify/:id", element: <Verify /> },
    { path: "*", element: <PublicNotFound /> },
  ],
}
