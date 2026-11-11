/**
 * V1.1 finish line item 1: every public page is laid out cleanly on a phone (375 px) and a desktop (1280 px).
 * The page list is the built sitemap, so a new page is covered the day it is prerendered. For each page and size it
 * fails on: sideways page scroll, text clipped by its own box, a console error, an uncaught error or a failed request.
 * Set GK_SHOTS=<dir> to also save a full-page screenshot of each (used for the visual review, not part of the check).
 */
import fs from "node:fs"
import path from "node:path"
import type { Browser } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { launch, startStack, type Stack } from "./stack"

const DIST = path.resolve(__dirname, "../../dist")

/** The public paths the build wrote, from sitemap.xml (the one list the prerender and the sitemap share). */
export function sitemapPaths(): string[] {
  const xml = fs.readFileSync(path.join(DIST, "sitemap.xml"), "utf8")
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
}

let stack: Stack
let browser: Browser
beforeAll(async () => {
  stack = await startStack()
  browser = await launch()
})
afterAll(async () => {
  await browser?.close()
  await stack?.close()
})

/** Runs inside the page. Returns one line per problem. */
function pageProblems(): string[] {
  const problems: string[] = []
  const vw = window.innerWidth
  const root = document.documentElement
  if (root.scrollWidth > vw) problems.push(`the page scrolls sideways (${root.scrollWidth}px in a ${vw}px window)`)
  const visible = (el: Element) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"
  }
  for (const el of document.querySelectorAll("body *")) {
    if (el.matches("input, textarea, select, .sr-only, svg, svg *")) continue
    const cs = getComputedStyle(el)
    if ((cs.overflowX === "hidden" || cs.overflowX === "clip") && el.scrollWidth > el.clientWidth + 1 && visible(el)) {
      problems.push(`content clipped in <${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 60)}">`)
    }
  }
  // Something sticking out past the right edge is what makes a phone page scroll sideways; name the first few.
  if (root.scrollWidth > vw) {
    let named = 0
    for (const el of document.querySelectorAll("body *")) {
      if (named >= 3) break
      const r = el.getBoundingClientRect()
      if (r.right > vw + 1 && r.width > 0 && visible(el)) {
        problems.push(`  sticks out: <${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 60)}"> right edge ${Math.round(r.right)}px`)
        named++
      }
    }
  }
  return problems
}

const pages = sitemapPaths()

for (const [label, w, h] of [["phone 375", 375, 812], ["desktop 1280", 1280, 800]] as const) {
  describe(`public pages, ${label}`, () => {
    it("the build lists the pages the V1 roadmap counts", () => {
      expect(pages.length).toBeGreaterThanOrEqual(32)
      expect(pages).toContain("/")
    })

    it.each(pages)("%s is laid out cleanly", async (route) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" })
      const page = await ctx.newPage()
      const bad: string[] = []
      page.on("console", (m) => m.type() === "error" && bad.push(`console error: ${m.text()}`))
      page.on("pageerror", (e) => bad.push(`page error: ${String(e)}`))
      page.on("requestfailed", (r) => bad.push(`request failed: ${r.method()} ${r.url()} ${r.failure()?.errorText}`))
      page.on("response", (r) => r.status() >= 400 && bad.push(`HTTP ${r.status()}: ${r.url()}`))
      await page.goto(`${stack.origin}${route}`, { waitUntil: "networkidle" })
      expect(await page.locator("main h1, #main h1").count(), `${route} has one h1`).toBeGreaterThanOrEqual(1)
      bad.push(...(await page.evaluate(pageProblems)))
      const shots = process.env.GK_SHOTS
      if (shots) {
        fs.mkdirSync(shots, { recursive: true })
        const name = (route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replace(/\//g, "-")) + `-${w}.png`
        await page.screenshot({ path: path.join(shots, name), fullPage: true })
      }
      await ctx.close()
      expect(bad, `${route} at ${w}px`).toEqual([])
    })
  })
}
