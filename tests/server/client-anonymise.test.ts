/**
 * privacy.php?action=anonymise_preview and anonymise_client (_anonymise.php,
 * docs/PRIVACY-READINESS.md section 7, K-108). Switched off by default: then
 * both routes answer 404 and nothing changes. Switched on, a super admin
 * anonymises ONE former client by typing its company name. It must refuse
 * every other role, a wrong confirmation and any client with open business,
 * changing nothing; and when it acts, it must change exactly the agreed
 * fields, lock the client's logins out for good, scrub the audit text, write
 * one audit row, delete no business row, and leave invoices, payments,
 * quotes, contracts, projects and every other client byte-identical.
 */
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { WORK_DIR } from "./env"
import { api, createClient, createUser, login, one, PASSWORD, q, resetDb, sql, tokenHash } from "./helpers"

const OVERRIDES = path.join(WORK_DIR, "overrides.json")
const switchOn = () => fs.writeFileSync(OVERRIDES, JSON.stringify({ CLIENT_ANONYMISE_ENABLED: true }))

type Problem = { reason: string; message: string }
type Preview = { id: number; company: string; placeholder: string; logins: number; source_enquiry: boolean; other_enquiries: number; problems: Problem[]; kept: string[]; error?: string }
type Reply = { anonymised?: boolean; id?: number; logins?: number; sessions?: number; magic_links?: number; password_resets?: number; enquiry?: number; feedback?: number; booking_events?: number; audit_scrubbed?: number; error?: string; reasons?: string[] }

const preview = (token: string | undefined, id: number | string) => api<Preview>(`privacy.php?action=anonymise_preview&id=${id}`, { token })
const anonymise = (token: string | undefined, body: unknown) => api<Reply>("privacy.php?action=anonymise_client", { token, body })

/** Tables the tool must never write, whatever happens. */
const KEPT_TABLES = ["invoices", "invoice_items", "payment_events", "proposals", "proposal_items", "contracts", "projects", "tasks",
  "tickets", "ticket_replies", "comm_threads", "comm_messages", "files", "bookings", "time_entries"]
/**
 * Every table it could touch. auth_tokens is compared without last_seen_at,
 * which every authenticated request touches, refused or not.
 */
const ALL_TABLES = [...KEPT_TABLES, "clients", "users", "enquiries", "magic_links", "password_resets", "client_feedback", "booking_events", "audit_log", "auth_tokens"]
const checksums = (tables: string[]) => tables.map((t) => t === "auth_tokens"
  ? `auth_tokens=${JSON.stringify(sql("SELECT id, user_id, token, expires_at FROM auth_tokens ORDER BY id"))}`
  : `${t}=${one(`SELECT COUNT(*) FROM ${t}`)}:${sql(`CHECKSUM TABLE ${t}`)[0][1]}`).join(" ")

function magicLink(userId: number): string {
  const token = crypto.randomBytes(32).toString("hex")
  sql(`INSERT INTO magic_links (user_id, token, expires_at) VALUES (${userId}, ${q(tokenHash(token))}, NOW() + INTERVAL 15 MINUTE)`)
  return token
}

