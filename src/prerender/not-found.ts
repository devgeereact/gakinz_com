/**
 * The public not-found page as a file, dist/404.html (V1.2 item 5). An unknown
 * address is sent by server/.htaccess to server/notfound.php, which answers 404
 * with this page, so a visitor sees the site's own "That page is not here" and a
 * crawler sees a real 404 instead of a soft one. scripts/prerender.mjs builds it
 * outside the loop over real pages (which refuses a 404), checks its inline
 * script against the policy like every other page, and runs notFoundProblems
 * over it and the sitemap. Pure, so it is unit tested (not-found.test.ts).
 */
import { canonicalUrl } from "./head"
import { buildPage } from "./html"

/** Rendered at this path; the public route branch has no page here, so it renders the not-found page. */
export const NOT_FOUND_PATH = "/404"
/** In the document root, beside notfound.php. Not <path>/index.html: /404 must not become a real page. */
export const NOT_FOUND_FILE = "404.html"

const TITLE = /<title>Page not found\b/

export function buildNotFoundPage(template: string, markup: string): string {
  if (!TITLE.test(markup)) throw new Error(`prerender: ${NOT_FOUND_PATH} did not render the not-found page`)
  return buildPage(template, { path: NOT_FOUND_PATH, markup })
}

/** One line per way the built 404 page is wrong: not the not-found page, indexable, or listed in the sitemap. */
export function notFoundProblems(html: string, sitemap: string): string[] {
  const problems: string[] = []
  if (!TITLE.test(html)) problems.push(`${NOT_FOUND_FILE} is not titled "Page not found"`)
  if (!/<meta name="robots" content="[^"]*\bnoindex\b/.test(html)) problems.push(`${NOT_FOUND_FILE} is not marked noindex`)
  if (sitemap.includes(`<loc>${canonicalUrl(NOT_FOUND_PATH)}</loc>`)) problems.push(`the sitemap lists ${canonicalUrl(NOT_FOUND_PATH)}`)
  return problems
}
