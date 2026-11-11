/**
 * V1.1 finish line item 4: every CMS screen holds realistic data on a phone (375 px) and a desktop (1280 px).
 * The app is built a second time for this test (vite.cms-test.config.ts) with Clerk replaced by a stub that is always
 * signed in, so the real screens run against the real PHP and a throwaway database seeded with realistic data
 * (tests/browser/seed.ts). Not the live site and not real data (K-044). For each route and size it fails on sideways
 * page scroll, clipped text, a console error, an uncaught error or a failed or refused request.
 * Set GK_SHOTS=<dir> to save full-page screenshots, GK_AXE=<axe.min.js> to also run axe-core.
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import type { Browser } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createUser, login, one, resetDb } from "../server/helpers"
import { pageProblems } from "./layout"
import { seedRealistic } from "./seed"
import { launch, startStack, type Stack } from "./stack"

const ROOT = path.resolve(__dirname, "../..")
const DIST = path.join(ROOT, "dist-cms-test")

/** Every CMS screen the owner can open (src/routes/index.tsx). */
const OWNER_ROUTES = [
  "/app", "/app/leads", "/app/clients", "/app/projects", "/app/proposals", "/app/invoicing", "/app/portal", "/app/time", "/app/support",
  "/app/comms", "/app/mailbox", "/app/analytics", "/app/design", "/app/devpipeline", "/app/resourcing", "/app/contracts", "/app/knowledge",
  "/app/content", "/app/blog", "/app/testimonials", "/app/certificates", "/app/work", "/app/site", "/app/files", "/app/careplan", "/app/platform",
  "/app/account",
]
/** The screens a client login has. */
const CLIENT_ROUTES = ["/app/portal", "/app/support", "/app/account"]
/** An editor cannot read invoices, so nothing on a screen may ask for them (the notification bell once did). */
const EDITOR_ROUTES = ["/app", "/app/leads", "/app/support", "/app/account"]

let stack: Stack
let browser: Browser
let ownerToken: string
let clientToken: string
let editorToken: string

beforeAll(async () => {
  if (!process.env.GK_SKIP_CMS_BUILD || !fs.existsSync(path.join(DIST, "index.html"))) {
    execFileSync("npx", ["vite", "build", "-c", "vite.cms-test.config.ts", "--logLevel", "error"], {
      cwd: ROOT,
      stdio: "pipe",
      // vitest sets NODE_ENV=test, which would build React in development mode and log its development warnings.
      env: { ...process.env, NODE_ENV: "production" },
    })
  }
  resetDb()
  createUser({ email: "owner@example.test", role: "super_admin" })
  seedRealistic()
  createUser({ email: "client@example.test", role: "client", clientId: 1 })
  createUser({ email: "editor@example.test", role: "editor" })
  ownerToken = await login("owner@example.test")
  editorToken = await login("editor@example.test")
  clientToken = await login("client@example.test")
  expect(one("SELECT COUNT(*) FROM clients")).toBe("40")
  stack = await startStack(DIST)
  browser = await launch()
}, 240_000)
afterAll(async () => {
  await browser?.close()
  await stack?.close()
})

const sizes = [["phone 375", 375, 812], ["desktop 1280", 1280, 800]] as const

function suite(who: string, routes: string[], token: () => string) {
  for (const [label, w, h] of sizes) {
    describe(`CMS as ${who}, ${label}`, () => {
      it.each(routes)("%s is laid out cleanly with realistic data", async (route) => {
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" })
        await ctx.addInitScript((t) => { (window as unknown as { __GK_TEST_TOKEN: string }).__GK_TEST_TOKEN = t }, token())
        const page = await ctx.newPage()
        const bad: string[] = []
        page.on("console", (m) => m.type() === "error" && bad.push(`console error: ${m.text()}`))
        page.on("pageerror", (e) => bad.push(`page error: ${String(e)}`))
        page.on("requestfailed", (r) => bad.push(`request failed: ${r.method()} ${r.url()} ${r.failure()?.errorText}`))
        page.on("response", (r) => r.status() >= 400 && bad.push(`HTTP ${r.status()}: ${r.url().replace(/^https?:\/\/[^/]+/, "")}`))
        await page.goto(`${stack.origin}${route}`, { waitUntil: "networkidle" })
        await page.waitForTimeout(300)
        expect(await page.locator("main h1, h1").count(), `${route} has an h1`).toBeGreaterThanOrEqual(1)
        bad.push(...(await page.evaluate(pageProblems)))
        if (process.env.GK_AXE) {
          await page.addScriptTag({ path: process.env.GK_AXE })
          bad.push(
            ...(await page.evaluate(async () => {
              // @ts-expect-error axe is injected by the script tag above
              const r = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } })
              return r.violations.map((v: { id: string; nodes: { target: string[] }[] }) => `axe ${v.id} x${v.nodes.length}: ${v.nodes[0].target.join(" ")}`)
            })),
          )
        }
        const shots = process.env.GK_SHOTS
        if (shots) {
          // Not a failure: boxes (tables, boards) that scroll sideways inside themselves, so some columns are off screen.
          const boxes = await page.evaluate(() =>
            [...document.querySelectorAll<HTMLElement>("main *")]
              .filter((el) => /auto|scroll/.test(getComputedStyle(el).overflowX) && el.scrollWidth > el.clientWidth + 1)
              .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} ${el.clientWidth}px shows ${el.scrollWidth}px`),
          )
          fs.mkdirSync(shots, { recursive: true })
          fs.appendFileSync(path.join(shots, "scrolling-boxes.txt"), `${who} ${route} ${w}: ${boxes.join(" | ") || "none"}\n`)
          fs.mkdirSync(shots, { recursive: true })
          await page.screenshot({ path: path.join(shots, `${who}-${route === "/app" ? "today" : route.replace(/^\/app\//, "")}-${w}.png`), fullPage: true })
        }
        await ctx.close()
        expect(bad, `${route} at ${w}px as ${who}`).toEqual([])
      })
    })
  }
}

suite("owner", OWNER_ROUTES, () => ownerToken)
suite("client", CLIENT_ROUTES, () => clientToken)
suite("editor", EDITOR_ROUTES, () => editorToken)
