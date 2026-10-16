import ReactDOM from "react-dom/client"
import { RouterProvider } from "react-router-dom"

import AppRoot from "@/AppRoot"
import { router } from "@/routes"
import { startSeeding } from "@/marketing/data/seed"
import { samePath } from "@/marketing/prerender-paths"
// D-046 type, self-hosted for both surfaces; the browser downloads only the
// unicode ranges a page uses. Bricolage Grotesque for display, Hanken Grotesk
// for text, JetBrains Mono for figures and labels.
// The optical-size build: weight and opsz axes, so display sizes get the
// tighter letterforms the design was approved with.
import "@fontsource-variable/bricolage-grotesque/opsz.css"
import "@fontsource-variable/hanken-grotesk"
import "@fontsource-variable/jetbrains-mono"
import "@/index.css"

const root = document.getElementById("root")!
const app = (
  <AppRoot>
    <RouterProvider router={router} />
  </AppRoot>
)

// A public page built by scripts/prerender.mjs arrives with its markup in #root
// and the path it was rendered for in data-prerendered. Hydrate it when that is
// the page the browser is on. Anything else (the CMS, a client-only route, or a
// server still sending one page for every path) is rendered from scratch, and
// React replaces whatever markup is there.
const built = root.dataset.prerendered
if (built && samePath(built, window.location.pathname)) {
  startSeeding()
  ReactDOM.hydrateRoot(root, app)
} else {
  ReactDOM.createRoot(root).render(app)
}
