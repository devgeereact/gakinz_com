import { SHOWCASE } from "@/marketing/data/showcase"
import { DEFAULT_COPY } from "@/marketing/data/content"
import { insights } from "@/marketing/data/site"

/**
 * Which public paths are prerendered at build time, and where each one lands
 * in dist/. Pure, so the list is unit tested (prerender-paths.test.ts).
 *
 * Detail pages come from the built-in content: every SHOWCASE project, every
 * built-in service and every built-in post. A record published only in the CMS
 * has no prerendered page; it is served the SPA shell and renders in the
 * browser, as every page did before. /verify/:id is per certificate, so it is
 * never prerendered.
 */

/** "/work/" and "/work" are the same page; "/" stays "/". */
export function normalisePath(p: string): string {
  const clean = p.split(/[?#]/)[0] || "/"
  return clean.length > 1 ? clean.replace(/\/+$/, "") || "/" : "/"
}

export const samePath = (a: string, b: string) => normalisePath(a) === normalisePath(b)

export function prerenderPaths(): string[] {
  const fixed = ["/", "/work", "/services", "/pricing", "/about", "/resources", "/contact", "/sectors", "/privacy", "/terms", "/cookies"]
  const work = SHOWCASE.map((p) => `/work/${p.slug}`)
  const services = DEFAULT_COPY.services.map((s) => `/services/${s.slug}`)
  const posts = insights.map((p) => `/resources/${p.slug}`)
  return [...new Set([...fixed, ...work, ...services, ...posts].map(normalisePath))]
}

/** "/" is dist/index.html; "/work/rotaflow" is dist/work/rotaflow/index.html. */
export function outputFile(path: string): string {
  const p = normalisePath(path)
  return p === "/" ? "index.html" : `${p.slice(1)}/index.html`
}