/** A former client with finished business everywhere, two portal logins and audit history. */
function seedClient(tag: string, domain: string) {
  sql(`INSERT INTO enquiries (name, email, company, message, status, ip) VALUES (${q(`${tag} Person`)}, ${q(`boss@${domain}`)}, ${q(`${tag} Ltd`)}, 'We need a site', 'won', '198.51.100.7')`)
  const enquiryId = Number(one("SELECT MAX(id) FROM enquiries"))
  sql(`INSERT INTO clients (company, contact_name, email, phone, notes, tag, source_lead_id)
       VALUES (${q(`${tag} Ltd`)}, ${q(`${tag} Person`)}, ${q(`boss@${domain}`)}, '07700 900111', 'Prefers calls after 4', 'one-off', ${enquiryId})`)
  const cid = Number(one("SELECT MAX(id) FROM clients"))
  const boss = createUser({ email: `boss@${domain}`, role: "client", clientId: cid })
  const staffer = createUser({ email: `team@${domain}`, role: "client", clientId: cid, totpSecret: "JBSWY3DPEHPK3PXP" })
  sql(`INSERT INTO projects (client_id, name, status) VALUES (${cid}, ${q(`${tag} site`)}, 'launched')`)
  const projectId = Number(one("SELECT MAX(id) FROM projects"))
  sql(`INSERT INTO tasks (project_id, title, status) VALUES (${projectId}, 'Launch', 'done')`)
  sql(`INSERT INTO invoices (number, client_id, project_id, status, issued_at, paid_at) VALUES (${q(`GK-${tag}`)}, ${cid}, ${projectId}, 'paid', '2026-03-01', '2026-03-10 10:00:00')`)
  const invoiceId = Number(one("SELECT MAX(id) FROM invoices"))
  sql(`INSERT INTO invoice_items (invoice_id, description, qty, unit_price) VALUES (${invoiceId}, 'Build', 1, 1500)`)
  sql(`INSERT INTO payment_events (provider, event_id, invoice_id, amount_minor, currency, outcome) VALUES ('stripe', ${q(`evt_${tag}`)}, ${invoiceId}, 150000, 'GBP', 'marked_paid')`)
  sql(`INSERT INTO proposals (client_id, title, status, project_id) VALUES (${cid}, ${q(`${tag} quote`)}, 'accepted', ${projectId})`)
  const proposalId = Number(one("SELECT MAX(id) FROM proposals"))
  sql(`INSERT INTO proposal_items (proposal_id, description, qty, unit_price) VALUES (${proposalId}, 'Build', 1, 1500)`)
  sql(`INSERT INTO contracts (client_id, project_id, title, status, signer_name, signer_email, signed_name, signed_ip, signed_at)
       VALUES (${cid}, ${projectId}, 'Agreement', 'signed', ${q(`${tag} Person`)}, ${q(`boss@${domain}`)}, ${q(`${tag} Person`)}, '198.51.100.8', NOW())`)
  sql(`INSERT INTO tickets (client_id, subject, body, status) VALUES (${cid}, 'Change the footer', 'Please change it', 'resolved')`)
  const ticketId = Number(one("SELECT MAX(id) FROM tickets"))
  sql(`INSERT INTO ticket_replies (ticket_id, user_id, body) VALUES (${ticketId}, ${boss}, 'Thanks, all good')`)
  sql(`INSERT INTO client_feedback (client_id, project_id, source, rating, went_well, attribution, may_publish)
       VALUES (${cid}, ${projectId}, 'portal', 5, 'Great work', ${q(`${tag} Person, director`)}, 1)`)
  sql(`INSERT INTO comm_threads (subject, client_id) VALUES (${q(`${tag} kickoff`)}, ${cid})`)
  const threadId = Number(one("SELECT MAX(id) FROM comm_threads"))
  sql(`INSERT INTO comm_messages (thread_id, user_id, direction, body) VALUES (${threadId}, ${boss}, 'in', 'See you Monday')`)
  sql(`INSERT INTO files (client_id, project_id, name, \`stored\`) VALUES (${cid}, ${projectId}, 'brief.pdf', ${q(`${tag}.pdf`)})`)
  sql(`INSERT INTO bookings (client_id, starts_at, timezone, status, location) VALUES (${cid}, '2026-02-01 10:00:00', 'Europe/London', 'completed', '07700 900111')`)
  const bookingId = Number(one("SELECT MAX(id) FROM bookings"))
  sql(`INSERT INTO booking_events (booking_id, kind, to_status, notify_to) VALUES (${bookingId}, 'created', 'requested', ${q(`Boss@${domain}`)}), (${bookingId}, 'status', 'completed', 'someone@else.test')`)
  sql(`INSERT INTO password_resets (user_id, token, expires_at) VALUES (${staffer}, ${q(tokenHash(`reset-${tag}`))}, NOW() + INTERVAL 1 HOUR)`)
  sql(`INSERT INTO audit_log (user_id, action, detail, ip) VALUES
       (NULL, 'enquiry_submit', ${q(`boss@${domain}`)}, '198.51.100.7'),
       (NULL, 'mail_send', ${q(`to boss@${domain}: Hello ${tag} Person, your invoice`)}, '203.0.113.1'),
       (${staffer}, 'login', ${q(`team@${domain}`)}, '203.0.113.2'),
       (NULL, 'mail_send', ${q(`to boss@${domain}.uk: a different address`)}, '203.0.113.3')`)
  return { cid, enquiryId, boss, staffer, ticketId, bookingId, company: `${tag} Ltd`, domain }
}

