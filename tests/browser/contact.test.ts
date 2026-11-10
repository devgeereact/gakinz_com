/**
 * V1 finish line item 3, in a real browser: a visitor fills in the contact form on /contact, sends it, sees the
 * thank-you and their reference, the enquiry is stored once, and the owner is emailed. Also the failure paths a
 * visitor can hit: a field left wrong, and the server being unable to save (what they typed must survive).
 * Mobile (375 px) and desktop. No console errors, no failed requests, no horizontal scroll.
 */
import type { Browser, Page } from "playwright-core"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { clearOverrides, FakeSmtp, subjectOf } from "../server/fake-smtp"
import { one, resetDb } from "../server/helpers"
import { launch, startStack, type Stack } from "./stack"

const smtp = new FakeSmtp()
let stack: Stack
let browser: Browser

beforeAll(async () => {
  await smtp.start()
  stack = await startStack()
  browser = await launch()
})
afterAll(async () => {
  await browser?.close()
  await stack?.close()
  smtp.stop()
})
beforeEach(() => {
  resetDb()
  smtp.reset()
  smtp.configure({ OWNER_ALERTS: "owner@example.test" })
})
afterEach(clearOverrides)

type Seen = { console: string[]; failed: string[] }

async function open(width: number, height: number): Promise<{ page: Page; seen: Seen }> {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" })
  const page = await ctx.newPage()
  const seen: Seen = { console: [], failed: [] }
  page.on("console", (m) => m.type() === "error" && seen.console.push(m.text()))
  page.on("pageerror", (e) => seen.console.push(String(e)))
  page.on("requestfailed", (r) => seen.failed.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`))
  await page.goto(`${stack.origin}/contact`, { waitUntil: "networkidle" })
  return { page, seen }
}

async function fill(page: Page) {
  await page.getByLabel("Your name").fill("Ada Lovelace")
  await page.getByLabel("Email", { exact: true }).fill("ada@example.test")
  await page.getByLabel("What do you need?").fill("A site for my bakery, please, with an order form.")
}

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)

for (const [label, w, h] of [["mobile 375", 375, 812], ["desktop 1280", 1280, 800]] as const) {
  describe(`contact form, ${label}`, () => {
    it("sends the enquiry, thanks the visitor with a reference, stores it once and emails the owner", async () => {
      const { page, seen } = await open(w, h)
      expect(await noHorizontalScroll(page)).toBe(true)
      await fill(page)
      await page.getByRole("button", { name: /send enquiry/i }).click()
      await page.getByRole("status").getByText(/Thanks, Ada/).waitFor()
      await expect(page.getByRole("status").textContent()).resolves.toMatch(/GK-E-\d{4}-\d{4}/)
      expect(one("SELECT COUNT(*) FROM enquiries")).toBe("1")
      expect(one("SELECT email FROM enquiries")).toBe("ada@example.test")
      await expect.poll(() => smtp.mails.length).toBe(1)
      expect(smtp.mails[0].rcpt).toEqual(["owner@example.test"])
      expect(subjectOf(smtp.mails[0])).toBe("New enquiry from Ada Lovelace")
      expect(await noHorizontalScroll(page)).toBe(true)
      expect(seen).toEqual({ console: [], failed: [] })
    })

    it("tells the visitor which field is wrong and sends nothing", async () => {
      const { page } = await open(w, h)
      await page.getByLabel("Your name").fill("Ada")
      await page.getByLabel("Email", { exact: true }).fill("not-an-email")
      await page.getByRole("button", { name: /send enquiry/i }).click()
      await expect(page.getByLabel("Email", { exact: true }).getAttribute("aria-invalid")).resolves.toBe("true")
      expect(one("SELECT COUNT(*) FROM enquiries")).toBe("0")
      expect(smtp.mails).toHaveLength(0)
    })

    it("keeps what the visitor typed, and says so, when the server cannot save", async () => {
      const { page } = await open(w, h)
      await page.route("**/contact.php", (r) => r.fulfill({ status: 500, contentType: "application/json", body: '{"error":"Could not save your enquiry."}' }))
      await fill(page)
      await page.getByRole("button", { name: /send enquiry/i }).click()
      await page.getByRole("alert").getByText(/Email me directly/i).waitFor()
      await expect(page.getByLabel("What do you need?").inputValue()).resolves.toContain("bakery")
      await expect(page.getByLabel("Your name").inputValue()).resolves.toBe("Ada Lovelace")
      expect(one("SELECT COUNT(*) FROM enquiries")).toBe("0")
    })
  })
}
