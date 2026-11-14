/**
 * V1 finish line item 3: a visitor submits the contact form and the owner is told at once.
 * Before, contact.php saved the enquiry and sent no mail, so with no cron entry on the host (K-145) the owner
 * only knew about an enquiry by opening Leads. Now each saved enquiry mails $OWNER_ALERTS, and only that: never the
 * weekly-digest list, because an alert carries personal details. The mail is best effort: a mail failure never loses
 * the enquiry, and a flood guard caps it at 20 an hour. A fake SMTP server stands in for the mail host.
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { clearOverrides, FakeSmtp, subjectOf } from "./fake-smtp"
import { WORK_DIR } from "./env"
import { api, one, resetDb, sql } from "./helpers"

const smtp = new FakeSmtp()
const ENQUIRY = {
  name: "Ada Lovelace",
  email: "ada@example.test",
  company: "Analytical Cakes",
  budget: "£1,500 to £3,500",
  projectType: "New website",
  message: "A site for my bakery, please, with an order form.",
}

beforeAll(() => smtp.start())
afterAll(() => smtp.stop())
beforeEach(() => {
  resetDb()
  smtp.reset()
  smtp.configure({ OWNER_ALERTS: "owner@example.test" })
})
afterEach(clearOverrides)

describe("owner notification on a new enquiry", () => {
  it("saves the enquiry once and emails the owner the details and where to open it", async () => {
    const r = await api("contact.php", { body: ENQUIRY })
    expect(r.status).toBe(201)
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("1")
    expect(smtp.mails).toHaveLength(1)
    const mail = smtp.mails[0]
    expect(mail.rcpt).toEqual(["owner@example.test"])
    expect(subjectOf(mail)).toBe("New enquiry from Ada Lovelace")
    expect(mail.data).toContain("ada@example.test")
    expect(mail.data).toContain("Analytical Cakes")
    expect(mail.data).toContain("A site for my bakery, please, with an order form.")
    expect(mail.data).toContain("/app/leads")
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'enquiry_notified'")).toBe("1")
  })

  it("never falls back to the weekly-digest list: an alert carries personal details", async () => {
    smtp.configure({ OWNER_ALERTS: "", REPORT_RECIPIENTS: "digest@example.test" })
    expect((await api("contact.php", { body: ENQUIRY })).status).toBe(201)
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("1")
    expect(smtp.mails).toHaveLength(0)
  })

  it("stops mailing after 20 alerts an hour, still saves every enquiry, and says so in the audit log", async () => {
    for (let i = 0; i < 20; i++) sql(`INSERT INTO audit_log (action, detail) VALUES ('enquiry_notified', 'GK-E-TEST-${i}')`)
    const r = await api("contact.php", { body: ENQUIRY })
    expect(r.status).toBe(201)
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("1")
    expect(smtp.mails).toHaveLength(0)
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'alert_suppressed'")).toBe("1")
  })

  it("gk_oneline copes with invalid UTF-8, control characters and length", () => {
    const code = `require ${JSON.stringify(path.join(WORK_DIR, "_notify.php"))};
      echo json_encode([gk_oneline("bad \\xff\\xfe name\\r\\nBcc: x", 50), gk_oneline(str_repeat("a", 300), 20)], JSON_INVALID_UTF8_SUBSTITUTE);`
    const out = JSON.parse(spawnSync("php", ["-r", code], { encoding: "utf8" }).stdout) as string[]
    expect(out[0]).not.toMatch(/[\r\n]/)
    expect(out[0]).toContain("Bcc: x")
    expect(out[1]).toHaveLength(20)
  })

  it("gk_oneline removes C1 controls, line and paragraph separators and bidirectional overrides (V1.3 item 5)", () => {
    const hostile = "a\u{85}b\u{9f}c\u{2028}d\u{2029}e\u{202e}f\u{202d}g\u{202a}h\u{202b}i\u{202c}j\u{2066}k\u{2067}l\u{2068}m\u{2069}n\u{200e}o\u{200f}p\u{61c}q"
    const code = `require ${JSON.stringify(path.join(WORK_DIR, "_notify.php"))};
      echo json_encode(gk_oneline(json_decode('"' . '${hostile.replace(/[^\x20-\x7e]/g, (c) => "\\u" + c.codePointAt(0)!.toString(16).padStart(4, "0")).replace(/\\u/g, "\\\\u")}' . '"'), 200), JSON_UNESCAPED_UNICODE);`
    const out = JSON.parse(spawnSync("php", ["-r", code], { encoding: "utf8" }).stdout) as string
    expect(out).not.toMatch(/[\u0080-\u009f\u2028\u2029\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/)
    expect(out.replace(/\s+/g, "")).toBe("abcdefghijklmnopq")
  })

  it("keeps hostile characters out of the honeypot audit detail", async () => {
    const r = await api("contact.php", { body: { ...ENQUIRY, hp_site: "x", email: "bot\u{202e}@x\u{2028}.test\u{85}" } })
    expect(r.status).toBe(201)
    const detail = one("SELECT detail FROM audit_log WHERE action = 'enquiry_bot_dropped' ORDER BY id DESC LIMIT 1")
    expect(detail).toMatch(/^honeypot bot/)
    expect(detail).not.toMatch(/[\u0080-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/)
  })

  it("does not mail for an enquiry that is refused", async () => {
    expect((await api("contact.php", { body: { ...ENQUIRY, email: "not-an-email" } })).status).toBe(400)
    expect((await api("contact.php", { body: { ...ENQUIRY, message: "short" } })).status).toBe(400)
    expect(smtp.mails).toHaveLength(0)
  })

  it("cannot be used to add recipients or headers through the visitor's own text", async () => {
    const r = await api("contact.php", {
      body: { ...ENQUIRY, name: "Eve\r\nBcc: evil@example.test", company: "X\r\nSubject: spoofed" },
    })
    expect(r.status).toBe(201)
    expect(smtp.mails).toHaveLength(1)
    expect(smtp.mails[0].rcpt).toEqual(["owner@example.test"])
    expect(subjectOf(smtp.mails[0])).not.toContain("\n")
    expect(smtp.mails[0].data.split("\r\n\r\n")[0]).not.toMatch(/^Bcc:/im)
  })

  it("notifies every address in a comma list", async () => {
    smtp.configure({ OWNER_ALERTS: "owner@example.test, second@example.test" })
    await api("contact.php", { body: ENQUIRY })
    expect(smtp.mails).toHaveLength(1)
    expect(smtp.mails[0].rcpt).toEqual(["owner@example.test", "second@example.test"])
  })
})
