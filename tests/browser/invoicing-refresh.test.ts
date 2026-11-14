/**
 * V1.3 item 3: Invoicing refreshes itself after "Mark paid". The tiles and the row change without a reload.
 * Same stack as cms-layout.test.ts: the real PHP, a throwaway database, Clerk stubbed. Not the live site (K-044).
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import type { Browser } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createUser, login, resetDb } from "../server/helpers"
import { seedRealistic } from "./seed"
import { launch, startStack, type Stack } from "./stack"

const ROOT = path.resolve(__dirname, "../..")
const DIST = path.join(ROOT, ".local-test", "dist-cms")
let stack: Stack
let browser: Browser
let ownerToken: string

beforeAll(async () => {
  if (!process.env.GK_SKIP_CMS_BUILD || !fs.existsSync(path.join(DIST, "index.html"))) {
    execFileSync("npx", ["vite", "build", "-c", "vite.cms-test.config.ts", "--logLevel", "error"], {
      cwd: ROOT,
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "production" },
    })
  }
  resetDb()
  createUser({ email: "owner@example.test", role: "super_admin" })
  seedRealistic()
  ownerToken = await login("owner@example.test")
  stack = await startStack(DIST)
  browser = await launch()
}, 240_000)
afterAll(async () => {
  await browser?.close()
  await stack?.close()
})

const money = (s: string | null) => Number((s ?? "").replace(/[^0-9.]/g, ""))

describe("Invoicing after Mark paid", () => {
  it("moves the Paid this month and Outstanding tiles and the row status without a reload", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" })
    await ctx.addInitScript((t) => { (window as unknown as { __GK_TEST_TOKEN: string }).__GK_TEST_TOKEN = t }, ownerToken)
    const page = await ctx.newPage()
    let navigations = 0
    page.on("framenavigated", (f) => f === page.mainFrame() && (navigations += 1))
    await page.goto(`${stack.origin}/app/invoicing`, { waitUntil: "networkidle" })
    const tile = (label: string) => page.locator(`text=${label}`).first().locator("xpath=following::*[1]")
    const paidBefore = money(await tile("Paid this month").textContent())
    const outBefore = money(await tile("Outstanding").textContent())
    // A sent or overdue invoice (a draft was never outstanding, so marking it paid would not move that tile).
    const row = page.getByRole("row").filter({ hasText: /(Sent|Overdue)\d/ }).filter({ has: page.getByRole("button", { name: /Mark paid/ }) }).first()
    const markPaid = row.getByRole("button", { name: /Mark paid/ })
    expect(await markPaid.count(), (await page.getByRole("row").allTextContents()).slice(0, 4).join(" || ")).toBe(1)
    const rowText = await row.textContent()
    const amount = money((rowText ?? "").match(/£[\d,]+\.\d{2}/)?.[0] ?? null)
    const buttonsBefore = await page.getByRole("button", { name: /Mark paid/ }).count()
    const navBefore = navigations
    await markPaid.click()
    await page.waitForTimeout(800)
    expect(navigations, "no page reload").toBe(navBefore)
    expect(money(await tile("Paid this month").textContent())).toBeCloseTo(paidBefore + amount, 2)
    expect(money(await tile("Outstanding").textContent())).toBeCloseTo(outBefore - amount, 2)
    expect(await page.getByRole("button", { name: /Mark paid/ }).count(), "the row now reads paid").toBe(buttonsBefore - 1)
    await ctx.close()
  })
})
