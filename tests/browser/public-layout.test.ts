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
import { q, resetDb, sql } from "../server/helpers"
import { pageProblems } from "./layout"
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
  // The three built-in articles are in the sitemap, but the page shows what the CMS says: a slug the CMS does not
  // hold renders the 404 view after load (src/marketing/data/blog.ts). The live CMS lacks two of them (K-147), so
  // the throwaway database publishes all three, as the live one is meant to, and the test then holds the pages to it.
  resetDb()
  for (const [slug, title] of [
    ["what-makes-a-site-fast", "What makes a site fast"],
    ["accessibility-is-not-optional", "Accessibility is not optional"],
    ["why-one-team-design-and-build", "Why one team should design and build"],
  ])
    sql(`INSERT INTO posts (slug, title, excerpt, body, category, status, published_at) VALUES (${q(slug)}, ${q(title)}, 'Test post.', 'First paragraph.\n\nSecond paragraph.', 'Practice', 'published', NOW())`)
  stack = await startStack()
  browser = await launch()
})
afterAll(async () => {
  await browser?.close()
  await stack?.close()
})

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
      expect(await page.locator("main h1, #main h1").count(), `${route} has an h1`).toBeGreaterThanOrEqual(1)
      expect(await page.getByText("That page is not here").count(), `${route} shows the not-found page`).toBe(0)
      bad.push(...(await page.evaluate(pageProblems)))
      // Optional: GK_AXE=<path to axe.min.js> also runs axe-core (WCAG 2.0 to 2.2 A and AA). It is not a project
      // dependency (adding one would collide with the pending package changes), so it is a manual gate step.
      if (process.env.GK_AXE) {
        await page.addScriptTag({ path: process.env.GK_AXE })
        const found = await page.evaluate(async () => {
          // @ts-expect-error axe is injected by the script tag above
          const r = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } })
          return r.violations.map((v: { id: string; nodes: { target: string[] }[] }) => `axe ${v.id} x${v.nodes.length}: ${v.nodes[0].target.join(" ")}`)
        })
        bad.push(...found)
      }
      const shots = process.env.GK_SHOTS
      if (shots) {
        fs.mkdirSync(shots, { recursive: true })
        // Images below the fold load lazily; scroll the whole page once so a full-page capture shows them.
        await page.evaluate(async () => {
          for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
            window.scrollTo(0, y)
            await new Promise((r) => setTimeout(r, 40))
          }
          window.scrollTo(0, 0)
        })
        await page.waitForLoadState("networkidle")
        const name = (route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replace(/\//g, "-")) + `-${w}.png`
        await page.screenshot({ path: path.join(shots, name), fullPage: true })
      }
      await ctx.close()
      expect(bad, `${route} at ${w}px`).toEqual([])
    })
  })
}