type Seed = ReturnType<typeof seedClient>

/** Every column of the rows that belong to the other client, so a change to it shows up. */
function otherClientRows(o: Seed): string {
  return JSON.stringify([
    sql(`SELECT * FROM clients WHERE id = ${o.cid}`),
    sql(`SELECT * FROM users WHERE client_id = ${o.cid} ORDER BY id`),
    sql(`SELECT * FROM enquiries WHERE id = ${o.enquiryId}`),
    sql(`SELECT * FROM auth_tokens WHERE user_id IN (${o.boss}, ${o.staffer}) ORDER BY id`),
    sql(`SELECT * FROM password_resets WHERE user_id IN (${o.boss}, ${o.staffer}) ORDER BY id`),
    sql(`SELECT * FROM client_feedback WHERE client_id = ${o.cid}`),
    sql(`SELECT * FROM booking_events WHERE booking_id = ${o.bookingId} ORDER BY id`),
    sql(`SELECT * FROM audit_log WHERE detail LIKE '%${o.domain}%' ORDER BY id`),
  ])
}

describe("client anonymisation", () => {
  let owner: string
  let admin: string
  let a: Seed
  let b: Seed
  let bossSession: string

  beforeEach(async () => {
    fs.rmSync(OVERRIDES, { force: true })
    resetDb()
    createUser({ email: "owner@example.test", role: "super_admin" })
    createUser({ email: "admin@example.test", role: "admin" })
    owner = await login("owner@example.test")
    admin = await login("admin@example.test")
    a = seedClient("Acme", "acme.test")
    b = seedClient("Other", "other.test")
    bossSession = await login("boss@acme.test")
    await login("boss@other.test")
    // A second enquiry from Acme's address: a prospect's record, never changed here.
    sql(`INSERT INTO enquiries (name, email, message, status) VALUES ('Acme Person', 'boss@acme.test', 'Second idea', 'new')`)
  })

  afterEach(() => {
    fs.rmSync(OVERRIDES, { force: true })
  })

  describe("switched off (the default)", () => {
    it("answers 404 to both routes for every caller and changes nothing", async () => {
      const before = checksums(ALL_TABLES)
      for (const token of [owner, admin, bossSession, undefined]) {
        expect((await preview(token, a.cid)).status).toBe(404)
        expect((await anonymise(token, { id: a.cid, confirm: a.company })).status).toBe(404)
      }
      expect(checksums(ALL_TABLES)).toBe(before)
      expect(Number(one("SELECT COUNT(*) FROM audit_log WHERE action = 'client_anonymise'"))).toBe(0)
    })

    it("stays off for anything but the boolean true", async () => {
      for (const value of [1, "true", "yes"]) {
        fs.writeFileSync(OVERRIDES, JSON.stringify({ CLIENT_ANONYMISE_ENABLED: value }))
        expect((await anonymise(owner, { id: a.cid, confirm: a.company })).status).toBe(404)
      }
      expect(one(`SELECT company FROM clients WHERE id = ${a.cid}`)).toBe("Acme Ltd")
    })
  })

  describe("switched on", () => {
    beforeEach(switchOn)

    it("refuses every role but super admin, changing nothing", async () => {
      const before = checksums(ALL_TABLES)
      for (const token of [admin, bossSession]) {
        expect((await preview(token, a.cid)).status).toBe(403)
        expect((await anonymise(token, { id: a.cid, confirm: a.company })).status).toBe(403)
      }
      expect((await anonymise(undefined, { id: a.cid, confirm: a.company })).status).toBe(401)
      expect(checksums(ALL_TABLES)).toBe(before)
    })

    it("refuses invalid input and a wrong confirmation, changing nothing", async () => {
      const before = checksums(ALL_TABLES)
      expect((await preview(owner, "abc")).status).toBe(400)
      expect((await preview(owner, 99999)).status).toBe(404)
      expect((await anonymise(owner, { id: 0, confirm: a.company })).status).toBe(400)
      expect((await anonymise(owner, { id: a.cid })).status).toBe(400)
      expect((await anonymise(owner, { id: a.cid, confirm: "   " })).status).toBe(400)
      expect((await anonymise(owner, { id: a.cid, confirm: a.company, keep_company: "yes" })).status).toBe(400)
      expect((await anonymise(owner, { id: 99999, confirm: a.company })).status).toBe(404)
      const wrong = await anonymise(owner, { id: a.cid, confirm: "Acme" })
      expect(wrong.status).toBe(400)
      expect(wrong.json.error).toMatch(/does not match/)
      // Another client's name never confirms this one.
      expect((await anonymise(owner, { id: a.cid, confirm: b.company })).status).toBe(400)
      expect(checksums(ALL_TABLES)).toBe(before)
    })

    it("previews what would happen without changing anything", async () => {
      const before = checksums(ALL_TABLES)
      const p = await preview(owner, a.cid)
      expect(p.status).toBe(200)
      expect(p.json).toMatchObject({ id: a.cid, company: "Acme Ltd", placeholder: `Former client #${a.cid}`, logins: 2, source_enquiry: true, other_enquiries: 1, problems: [] })
      expect(p.json.kept.some((k) => /Invoices and payments/.test(k))).toBe(true)
      expect(checksums(ALL_TABLES)).toBe(before)
    })

    const refusals: Array<[string, (s: Seed) => void]> = [
      ["unpaid_invoices", (s) => sql(`INSERT INTO invoices (client_id, status, issued_at) VALUES (${s.cid}, 'sent', CURRENT_DATE)`)],
      ["unpaid_invoices", (s) => sql(`INSERT INTO invoices (client_id, status, issued_at) VALUES (${s.cid}, 'draft', CURRENT_DATE)`)],
      ["open_projects", (s) => sql(`INSERT INTO projects (client_id, name, status) VALUES (${s.cid}, 'Phase 2', 'on_hold')`)],
      ["open_tickets", (s) => sql(`INSERT INTO tickets (client_id, subject, status) VALUES (${s.cid}, 'Still broken', 'in_progress')`)],
      ["active_contract", (s) => sql(`INSERT INTO contracts (client_id, title, status) VALUES (${s.cid}, 'Care plan', 'sent')`)],
      ["open_quote", (s) => sql(`INSERT INTO proposals (client_id, title, status) VALUES (${s.cid}, 'Phase 2 quote', 'sent')`)],
      ["retainer", (s) => sql(`UPDATE clients SET tag = 'retainer', retainer_amount = 49 WHERE id = ${s.cid}`)],
      ["upcoming_call", (s) => sql(`INSERT INTO bookings (client_id, starts_at, timezone, status) VALUES (${s.cid}, UTC_TIMESTAMP() + INTERVAL 2 DAY, 'Europe/London', 'confirmed')`)],
      ["staff_login", (s) => sql(`UPDATE users SET role = 'employee' WHERE id = ${s.staffer}`)],
      ["shared_address", (s) => sql(`INSERT INTO clients (company, email) VALUES ('Sister Co', ${q(`BOSS@${s.domain}`)})`)],
      ["shared_address", (s) => sql(`INSERT INTO contracts (client_id, title, status, signer_email) VALUES (${b.cid}, 'Guarantor', 'signed', ${q(`team@${s.domain}`)})`)],
      ["shared_enquiry", (s) => sql(`INSERT INTO clients (company, source_lead_id) VALUES ('Spin-off Ltd', ${s.enquiryId})`)],
    ]
    for (const [reason, arrange] of refusals) {
      it(`refuses with 409 (${reason}) and changes nothing`, async () => {
        arrange(a)
        const p = await preview(owner, a.cid)
        expect(p.json.problems.map((x) => x.reason)).toContain(reason)
        const before = checksums(ALL_TABLES)
        const r = await anonymise(owner, { id: a.cid, confirm: a.company })
        expect(r.status).toBe(409)
        expect(r.json.reasons).toContain(reason)
        expect(checksums(ALL_TABLES)).toBe(before)
      })
    }

    it("treats deleted, finished and void records as no reason to refuse", async () => {
      sql(`INSERT INTO invoices (client_id, status, issued_at, deleted_at) VALUES (${a.cid}, 'sent', CURRENT_DATE, NOW())`)
      sql(`INSERT INTO contracts (client_id, title, status) VALUES (${a.cid}, 'Old NDA', 'void')`)
      sql(`INSERT INTO proposals (client_id, title, status) VALUES (${a.cid}, 'Old quote', 'declined')`)
      sql(`INSERT INTO bookings (client_id, starts_at, timezone, status) VALUES (${a.cid}, UTC_TIMESTAMP() + INTERVAL 2 DAY, 'Europe/London', 'cancelled')`)
      expect((await preview(owner, a.cid)).json.problems).toEqual([])
    })

    it("anonymises exactly the agreed fields and keeps the business records byte-identical", async () => {
      const kept = checksums(KEPT_TABLES)
      const other = otherClientRows(b)
      const rowCounts = ["clients", "users", "enquiries", "client_feedback", "booking_events"].map((t) => one(`SELECT COUNT(*) FROM ${t}`))
      const auditCount = Number(one("SELECT COUNT(*) FROM audit_log"))
      const enquiryBefore = sql(`SELECT message, status, source FROM enquiries WHERE id = ${a.enquiryId}`)

      const r = await anonymise(owner, { id: a.cid, confirm: "  acme   LTD " })
      expect(r.status).toBe(200)
      expect(r.json).toMatchObject({ anonymised: true, id: a.cid, logins: 2, sessions: 1, magic_links: 0, password_resets: 1, enquiry: 1, feedback: 1, booking_events: 1 })

      const placeholder = `Former client #${a.cid}`
      expect(sql(`SELECT company, IFNULL(contact_name, 'NULL'), IFNULL(email, 'NULL'), IFNULL(phone, 'NULL'), IFNULL(notes, 'NULL'), tag, source_lead_id FROM clients WHERE id = ${a.cid}`)[0])
        .toEqual([placeholder, "NULL", "NULL", "NULL", "NULL", "one-off", String(a.enquiryId)])
      expect(sql(`SELECT id, name, email, password_hash, status, IFNULL(totp_secret, 'NULL'), totp_enabled, IFNULL(totp_recovery, 'NULL'), role, client_id FROM users WHERE client_id = ${a.cid} ORDER BY id`))
        .toEqual([
          [String(a.boss), placeholder, `anonymised-${a.cid}-1@invalid`, "!anonymised", "suspended", "NULL", "0", "NULL", "client", String(a.cid)],
          [String(a.staffer), placeholder, `anonymised-${a.cid}-2@invalid`, "!anonymised", "suspended", "NULL", "0", "NULL", "client", String(a.cid)],
        ])
      expect(sql(`SELECT name, email, IFNULL(company, 'NULL'), IFNULL(ip, 'NULL') FROM enquiries WHERE id = ${a.enquiryId}`)[0])
        .toEqual([placeholder, `anonymised-${a.cid}-enquiry@invalid`, "NULL", "NULL"])
      expect(sql(`SELECT message, status, source FROM enquiries WHERE id = ${a.enquiryId}`)).toEqual(enquiryBefore)
      // The prospect's second enquiry from the same address is not changed.
      expect(one("SELECT COUNT(*) FROM enquiries WHERE email = 'boss@acme.test' AND message = 'Second idea'")).toBe("1")
      expect(sql(`SELECT IFNULL(attribution, 'NULL'), went_well, rating, may_publish FROM client_feedback WHERE client_id = ${a.cid}`)[0]).toEqual(["NULL", "Great work", "5", "1"])
      expect(sql(`SELECT IFNULL(notify_to, 'NULL') FROM booking_events WHERE booking_id = ${a.bookingId} ORDER BY id`)).toEqual([["NULL"], ["someone@else.test"]])

      // Sessions, links and resets of these logins are gone; nothing else is deleted.
      expect(one(`SELECT COUNT(*) FROM auth_tokens WHERE user_id IN (${a.boss}, ${a.staffer})`)).toBe("0")
      expect(one(`SELECT COUNT(*) FROM password_resets WHERE user_id IN (${a.boss}, ${a.staffer})`)).toBe("0")
      expect(["clients", "users", "enquiries", "client_feedback", "booking_events"].map((t) => one(`SELECT COUNT(*) FROM ${t}`))).toEqual(rowCounts)
      expect(checksums(KEPT_TABLES)).toBe(kept)
      expect(otherClientRows(b)).toBe(other)

      // Audit: the addresses and names are gone, a longer address is not touched, one new row by id only.
      expect(one("SELECT COUNT(*) FROM audit_log WHERE detail LIKE '%boss@acme.test%' AND detail NOT LIKE '%boss@acme.test.uk%'")).toBe("0")
      expect(one("SELECT COUNT(*) FROM audit_log WHERE detail LIKE '%team@acme.test%' OR detail LIKE '%Acme Person%'")).toBe("0")
      expect(one("SELECT detail FROM audit_log WHERE detail LIKE 'to [erased]%'")).toBe("to [erased]: Hello [erased], your invoice")
      expect(one("SELECT IFNULL(ip, 'NULL') FROM audit_log WHERE action = 'enquiry_submit' AND detail = '[erased]'")).toBe("NULL")
      expect(one("SELECT COUNT(*) FROM audit_log WHERE detail = 'to boss@acme.test.uk: a different address'")).toBe("1")
      expect(Number(one("SELECT COUNT(*) FROM audit_log"))).toBe(auditCount + 1)
      expect(sql("SELECT action, detail FROM audit_log WHERE action = 'client_anonymise'")).toEqual([["client_anonymise", `#${a.cid}`]])

      // The ticket is kept, and its reply now shows the former client as the author.
      const ticket = await api<{ subject: string; body: string; replies: Array<{ body: string; author: string }> }>(`support.php?id=${a.ticketId}`, { token: owner })
      expect(ticket.json.subject).toBe("Change the footer")
      expect(ticket.json.replies).toEqual([expect.objectContaining({ body: "Thanks, all good", author: placeholder })])
    })

    it("keeps the company name only when asked", async () => {
      const r = await anonymise(owner, { id: a.cid, confirm: a.company, keep_company: true })
      expect(r.status).toBe(200)
      expect(sql(`SELECT company, IFNULL(email, 'NULL') FROM clients WHERE id = ${a.cid}`)[0]).toEqual(["Acme Ltd", "NULL"])
      expect(one(`SELECT company FROM enquiries WHERE id = ${a.enquiryId}`)).toBe("Acme Ltd")
    })

    it("locks the logins out: old session, password and magic link all fail", async () => {
      const link = magicLink(a.boss)
      expect((await anonymise(owner, { id: a.cid, confirm: a.company })).status).toBe(200)
      expect((await api("portal.php", { token: bossSession })).status).toBe(401)
      for (const email of ["boss@acme.test", "team@acme.test", `anonymised-${a.cid}-1@invalid`]) {
        const r = await api<{ token?: string }>("auth.php?action=login", { body: { email, password: PASSWORD } })
        expect(r.status).toBe(401)
        expect(r.json.token).toBeUndefined()
      }
      const consumed = await api<{ token?: string }>("auth.php?action=magic_consume", { body: { token: link } })
      expect(consumed.status).toBe(400)
      expect(consumed.json.token).toBeUndefined()
      await api("auth.php?action=magic_request", { body: { email: `anonymised-${a.cid}-1@invalid` } })
      expect(one(`SELECT COUNT(*) FROM magic_links WHERE user_id = ${a.boss}`)).toBe("0")
      // The other client's login still works.
      expect(await login("boss@other.test")).toMatch(/\w+/)
    })

    it("does it once: a second request is refused and a concurrent pair writes one audit row", async () => {
      const [x, y] = await Promise.all([
        anonymise(owner, { id: a.cid, confirm: a.company }),
        anonymise(owner, { id: a.cid, confirm: a.company }),
      ])
      expect([x.status, y.status].filter((s) => s === 200)).toHaveLength(1)
      expect([x.status, y.status].sort()).toEqual([200, 400])
      const after = checksums(ALL_TABLES)
      const again = await anonymise(owner, { id: a.cid, confirm: `Former client #${a.cid}` })
      expect(again.status).toBe(409)
      expect(again.json.reasons).toContain("already")
      expect(checksums(ALL_TABLES)).toBe(after)
      expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'client_anonymise'")).toBe("1")
    })
  })
})
