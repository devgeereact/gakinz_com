import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { buildPage, prerenderPaths, render, splitHead } from "@/entry-server"
import { cspHashProblems, inlineScriptHashes } from "./csp"
import { readHead } from "./head"
import { buildNotFoundPage, NOT_FOUND_FILE, NOT_FOUND_PATH, notFoundProblems } from "./not-found"
import { buildSitemap } from "./sitemap"

/**
 * dist/404.html, built the way scripts/prerender.mjs builds it: the public
 * not-found page in the same template as every other page, served by
 * server/notfound.php for an unknown address (V1.2 item 5).
 */
const ROOT = join(import.meta.dirname, "..", "..")
const template = readFileSync(join(ROOT, "index.html"), "utf8")
const htaccess = readFileSync(join(ROOT, "server", ".htaccess"), "utf8")
const page = buildNotFoundPage(template, render(NOT_FOUND_PATH))
// The sitemap as the build writes it: one <loc> per prerendered page's canonical.
const sitemap = buildSitemap(prerenderPaths().map((path) => ({ loc: readHead(splitHead(render(path)).head).canonical! })))

describe("the not-found page", () => {
  it("the build writes 404.html, noindex, titled Page not found, with a CSP-covered inline script, and it is not in the sitemap", () => {
    expect(NOT_FOUND_FILE).toBe("404.html")
    expect(page).toMatch(/<title>Page not found\b/)
    expect(page).toMatch(/<meta name="robots" content="[^"]*\bnoindex\b/)
    expect(inlineScriptHashes(page).length).toBeGreaterThan(0)
    expect(cspHashProblems([{ path: NOT_FOUND_PATH, html: page }], htaccess)).toEqual([])
    expect(prerenderPaths()).not.toContain(NOT_FOUND_PATH)
    expect(notFoundProblems(page, sitemap)).toEqual([])
  })

  it("is refused by the build when the page is not the not-found page, is indexable or is in the sitemap", () => {
    const home = buildPage(template, { path: "/", markup: render("/") })
    expect(notFoundProblems(home, sitemap).join("\n")).toMatch(/Page not found/)
    expect(notFoundProblems(home, sitemap).join("\n")).toMatch(/noindex/)
    const listed = `${sitemap}<loc>https://gakinz.com/404</loc>`
    expect(notFoundProblems(page, listed).join("\n")).toMatch(/sitemap/)
  })

  it("refuses markup that is not the not-found page", () => {
    expect(() => buildNotFoundPage(template, render("/"))).toThrow(/not-found page/)
  })
})
