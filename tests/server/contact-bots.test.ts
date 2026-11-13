/**
 * V1.2 item 3: the contact form turns bots away without bothering people. Two cheap signals sit in front of the
 * existing per-IP throttle: a hidden field (`hp_site`) that a form-filling bot completes and a person never sees, and a
 * minimum fill time (`fillMs`, the milliseconds the browser measured from the form opening to the moment of sending;
 * CONTACT_MIN_FILL_MS = 2500). It is an elapsed time, so the server never compares the browser's clock with its own.
 *
 * The honest limit: this stops form-filling bots. A script that POSTs JSON directly can simply leave both out, so it is
 * limited only by the throttle (the last test). A missing, negative, non-numeric or over-a-day fillMs is NO signal,
 * because an older cached client and every other server test post without it; a genuine enquiry must never be refused
 * for a reason the sender cannot fix.
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
      body: { ...ENQUIRY, hp_site: "https://spam.example.test", fillMs: 60_000 },
    })
    expect(r.status).toBe(201)
    expect(r.json).toEqual({ id: 0, reference: null })
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("0")
    expect(smtp.mails).toHaveLength(0)
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'enquiry_bot_dropped' AND detail = 'honeypot'")).toBe("1")
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'enquiry_submit'")).toBe("0")
  })

  it("a post filled in 500 ms is asked to try again and saves nothing", async () => {
    const r = await api<{ error: string }>("contact.php", { body: { ...ENQUIRY, fillMs: 500 } })
    expect(r.status).toBe(429)
    expect(r.json.error).toBe(QUICK)
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("0")
    expect(smtp.mails).toHaveLength(0)
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'enquiry_too_fast'")).toBe("1")
  })

  it("a post filled in over 5 seconds is accepted", async () => {
    const r = await api("contact.php", { body: { ...ENQUIRY, hp_site: "", fillMs: 5_000 } })
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

  it("a fillMs that is negative, over a day, or not a number is ignored (five posts: the throttle allows five)", async () => {
    const bad: unknown[] = [-100, 2 * 86_400_000, "soon", null, []]
    for (const fillMs of bad) {
      const r = await api("contact.php", { body: { ...ENQUIRY, fillMs } })
      expect(r.status, JSON.stringify(fillMs)).toBe(201)
    }
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe(String(bad.length))
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'enquiry_too_fast'")).toBe("0")
  })

  it("a fast post is refused whatever the browser's clock says", async () => {
    // The old field, `openedAt`, was a browser timestamp the server compared with its own clock. Sent beside fillMs it
    // must change nothing: an opening time an hour ago (or an hour ahead) does not let a 500 ms fill through, and an
    // opening time of "now" does not stop a 5 s fill.
    for (const openedAt of [Date.now() - 3_600_000, Date.now() + 3_600_000]) {
      const r = await api<{ error: string }>("contact.php", { body: { ...ENQUIRY, fillMs: 500, openedAt } })
      expect(r.status, String(openedAt)).toBe(429)
      expect(r.json.error).toBe(QUICK)
    }
    expect((await api("contact.php", { body: { ...ENQUIRY, fillMs: 5_000, openedAt: Date.now() } })).status).toBe(201)
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("1")
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'enquiry_too_fast'")).toBe("2")
  })

  it("a fillMs sent as a numeric string is read as a number", async () => {
    const r = await api("contact.php", { body: { ...ENQUIRY, fillMs: "300" } })
    expect(r.status).toBe(429)
  })

  it("a refused fast post is not counted by the throttle, so the retry goes through", async () => {
    const fast = await api("contact.php", { body: { ...ENQUIRY, fillMs: 100 } })
    expect(fast.status).toBe(429)
    const retry = await api("contact.php", { body: { ...ENQUIRY, fillMs: 4_000 } })
    expect(retry.status).toBe(201)
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("1")
  })

  it("the sixth post in 15 minutes is still throttled, and a script that omits both fields is limited only by that", async () => {
    for (let i = 0; i < 5; i++) expect((await api("contact.php", { body: ENQUIRY })).status).toBe(201)
    const r = await api("contact.php", { body: ENQUIRY })
    expect(r.status).toBe(429)
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("5")
  })

  it("twenty-five honeypot hits from one IP write at most twenty audit rows and the rest are refused with 429", async () => {
    const statuses: number[] = []
    for (let i = 0; i < 25; i++) statuses.push((await api("contact.php", { body: { ...ENQUIRY, hp_site: "x" } })).status)
    expect(statuses.slice(0, 20).every((c) => c === 201)).toBe(true)
    expect(statuses.slice(20)).toEqual([429, 429, 429, 429, 429])
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action IN ('enquiry_bot_dropped', 'enquiry_too_fast')")).toBe("20")
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("0")
  })

  it("the bot bucket also counts too-fast refusals, and the refusal at the cap says to wait", async () => {
    for (let i = 0; i < 20; i++) {
      expect((await api("contact.php", { body: { ...ENQUIRY, fillMs: 100 } })).status).toBe(429)
    }
    const r = await api<{ error: string }>("contact.php", { body: { ...ENQUIRY, fillMs: 100 } })
    expect(r.status).toBe(429)
    expect(r.json.error).toBe("Too many enquiries from this connection. Please wait a few minutes and try again.")
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'enquiry_too_fast'")).toBe("20")
  })

  it("a real person who is refused for being too fast twice still gets through on the third try", async () => {
    for (let i = 0; i < 2; i++) {
      expect((await api("contact.php", { body: { ...ENQUIRY, fillMs: 200 } })).status).toBe(429)
    }
    expect((await api("contact.php", { body: { ...ENQUIRY, fillMs: 4_000 } })).status).toBe(201)
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("1")
  })

  it("a structured hp_site value is treated as filled (a form never sends one); an empty one is no signal", async () => {
    expect((await api<{ id: number }>("contact.php", { body: { ...ENQUIRY, hp_site: ["x"] } })).json.id).toBe(0)
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("0")
    expect((await api("contact.php", { body: { ...ENQUIRY, hp_site: [] } })).status).toBe(201)
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("1")
  })
})
