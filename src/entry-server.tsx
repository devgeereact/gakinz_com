import { renderToString } from "react-dom/server"
import { createMemoryRouter, RouterProvider } from "react-router-dom"

import AppRoot from "@/AppRoot"
import { publicRoute } from "@/routes/public"

export { prerenderPaths, outputFile, normalisePath, contentDate } from "@/marketing/prerender-paths"
export { buildPage, buildShell, splitHead, thirdPartyProblems, withFontPreloads } from "@/prerender/html"
export { readHead, checkHeads, isIndexable } from "@/prerender/head"
export { buildSitemap } from "@/prerender/sitemap"

/**
 * Build-time renderer for the public site (scripts/prerender.mjs).
 *
 * The same public route branch and the same providers as the browser, so the
 * markup hydrates. A memory router rather than the static handler, because it
 * renders the same RouterProvider tree the browser renders, which keeps useId
 * values identical. No route in the branch has a loader or is lazy, so the
 * router is ready synchronously and renderToString sees the page.
 *
 * Effects do not run here, so no data hook fetches anything: every page
 * renders its built-in content (src/marketing/data/seed.ts).
 */
export function render(path: string): string {
  const router = createMemoryRouter([publicRoute], { initialEntries: [path] })
  return renderToString(
    <AppRoot>
      <RouterProvider router={router} />
    </AppRoot>,
  )
}
