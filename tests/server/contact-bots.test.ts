/**
 * V1.2 item 3: the contact form turns bots away without bothering people. Two cheap signals sit in front of the
 * existing per-IP throttle: a hidden field (`hp_site`) that a form-filling bot completes and a person never sees, and a
 * minimum fill time (`openedAt`, the browser's Date.now() when the form opened; CONTACT_MIN_FILL_MS = 2500).
 *
 * The honest limit: this stops form-filling bots. A script that POSTs JSON directly can simply leave both out, so it is
 * limited only by the throttle (the last test). A missing, future, non-numeric or over-a-day-old openedAt is NO signal,
 * because an older cached client, a skewed clock and every other server test post without it; a genuine enquiry must
 * never be refused for a reason the sender cannot fix.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { clearOverrides, FakeSmtp } from "./fake-smtp"
import { api, one, resetDb } from "./helpers"

const smtp = new FakeSmtp()
const ENQUIRY = {
  name: "Ada Lovelace",
  email: "ada@example.test",
  message: "A site for my bakery, please, with an order form.",
}
const QUICK = "That was quick. Please check your details and send again."

beforeAll(() => smtp.start())
afterAll(() => smtp.stop())
beforeEach(() => {
  resetDb()
  smtp.reset()
  smtp.configure({ OWNER_ALERTS: "owner@example.test" })
})
afterEach(clearOverrides)

describe("contact.php bot signals", () => {
  it("a filled honeypot saves nothing, sends no alert and looks like success", async () => {
    const r = await api<{ id: number; reference: string | null }>("contact.php", {
      body: { ...ENQUIRY, hp_site: "https://spam.example.test", openedAt: Date.now() - 60_000 },
    })
    expect(r.status).toBe(201)
    expect(r.json).toEqual({ id: 0, reference: null })
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("0")
    expect(smtp.mails).toHaveLength(0)
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'enquiry_bot_dropped' AND detail = 'honeypot'")).toBe("1")
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'enquiry_submit'")).toBe("0")
  })

  it("a post opened 500 ms ago is asked to try again and saves nothing", async () => {
    const r = await api<{ error: string }>("contact.php", { body: { ...ENQUIRY, openedAt: Date.now() - 500 } })
    expect(r.status).toBe(429)
    expect(r.json.error).toBe(QUICK)
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("0")
    expect(smtp.mails).toHaveLength(0)
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'enquiry_too_fast'")).toBe("1")
  })

  it("a post opened 5 seconds ago is accepted", async () => {
    const r = await api("contact.php", { body: { ...ENQUIRY, hp_site: "", openedAt: Date.now() - 5_000 } })
    expect(r.status).toBe(201)
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("1")
    expect(smtp.mails).toHaveLength(1)
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action IN ('enquiry_bot_dropped', 'enquiry_too_fast')")).toBe("0")
  })

  it("a post with neither field is accepted", async () => {
    const r = await api("contact.php", { body: ENQUIRY })
    expect(r.status).toBe(201)
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("1")
  })

  it("an openedAt in the future, older than a day, or not a number is ignored (five posts: the throttle allows five)", async () => {
    const bad: unknown[] = [Date.now() + 3_600_000, Date.now() - 2 * 86_400_000, "soon", null, []]
    for (const openedAt of bad) {
      const r = await api("contact.php", { body: { ...ENQUIRY, openedAt } })
      expect(r.status, JSON.stringify(openedAt)).toBe(201)
    }
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe(String(bad.length))
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'enquiry_too_fast'")).toBe("0")
  })

  it("an openedAt sent as a numeric string is read as a number", async () => {
    const r = await api("contact.php", { body: { ...ENQUIRY, openedAt: String(Date.now() - 300) } })
    expect(r.status).toBe(429)
  })

  it("a refused fast post is not counted by the throttle, so the retry goes through", async () => {
    const fast = await api("contact.php", { body: { ...ENQUIRY, openedAt: Date.now() - 100 } })
    expect(fast.status).toBe(429)
    const retry = await api("contact.php", { body: { ...ENQUIRY, openedAt: Date.now() - 4_000 } })
    expect(retry.status).toBe(201)
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("1")
  })

  it("the sixth post in 15 minutes is still throttled, and a script that omits both fields is limited only by that", async () => {
    for (let i = 0; i < 5; i++) expect((await api("contact.php", { body: ENQUIRY })).status).toBe(201)
    const r = await api("contact.php", { body: ENQUIRY })
    expect(r.status).toBe(429)
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("5")
  })
})
