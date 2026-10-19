/**
 * privacy.php?action=erase_enquiry (docs/PRIVACY-READINESS.md section 7, K-062):
 * a super admin erases ONE prospect's enquiry with a typed confirmation. It
 * must refuse every role but super_admin, a wrong confirmation, and any
 * enquiry that touches a client, and change nothing when it refuses. When it
 * erases, the enquiry, its calls and their history go, the audit text naming
 * the enquirer is scrubbed, one audit row records it by id, and nothing else
 * moves.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createUser, login, one, q, resetDb, sql } from "./helpers"

type EraseReply = { erased?: boolean; id?: number; bookings?: number; booking_events?: number; audit_scrubbed?: number; error?: string; reason?: string }

const erase = (token: string | undefined, body: unknown) => api<EraseReply>("privacy.php?action=erase_enquiry", { token, body })

/** One enquiry with a call, its history, a submit audit row and a staff audit row. */
function seedProspect(name: string, email: string, status = "contacted"): { id: number; bookingId: number } {
  sql(`INSERT INTO enquiries (name, email, company, message, status, ip, next_action_at, next_action_note, priority)
       VALUES (${q(name)}, ${q(email)}, 'Prospect Co', 'Please quote for a website', ${q(status)}, '198.51.100.20', CURRENT_DATE, 'Ring back', 2)`)
  const id = Number(one("SELECT MAX(id) FROM enquiries"))
  sql(`INSERT INTO bookings (enquiry_id, starts_at, timezone, notes, location) VALUES (${id}, '2026-11-02 10:00:00', 'Europe/London', 'Intro call', '07700 900123')`)
  const bookingId = Number(one("SELECT MAX(id) FROM bookings"))
  sql(`INSERT INTO booking_events (booking_id, kind, to_status, notify_to) VALUES (${bookingId}, 'created', 'requested', ${q(email)}), (${bookingId}, 'status', 'confirmed', ${q(email)})`)
  sql(`INSERT INTO audit_log (user_id, action, detail, ip) VALUES (NULL, 'enquiry_submit', ${q(email)}, '198.51.100.20')`)
  sql(`INSERT INTO audit_log (user_id, action, detail, ip) VALUES (NULL, 'mail_send', ${q(`to ${email} — Hello ${name}, thanks`)}, '203.0.113.1')`)
  sql(`INSERT INTO audit_log (user_id, action, detail) VALUES (NULL, 'lead_status', ${q(`#${id} → contacted`)})`)
  return { id, bookingId }
}

/** Row counts and checksums of every table an erasure must leave alone. */
function untouched(): string {
  const tables = ["clients", "users", "projects", "proposals", "invoices", "invoice_items", "payment_events", "tickets", "ticket_replies",
    "contracts", "files", "comm_threads", "comm_messages", "client_feedback", "tasks"]
  return tables.map((t) => `${t}=${one(`SELECT COUNT(*) FROM ${t}`)}:${sql(`CHECKSUM TABLE ${t}`)[0][1]}`).join(" ")
}
function everything(): string {
  const tables = ["enquiries", "bookings", "booking_events", "audit_log"]
  return untouched() + " " + tables.map((t) => `${t}=${one(`SELECT COUNT(*) FROM ${t}`)}:${sql(`CHECKSUM TABLE ${t}`)[0][1]}`).join(" ")
}

describe("erase_enquiry", () => {
  let owner: string
  let ownerId: number
  let p: { id: number; bookingId: number }
  let other: { id: number; bookingId: number }

  beforeEach(async () => {
    resetDb()
    ownerId = createUser({ email: "owner@example.test", role: "super_admin" })
    owner = await login("owner@example.test")
    p = seedProspect("Jane Prospect", "jane@example.test")
    other = seedProspect("Sam Other", "sam@example.test")
    // A client with all its records, which no erasure may touch.
    const cid = createClient("Client Ltd", "client@example.test")
    sql(`INSERT INTO projects (client_id, name) VALUES (${cid}, 'Client site')`)
    sql(`INSERT INTO invoices (client_id, status, issued_at) VALUES (${cid}, 'sent', CURRENT_DATE)`)
    sql(`INSERT INTO proposals (client_id, title) VALUES (${cid}, 'Client quote')`)
    sql(`INSERT INTO tickets (client_id, subject) VALUES (${cid}, 'Client ticket')`)
    sql(`INSERT INTO contracts (client_id, title, signer_email) VALUES (${cid}, 'Client agreement', 'client@example.test')`)
    sql(`INSERT INTO files (client_id, name, \`stored\`) VALUES (${cid}, 'brief.pdf', 'abc123.pdf')`)
  })

  it("is super_admin only: no token, admin, manager, editor and a client are all refused and nothing changes", async () => {
    const cid = Number(one("SELECT id FROM clients WHERE company = 'Client Ltd'"))
    const tokens: string[] = []
    for (const role of ["admin", "manager", "editor"]) {
      createUser({ email: `${role}@example.test`, role })
      tokens.push(await login(`${role}@example.test`))
    }
    createUser({ email: "portal@example.test", role: "client", clientId: cid })
    tokens.push(await login("portal@example.test"))

    const before = everything()
    expect((await erase(undefined, { id: p.id, confirm: "jane@example.test" })).status).toBe(401)
    for (const token of tokens) {
      expect((await erase(token, { id: p.id, confirm: "jane@example.test" })).status).toBe(403)
    }
    expect((await api(`privacy.php?action=erase_enquiry&id=${p.id}`, { token: owner })).status).toBe(400)
    expect(everything()).toBe(before)
  })

  it("refuses a wrong, empty or missing confirmation, a bad id and an unknown enquiry, changing nothing", async () => {
    const before = everything()
    const wrong = await erase(owner, { id: p.id, confirm: "sam@example.test" })
    expect(wrong.status).toBe(400)
    expect(wrong.json.error).toBe("That does not match this enquiry's email address. Nothing was erased.")
    expect((await erase(owner, { id: p.id, confirm: "jane@example.tes" })).status).toBe(400)
    expect((await erase(owner, { id: p.id, confirm: "" })).status).toBe(400)
    expect((await erase(owner, { id: p.id })).status).toBe(400)
    expect((await erase(owner, { id: p.id, confirm: ["jane@example.test"] })).status).toBe(400)
    expect((await erase(owner, { id: "1 OR 1=1", confirm: "jane@example.test" })).status).toBe(400)
    expect((await erase(owner, { id: -1, confirm: "jane@example.test" })).status).toBe(400)
    expect((await erase(owner, { id: 999999, confirm: "jane@example.test" })).status).toBe(404)
    expect(everything()).toBe(before)
  })

  it("refuses 409 a won enquiry, a converted one, one with a call filed against a client, and one whose address a client, user or signer uses", async () => {
    const cid = Number(one("SELECT id FROM clients WHERE company = 'Client Ltd'"))
    const won = seedProspect("Won Person", "won@example.test", "won")
    const converted = seedProspect("Converted Person", "converted@example.test", "proposal")
    sql(`INSERT INTO clients (company, source_lead_id) VALUES ('Converted Ltd', ${converted.id})`)
    const callLinked = seedProspect("Call Person", "call@example.test")
    sql(`UPDATE bookings SET client_id = ${cid} WHERE id = ${callLinked.bookingId}`)
    const sameAsClient = seedProspect("Client Person", "CLIENT@example.test ")
    const sameAsUser = seedProspect("Staff Person", "owner@example.test")
    const sameAsSigner = seedProspect("Signer Person", "signer@example.test")
    sql(`UPDATE contracts SET signer_email = 'signer@example.test'`)

    const before = everything()
    const cases: Array<[number, string, string]> = [
      [won.id, "won@example.test", "won"],
      [converted.id, "converted@example.test", "converted"],
      [callLinked.id, "call@example.test", "client_call"],
      [sameAsClient.id, "client@example.test", "known_address"],
      [sameAsUser.id, "owner@example.test", "known_address"],
      [sameAsSigner.id, "signer@example.test", "known_address"],
    ]
    for (const [id, confirm, reason] of cases) {
      const r = await erase(owner, { id, confirm })
      expect(r.status, `${confirm}`).toBe(409)
      expect(r.json.reason).toBe(reason)
    }
    expect(everything()).toBe(before)
  })

  it("erases the enquiry, its calls and their history, scrubs the audit text, and writes one audit row with no personal data", async () => {
    const before = untouched()
    const auditBefore = Number(one("SELECT COUNT(*) FROM audit_log"))
    const r = await erase(owner, { id: String(p.id), confirm: "  Jane@Example.TEST " })
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ erased: true, id: p.id, bookings: 1, booking_events: 2, audit_scrubbed: 2 })

    expect(one(`SELECT COUNT(*) FROM enquiries WHERE id = ${p.id}`)).toBe("0")
    expect(one(`SELECT COUNT(*) FROM bookings WHERE id = ${p.bookingId} OR enquiry_id = ${p.id}`)).toBe("0")
    expect(one(`SELECT COUNT(*) FROM booking_events WHERE booking_id = ${p.bookingId}`)).toBe("0")
    // No trace of the address or the name anywhere in the database's text columns that held them.
    expect(one("SELECT COUNT(*) FROM audit_log WHERE detail LIKE '%jane@example.test%' OR detail LIKE '%Jane Prospect%'")).toBe("0")
    expect(one("SELECT COUNT(*) FROM booking_events WHERE notify_to = 'jane@example.test'")).toBe("0")
    const submit = sql("SELECT detail, IFNULL(ip, 'NULL') FROM audit_log WHERE action = 'enquiry_submit' ORDER BY id")
    expect(submit).toEqual([["[erased]", "NULL"], ["sam@example.test", "198.51.100.20"]])
    expect(one("SELECT detail FROM audit_log WHERE action = 'mail_send' AND detail LIKE 'to [erased]%'")).toBe("to [erased] — Hello [erased], thanks")
    // A staff member's own row keeps its IP: only the enquirer's submit row loses it.
    expect(one("SELECT ip FROM audit_log WHERE action = 'mail_send' AND detail LIKE 'to [erased]%'")).toBe("203.0.113.1")

    // Exactly one new audit row, by id only.
    expect(Number(one("SELECT COUNT(*) FROM audit_log"))).toBe(auditBefore + 1)
    expect(sql("SELECT user_id, detail FROM audit_log WHERE action = 'enquiry_erase'")).toEqual([[String(ownerId), `#${p.id}`]])

    // The other enquiry and every client record are untouched.
    expect(sql(`SELECT name, email, ip FROM enquiries WHERE id = ${other.id}`)).toEqual([["Sam Other", "sam@example.test", "198.51.100.20"]])
    expect(one(`SELECT COUNT(*) FROM bookings WHERE enquiry_id = ${other.id}`)).toBe("1")
    expect(one(`SELECT COUNT(*) FROM booking_events WHERE booking_id = ${other.bookingId}`)).toBe("2")
    expect(one("SELECT detail FROM audit_log WHERE action = 'mail_send' AND detail LIKE '%sam@example.test%'")).toBe("to sam@example.test — Hello Sam Other, thanks")
    expect(untouched()).toBe(before)

    // A second erase finds nothing.
    expect((await erase(owner, { id: p.id, confirm: "jane@example.test" })).status).toBe(404)
  })

  it("scrubs only whole matches of the address: a longer address that contains it is someone else's", async () => {
    sql(`INSERT INTO audit_log (action, detail) VALUES ('login_failed', 'xjane@example.test'), ('login_failed', 'jane@example.test.uk'), ('login_failed', 'jane@example.test')`)
    const r = await erase(owner, { id: p.id, confirm: "jane@example.test" })
    expect(r.status).toBe(200)
    expect(sql("SELECT detail FROM audit_log WHERE action = 'login_failed' ORDER BY id").map((x) => x[0])).toEqual([
      "xjane@example.test", "jane@example.test.uk", "[erased]",
    ])
  })

  it("erases an enquiry with no calls, and one already soft-deleted", async () => {
    sql(`INSERT INTO enquiries (name, email, message, deleted_at) VALUES ('Gone Person', 'gone@example.test', 'm', NOW())`)
    const id = Number(one("SELECT MAX(id) FROM enquiries"))
    const r = await erase(owner, { id, confirm: "gone@example.test" })
    expect(r.status).toBe(200)
    expect(r.json).toMatchObject({ erased: true, bookings: 0, booking_events: 0 })
    expect(one(`SELECT COUNT(*) FROM enquiries WHERE id = ${id}`)).toBe("0")
  })
})
