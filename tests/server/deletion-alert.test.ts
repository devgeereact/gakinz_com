/**
 * V1 finish line item 10, K-095: a client's "Ask to delete my data" request used to open an ordinary normal-priority
 * ticket that nobody was told about, although a data request has a legal response deadline (generally one month; the
 * exact rule is for the adviser). Now the ticket is created at high priority and the owner is emailed at once with
 * the client, the ticket and the date one month on. A mail failure never stops the request.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { clearOverrides, FakeSmtp, subjectOf } from "./fake-smtp"
import { api, createClient, createUser, login, one, resetDb } from "./helpers"

const smtp = new FakeSmtp()
let token: string
let clientId: number

beforeAll(() => smtp.start())
afterAll(() => smtp.stop())
beforeEach(async () => {
  resetDb()
  smtp.reset()
  smtp.configure({ OWNER_ALERTS: "owner@example.test" })
  clientId = createClient("Erase Me Ltd")
  createUser({ email: "c@example.test", role: "client", clientId })
  token = await login("c@example.test")
})
afterEach(clearOverrides)

const ask = () => api<{ id?: number }>("support.php?action=deletion_request", { token, body: {} })

describe("deletion request alert", () => {
  it("opens the ticket at high priority and emails the owner with the client, the ticket and a date one month on", async () => {
    const r = await ask()
    expect(r.status).toBe(201)
    expect(one(`SELECT priority FROM tickets WHERE id = ${r.json.id}`)).toBe("high")
    expect(smtp.mails).toHaveLength(1)
    expect(smtp.mails[0].rcpt).toEqual(["owner@example.test"])
    expect(subjectOf(smtp.mails[0])).toBe("Data deletion request from Erase Me Ltd")
    const month = one("SELECT DATE_FORMAT(CURRENT_DATE + INTERVAL 1 MONTH, '%e %b %Y')")!
    expect(smtp.mails[0].data).toContain(month)
    expect(smtp.mails[0].data).toContain(`/app/support`)
    expect(smtp.mails[0].data).toContain(`#${r.json.id}`)
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'deletion_notified'")).toBe("1")
  })

  it("does not alert again for a second request while one is open, and deletes nothing", async () => {
    await ask()
    expect((await ask()).status).toBe(409)
    expect(smtp.mails).toHaveLength(1)
    expect(one("SELECT COUNT(*) FROM clients")).toBe("1")
  })

  it("still opens the ticket if the mail host refuses, and records the failure", async () => {
    smtp.rejectRcpt = true
    const r = await ask()
    expect(r.status).toBe(201)
    expect(one(`SELECT priority FROM tickets WHERE id = ${r.json.id}`)).toBe("high")
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'deletion_notify_failed'")).toBe("1")
  })

  it("sends nothing and changes nothing else when no alert address is set", async () => {
    smtp.configure({ OWNER_ALERTS: "", REPORT_RECIPIENTS: "" })
    expect((await ask()).status).toBe(201)
    expect(smtp.mails).toHaveLength(0)
  })
})
