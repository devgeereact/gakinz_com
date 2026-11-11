/**
 * V1.1 finish line item 3: the owner is told when an alert email did not go out.
 * D-061 made a new enquiry and a data deletion request email $OWNER_ALERTS, and audited a failed send, but nothing
 * showed the failure: the owner would not know an enquiry email never arrived. today.php now returns `owner_alerts`
 * for the owner roles: the failed and held-back alerts of the last 7 days, newest first, at most 5 listed.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { clearOverrides, FakeSmtp } from "./fake-smtp"
import { api, createUser, login, one, resetDb, sql } from "./helpers"

type Alerts = { failed: number; items: { kind: string; detail: string; at: string }[] }
type Today = { owner_alerts?: Alerts }

const smtp = new FakeSmtp()
let owner: string
const alerts = async (token = owner) => (await api<Today>("today.php", { token })).json.owner_alerts

const audit = (action: string, detail: string, ago = "0 SECOND") =>
  sql(`INSERT INTO audit_log (action, detail, created_at) VALUES ('${action}', '${detail}', NOW() - INTERVAL ${ago})`)

beforeAll(() => smtp.start())
afterAll(() => smtp.stop())
beforeEach(async () => {
  resetDb()
  smtp.reset()
  smtp.configure({ OWNER_ALERTS: "owner@example.test" })
  createUser({ email: "owner@example.test", role: "super_admin" })
  owner = await login("owner@example.test")
})
afterEach(clearOverrides)

describe("today.php owner_alerts", () => {
  it("is present and empty when nothing failed, and successful alerts do not count", async () => {
    audit("enquiry_notified", "GK-E-2026-0001")
    audit("deletion_notified", "ticket #3")
    expect(await alerts()).toEqual({ failed: 0, items: [] })
  })

  it("lists failed enquiry and deletion alerts and held-back ones, newest first, with what failed", async () => {
    audit("enquiry_notify_failed", "GK-E-2026-0002 · connection refused", "3 HOUR")
    audit("deletion_notify_failed", "ticket #9 · 550 no", "1 HOUR")
    audit("alert_suppressed", "enquiry_notified GK-E-2026-0003", "10 MINUTE")
    const a = (await alerts())!
    expect(a.failed).toBe(3)
    expect(a.items.map((i) => i.kind)).toEqual(["suppressed", "deletion", "enquiry"])
    expect(a.items[1].detail).toBe("ticket #9 · 550 no")
    expect(a.items[2].detail).toBe("GK-E-2026-0002 · connection refused")
    expect(a.items[0].at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
  })

  it("leaves out failures older than 7 days, and lists at most 5 while counting them all", async () => {
    audit("enquiry_notify_failed", "GK-E-OLD · refused", "8 DAY")
    for (let i = 0; i < 7; i++) audit("enquiry_notify_failed", `GK-E-2026-010${i} · refused`, `${i + 1} HOUR`)
    const a = (await alerts())!
    expect(a.failed).toBe(7)
    expect(a.items).toHaveLength(5)
    expect(a.items[0].detail).toContain("GK-E-2026-0100")
    expect(JSON.stringify(a)).not.toContain("GK-E-OLD")
  })

  it("is for the owner roles only", async () => {
    audit("enquiry_notify_failed", "GK-E-2026-0001 · refused")
    createUser({ email: "editor@example.test", role: "editor" })
    createUser({ email: "manager@example.test", role: "manager" })
    expect((await alerts(await login("editor@example.test")))).toBeUndefined()
    expect((await alerts(await login("manager@example.test")))?.failed).toBe(1)
  })

  it("shows a real failure end to end: the mail host refuses, the enquiry is still saved, Today says so", async () => {
    smtp.rejectRcpt = true
    const r = await api("contact.php", {
      body: { name: "Ada Lovelace", email: "ada@example.test", message: "A site for my bakery, please, with an order form." },
    })
    expect(r.status).toBe(201)
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("1")
    const a = (await alerts())!
    expect(a.failed).toBe(1)
    expect(a.items[0].kind).toBe("enquiry")
    expect(a.items[0].detail).toContain((r.json as { reference: string }).reference)
  })
})
