/**
 * privacy.php: the subject access export and the retention dry run
 * (docs/PRIVACY-READINESS.md sections 6 and 7, K-062), plus the command-line
 * cron.php job=retention_report. The export must gather one subject's rows
 * across tables, leave out every secret and every other client's rows, be
 * admin only and audited. The report must count, and never change, anything.
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { WORK_DIR } from "./env"
import { api, createClient, createUser, login, one, q, resetDb, sql, tokenHash } from "./helpers"

/** Config overrides read by the synthetic config.php (tests/server/global-setup.ts). */
const OVERRIDES = path.join(WORK_DIR, "overrides.json")
function setOverrides(values: Record<string, unknown>): void {
  fs.writeFileSync(OVERRIDES, JSON.stringify(values))
}
const PERIOD_KEYS = [
  "RETENTION_ENQUIRY_MONTHS", "RETENTION_CLIENT_MONTHS", "RETENTION_INVOICE_MONTHS", "RETENTION_AUDIT_MONTHS",
  "RETENTION_SUPPORT_MONTHS", "RETENTION_COMMS_MONTHS", "RETENTION_STAFF_MONTHS", "RETENTION_CERTIFICATE_MONTHS",
  "RETENTION_DELETED_FILE_DAYS",
]

type Export = {
  about: { subject: Record<string, unknown>; excluded: string[]; unavailable: string[] }
  data: Record<string, Array<Record<string, unknown>> | Record<string, unknown> | number[]>
}
type Rule = { key: string; status: string; period: number | null; config_key: string; counts: Record<string, number | null> | null }
type Report = { dry_run: boolean; rules: Rule[] }

const TOTP_SECRET = "JBSWY3DPEHPK3PXPSYNTHETIC"

/** A client with a row in every table the export covers. Returns the ids the tests look for. */
function seedClient(company: string, email: string, tag: string) {
  sql(`INSERT INTO enquiries (name, email, message, status, ip) VALUES (${q(`${tag} Person`)}, ${q(email)}, ${q(`${tag} enquiry message`)}, 'won', '198.51.100.7')`)
  const enquiryId = Number(one("SELECT MAX(id) FROM enquiries"))
  const clientId = createClient(company, email)
  sql(`UPDATE clients SET source_lead_id = ${enquiryId}, notes = ${q(`${tag} staff note`)} WHERE id = ${clientId}`)
  const userId = createUser({ email: `portal.${email}`, role: "client", clientId, totpSecret: TOTP_SECRET })
  sql(`UPDATE users SET totp_recovery = '["$2y$10$syntheticrecoveryhash"]' WHERE id = ${userId}`)

  sql(`INSERT INTO bookings (enquiry_id, starts_at, timezone, notes) VALUES (${enquiryId}, '2026-11-02 10:00:00', 'Europe/London', ${q(`${tag} call note`)})`)
  const bookingId = Number(one("SELECT MAX(id) FROM bookings"))
  sql(`INSERT INTO booking_events (booking_id, kind, to_status) VALUES (${bookingId}, 'created', 'requested')`)

  sql(`INSERT INTO projects (client_id, name) VALUES (${clientId}, ${q(`${tag} website`)})`)
  const projectId = Number(one("SELECT MAX(id) FROM projects"))
  sql(`INSERT INTO tasks (project_id, title) VALUES (${projectId}, ${q(`${tag} task`)})`)
  sql(`INSERT INTO project_assets (project_id, label, client_note) VALUES (${projectId}, ${q(`${tag} logo`)}, ${q(`${tag} supplied by email`)})`)

  sql(`INSERT INTO proposals (client_id, title, share_token) VALUES (${clientId}, ${q(`${tag} quote`)}, ${q(`${tag}sharetoken`.padEnd(40, "x").slice(0, 40))})`)
  const proposalId = Number(one("SELECT MAX(id) FROM proposals"))
  sql(`INSERT INTO proposal_items (proposal_id, description, qty, unit_price) VALUES (${proposalId}, ${q(`${tag} design`)}, 1, 900)`)

  sql(`INSERT INTO invoices (client_id, status, issued_at, notes) VALUES (${clientId}, 'paid', CURRENT_DATE, ${q(`${tag} invoice`)})`)
  const invoiceId = Number(one("SELECT MAX(id) FROM invoices"))
  sql(`INSERT INTO invoice_items (invoice_id, description, qty, unit_price) VALUES (${invoiceId}, ${q(`${tag} build`)}, 1, 500)`)
  sql(`INSERT INTO payment_events (provider, event_id, invoice_id, amount_minor, currency, outcome) VALUES ('stripe', ${q(`evt_${tag}`)}, ${invoiceId}, 50000, 'GBP', 'marked_paid')`)

  sql(`INSERT INTO tickets (client_id, subject, body) VALUES (${clientId}, ${q(`${tag} ticket`)}, 'Help please')`)
  const ticketId = Number(one("SELECT MAX(id) FROM tickets"))
  sql(`INSERT INTO ticket_replies (ticket_id, user_id, body) VALUES (${ticketId}, ${userId}, ${q(`${tag} reply`)})`)
  sql(`INSERT INTO client_feedback (client_id, source, went_well, owner_note) VALUES (${clientId}, 'portal', ${q(`${tag} went well`)}, ${q(`${tag} owner note`)})`)
  sql(`INSERT INTO contracts (client_id, title, signer_email, signed_ip) VALUES (${clientId}, ${q(`${tag} agreement`)}, ${q(email)}, '203.0.113.9')`)
  sql(`INSERT INTO files (client_id, project_id, name, \`stored\`, share_token, size) VALUES (${clientId}, ${projectId}, ${q(`${tag}-brief.pdf`)}, ${q(`${tag}-ondisk-9f8e7d.bin`)}, ${q(`${tag}filetoken`.padEnd(40, "y").slice(0, 40))}, 1234)`)
  sql(`INSERT INTO comm_threads (subject, client_id) VALUES (${q(`${tag} thread`)}, ${clientId})`)
  const threadId = Number(one("SELECT MAX(id) FROM comm_threads"))
  sql(`INSERT INTO comm_messages (thread_id, direction, body) VALUES (${threadId}, 'in', ${q(`${tag} message body`)})`)

  sql(`INSERT INTO audit_log (user_id, action, detail) VALUES (NULL, 'client_update', ${q(`updated ${email}`)}), (${userId}, 'portal_login', ${q(`${tag} signed in`)})`)
  return { clientId, userId, enquiryId, projectId, ticketId }
}

const rows = (e: Export, key: string) => e.data[key] as Array<Record<string, unknown>>

/** Row counts and checksums of every table the report reads. */
function snapshot(): string {
  const tables = ["enquiries", "clients", "projects", "invoices", "payment_events", "audit_log", "tickets", "client_feedback",
    "comm_threads", "comm_messages", "users", "leave_entries", "certificates", "files"]
  return tables.map((t) => `${t}=${one(`SELECT COUNT(*) FROM ${t}`)}:${sql(`CHECKSUM TABLE ${t}`)[0][1]}`).join(" ")
}

describe("privacy export", () => {
  let admin: string
  let adminId: number
  let a: ReturnType<typeof seedClient>
  let b: ReturnType<typeof seedClient>
  let portalToken: string

  beforeEach(async () => {
    resetDb()
    adminId = createUser({ email: "admin@example.test", role: "admin" })
    admin = await login("admin@example.test")
    a = seedClient("Alpha Ltd", "alpha@example.test", "Alpha")
    b = seedClient("Other Co", "other@example.test", "Other")
    // An address that contains Alpha's as a substring belongs to someone else.
    sql(`INSERT INTO audit_log (action, detail) VALUES ('client_update', 'updated xalpha@example.test'), ('client_update', 'updated alpha@example.test.uk')`)
    // Logging the portal user in gives a real session row with a hashed token.
    sql(`UPDATE users SET totp_enabled = 0 WHERE id = ${a.userId}`)
    portalToken = await login("portal.alpha@example.test")
    sql(`UPDATE users SET totp_enabled = 1 WHERE id = ${a.userId}`)
  })

  it("streams a no-store JSON attachment with the client's rows from every table", async () => {
    const r = await api<Export>(`privacy.php?action=export&client_id=${a.clientId}`, { token: admin })
    expect(r.status).toBe(200)
    expect(r.headers.get("content-type")).toMatch(/^application\/json/)
    expect(r.headers.get("content-disposition")).toMatch(new RegExp(`^attachment; filename="gakinz-data-export-client-${a.clientId}-`))
    expect(r.headers.get("cache-control")).toBe("private, no-store")
    expect(r.headers.get("x-content-type-options")).toBe("nosniff")

    const e = r.json
    expect(e.about.subject).toEqual({ type: "client", client_id: a.clientId })
    expect(e.about.unavailable).toEqual([])
    expect((e.data.client as Record<string, unknown>).notes).toBe("Alpha staff note")
    expect(rows(e, "users").map((u) => u.email)).toEqual(["portal.alpha@example.test"])
    expect(rows(e, "sessions")).toHaveLength(1)
    expect(rows(e, "enquiries").map((x) => x.id)).toEqual([a.enquiryId])
    expect(rows(e, "bookings")).toHaveLength(1)
    expect(rows(e, "booking_events")).toHaveLength(1)
    expect(rows(e, "projects").map((x) => x.id)).toEqual([a.projectId])
    expect(rows(e, "tasks").map((x) => x.title)).toEqual(["Alpha task"])
    expect(rows(e, "project_assets").map((x) => x.client_note)).toEqual(["Alpha supplied by email"])
    expect(rows(e, "proposals").map((x) => x.title)).toEqual(["Alpha quote"])
    expect(rows(e, "proposal_items")).toHaveLength(1)
    expect(rows(e, "invoices").map((x) => x.notes)).toEqual(["Alpha invoice"])
    expect(rows(e, "invoice_items")).toHaveLength(1)
    expect(rows(e, "payment_events").map((x) => x.event_id)).toEqual(["evt_Alpha"])
    expect(rows(e, "tickets").map((x) => x.id)).toEqual([a.ticketId])
    expect(rows(e, "ticket_replies").map((x) => x.body)).toEqual(["Alpha reply"])
    expect(rows(e, "client_feedback").map((x) => x.owner_note)).toEqual(["Alpha owner note"])
    expect(rows(e, "contracts").map((x) => x.signer_email)).toEqual(["alpha@example.test"])
    expect(rows(e, "files").map((x) => x.name)).toEqual(["Alpha-brief.pdf"])
    expect(rows(e, "comm_messages").map((x) => x.body)).toEqual(["Alpha message body"])
    const auditDetails = rows(e, "audit_log").map((x) => x.detail)
    expect(auditDetails).toContain("updated alpha@example.test")
    expect(auditDetails).toContain("Alpha signed in")
    expect(auditDetails).not.toContain("updated xalpha@example.test")
    expect(auditDetails).not.toContain("updated alpha@example.test.uk")
  })

  it("leaves out password, token and 2FA secrets, share tokens, stored names and the other client", async () => {
    const r = await api<Export>(`privacy.php?action=export&client_id=${a.clientId}`, { token: admin })
    const text = JSON.stringify(r.json)
    const hash = one(`SELECT password_hash FROM users WHERE id = ${a.userId}`)!
    const storedSession = one(`SELECT token FROM auth_tokens WHERE user_id = ${a.userId}`)!
    expect(storedSession).toBe(tokenHash(portalToken))

    for (const secret of [hash, "$2y$", storedSession, portalToken, TOTP_SECRET, "syntheticrecoveryhash", "Alphasharetoken", "Alphafiletoken", "Alpha-ondisk"]) {
      expect(text).not.toContain(secret)
    }
    const user = rows(r.json, "users")[0]
    for (const k of ["password_hash", "totp_secret", "totp_recovery", "totp_last_step"]) expect(user).not.toHaveProperty(k)
    expect(rows(r.json, "sessions")[0]).not.toHaveProperty("token")
    expect(rows(r.json, "proposals")[0]).not.toHaveProperty("share_token")
    expect(rows(r.json, "files")[0]).not.toHaveProperty("stored")

    for (const other of ["Other", "other@example.test", `"client_id":${b.clientId}`]) {
      expect(text).not.toContain(other)
    }
    expect(r.json.about.excluded.join(" ")).toMatch(/Password hashes/)
  })

  it("says whether each file was shared to the portal, and still exports files before SQL 18", async () => {
    sql(`UPDATE files SET client_visible = 1, shared_at = '2026-10-19 09:30:00' WHERE client_id = ${a.clientId}`)
    const shared = await api<Export>(`privacy.php?action=export&client_id=${a.clientId}`, { token: admin })
    expect(shared.status).toBe(200)
    expect(rows(shared.json, "files")[0]).toMatchObject({ name: "Alpha-brief.pdf", client_visible: 1, shared_at: "2026-10-19 09:30:00" })

    // Before SQL 18 the columns are absent: the files section falls back, not the export.
    sql("ALTER TABLE files DROP COLUMN shared_at, DROP COLUMN client_visible")
    try {
      const before = await api<Export>(`privacy.php?action=export&client_id=${a.clientId}`, { token: admin })
      expect(before.status).toBe(200)
      const [file] = rows(before.json, "files")
      expect(file).toMatchObject({ name: "Alpha-brief.pdf" })
      expect(file).not.toHaveProperty("client_visible")
      expect(file).not.toHaveProperty("shared_at")
    } finally {
      sql("ALTER TABLE files ADD COLUMN client_visible TINYINT(1) NOT NULL DEFAULT 0 AFTER expires_at, " +
        "ADD COLUMN shared_at TIMESTAMP NULL DEFAULT NULL AFTER client_visible")
    }
  })

  it("refuses every role but super_admin and admin, and an unknown or invalid subject", async () => {
    createUser({ email: "manager@example.test", role: "manager" })
    createUser({ email: "editor@example.test", role: "editor" })
    createUser({ email: "employee@example.test", role: "employee" })
    createUser({ email: "trainer@example.test", role: "trainer" })
    createUser({ email: "owner@example.test", role: "super_admin" })
    const path = `privacy.php?action=export&client_id=${a.clientId}`
    expect((await api(path)).status).toBe(401)
    for (const who of ["manager", "editor", "employee", "trainer"]) {
      expect((await api(path, { token: await login(`${who}@example.test`) })).status).toBe(403)
    }
    expect((await api(path, { token: portalToken })).status).toBe(403)
    expect((await api(path, { token: await login("owner@example.test") })).status).toBe(200)

    expect((await api("privacy.php?action=export&client_id=99999", { token: admin })).status).toBe(404)
    expect((await api("privacy.php?action=export&client_id=abc", { token: admin })).status).toBe(400)
    expect((await api(`privacy.php?action=export&client_id=${a.clientId}&enquiry_email=alpha@example.test`, { token: admin })).status).toBe(400)
    expect((await api("privacy.php?action=export", { token: admin })).status).toBe(400)
    expect((await api("privacy.php?action=export&enquiry_email=not-an-email", { token: admin })).status).toBe(400)
    expect((await api("privacy.php?action=export&enquiry_email=nobody@example.test", { token: admin })).status).toBe(404)
    expect((await api("privacy.php?action=export", { token: admin, body: {} })).status).toBe(405)
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'privacy_export'")).toBe("1")
  })

  it("includes audit rows that name the client, its logins or its enquiry by id or company, and no near miss", async () => {
    const C = a.clientId, U = a.userId, E = a.enquiryId
    const mine: Array<[string, string]> = [
      ["client_update", `#${C}`],
      ["lead_convert", `lead #${E} → client #${C}`],
      ["client_create", "Alpha Ltd"],
      ["user_status", `#${U} → suspended`],
      ["user_role", `#${U} → client`],
      ["lead_status", `#${E} → won`],
    ]
    const notMine: Array<[string, string]> = [
      ["client_update", `#${C}7`],
      ["lead_convert", `lead #9999 → client #${C}3`],
      ["client_create", "Alpha Ltd Two"],
      ["user_status", `#${U}8 → suspended`],
      ["lead_status", `#${E}6 → lost`],
      ["client_update", `#${b.clientId}`],
      ["session_revoke", `#${U}`],
    ]
    sql(`INSERT INTO audit_log (action, detail) VALUES ${[...mine, ...notMine].map(([act, d]) => `(${q(act)}, ${q(d)})`).join(", ")}`)

    const r = await api<Export>(`privacy.php?action=export&client_id=${C}`, { token: admin })
    const got = rows(r.json, "audit_log").map((x) => `${x.action} ${x.detail}`)
    for (const [act, d] of mine) expect(got).toContain(`${act} ${d}`)
    for (const [act, d] of notMine) expect(got).not.toContain(`${act} ${d}`)
  })

  it("drops the author and IP of an audit row someone else wrote, and keeps them on the subject's own rows", async () => {
    const C = a.clientId
    sql(`INSERT INTO audit_log (user_id, action, detail, ip) VALUES (${adminId}, 'client_update', ${q(`#${C}`)}, '192.0.2.44')`)
    sql(`INSERT INTO audit_log (user_id, action, detail, ip) VALUES (${a.userId}, 'portal_message', 'Alpha asked a question', '198.51.100.20')`)
    const r = await api<Export>(`privacy.php?action=export&client_id=${C}`, { token: admin })
    expect(r.status).toBe(200)
    const audit = rows(r.json, "audit_log")
    const staff = audit.find((x) => x.action === "client_update" && x.detail === `#${C}`)!
    expect(staff).toBeDefined()
    expect(staff.user_id).toBeNull()
    expect(staff.ip).toBeNull()
    expect(staff.created_at).toBeTruthy()
    const own = audit.find((x) => x.action === "portal_message")!
    expect(Number(own.user_id)).toBe(a.userId)
    expect(own.ip).toBe("198.51.100.20")
    // No staff id or staff IP anywhere in the audit section.
    expect(audit.some((x) => x.user_id !== null && Number(x.user_id) !== a.userId)).toBe(false)
    expect(JSON.stringify(audit)).not.toContain("192.0.2.44")
    expect(r.json.about.excluded.some((x) => /audit entries not written by the subject/.test(x))).toBe(true)
  })

  it("drops the author and IP of every audit row in an enquirer export, since an enquirer has no login", async () => {
    sql(`INSERT INTO audit_log (user_id, action, detail, ip) VALUES (${adminId}, 'lead_meta', 'noted alpha@example.test', '192.0.2.45')`)
    const r = await api<Export>(`privacy.php?action=export&enquiry_email=alpha%40example.test`, { token: admin })
    expect(r.status).toBe(200)
    const audit = rows(r.json, "audit_log")
    const row = audit.find((x) => x.detail === "noted alpha@example.test")!
    expect(row).toBeDefined()
    expect(row.user_id).toBeNull()
    expect(row.ip).toBeNull()
  })

  it("matches a client_create row by company only when no other client has that name", async () => {
    createClient("alpha ltd", "twin@example.test")
    sql("INSERT INTO audit_log (action, detail) VALUES ('client_create', 'Alpha Ltd')")
    const r = await api<Export>(`privacy.php?action=export&client_id=${a.clientId}`, { token: admin })
    expect(rows(r.json, "audit_log").map((x) => x.action)).not.toContain("client_create")
  })

  it("includes a conversation filed against one of the client's projects", async () => {
    sql(`INSERT INTO comm_threads (subject, project_id) VALUES ('Alpha project thread', ${a.projectId})`)
    sql(`INSERT INTO comm_threads (subject, project_id) VALUES ('Other project thread', (SELECT id FROM projects WHERE client_id = ${b.clientId}))`)
    const r = await api<Export>(`privacy.php?action=export&client_id=${a.clientId}`, { token: admin })
    expect(rows(r.json, "comm_threads").map((x) => x.subject)).toEqual(["Alpha thread", "Alpha project thread"])
  })

  it("audits who exported whom without copying the exported content", async () => {
    const before = Number(one("SELECT COUNT(*) FROM audit_log"))
    await api(`privacy.php?action=export&client_id=${a.clientId}`, { token: admin })
    expect(Number(one("SELECT COUNT(*) FROM audit_log"))).toBe(before + 1)
    const [row] = sql("SELECT user_id, detail FROM audit_log WHERE action = 'privacy_export'")
    expect(row).toEqual([String(adminId), `client #${a.clientId}`])
    // Nothing else changed: the same client still has the same rows.
    expect(one(`SELECT COUNT(*) FROM tickets WHERE client_id = ${a.clientId}`)).toBe("1")
  })

  it("exports an enquirer by email: their enquiries, calls and audit rows, and points at a matching client", async () => {
    sql(`INSERT INTO enquiries (name, email, message) VALUES ('Prospect', 'Prospect@Example.test', 'First'), ('Prospect', 'prospect@example.test', 'Second'), ('Else', 'else@example.test', 'Not theirs')`)
    const ids = sql("SELECT id FROM enquiries WHERE email LIKE 'prospect@%' ORDER BY id").map((r) => Number(r[0]))
    sql(`INSERT INTO bookings (enquiry_id, starts_at, timezone) VALUES (${ids[0]}, '2026-11-03 09:00:00', 'Europe/London')`)
    sql("INSERT INTO audit_log (action, detail) VALUES ('enquiry', 'from prospect@example.test'), ('enquiry', 'from else@example.test')")

    const r = await api<Export>("privacy.php?action=export&enquiry_email=PROSPECT@example.test", { token: admin })
    expect(r.status).toBe(200)
    expect(r.headers.get("content-disposition")).toMatch(/^attachment; filename="gakinz-data-export-enquiry-/)
    expect(rows(r.json, "enquiries").map((x) => x.id)).toEqual(ids)
    expect(rows(r.json, "bookings")).toHaveLength(1)
    expect(rows(r.json, "audit_log").map((x) => x.detail)).toEqual(["from prospect@example.test"])
    expect(r.json.data.matching_client_ids).toEqual([])
    expect(JSON.stringify(r.json)).not.toContain("else@example.test")

    const audit = one("SELECT detail FROM audit_log WHERE action = 'privacy_export'")
    expect(audit).toBe(`enquiry email: enquiries #${ids[0]}, #${ids[1]}`)

    // Alpha's own address finds its source enquiry and names the client, without its data.
    const alpha = await api<Export>("privacy.php?action=export&enquiry_email=alpha@example.test", { token: admin })
    expect(alpha.json.data.matching_client_ids).toEqual([a.clientId])
    expect(alpha.json.data).not.toHaveProperty("invoices")
  })
})

describe("retention dry run", () => {
  let owner: string
  afterEach(() => fs.rmSync(OVERRIDES, { force: true }))

  beforeEach(async () => {
    resetDb()
    createUser({ email: "owner@example.test", role: "super_admin" })
    owner = await login("owner@example.test")
    // Enquiries: only the first is an old one that never became a client.
    sql(`INSERT INTO enquiries (name, email, message, status, created_at, updated_at) VALUES
      ('Old', 'old@example.test', 'm', 'lost', NOW() - INTERVAL 2 YEAR, NOW() - INTERVAL 2 YEAR),
      ('Old won', 'won@example.test', 'm', 'won', NOW() - INTERVAL 2 YEAR, NOW() - INTERVAL 2 YEAR),
      ('Old converted', 'conv@example.test', 'm', 'proposal', NOW() - INTERVAL 2 YEAR, NOW() - INTERVAL 2 YEAR),
      ('Recent', 'new@example.test', 'm', 'new', NOW() - INTERVAL 3 MONTH, NOW() - INTERVAL 3 MONTH)`)
    const converted = one("SELECT id FROM enquiries WHERE email = 'conv@example.test'")
    sql(`INSERT INTO clients (company, source_lead_id) VALUES ('Converted Ltd', ${converted})`)
    // Files: only the first was soft-deleted more than 30 days ago.
    sql(`INSERT INTO files (name, \`stored\`, deleted_at) VALUES ('a.pdf', 'a', NOW() - INTERVAL 40 DAY), ('b.pdf', 'b', NOW() - INTERVAL 10 DAY), ('c.pdf', 'c', NULL)`)
    sql("INSERT INTO audit_log (action, detail, created_at) VALUES ('old', 'x', NOW() - INTERVAL 5 YEAR)")
  })

  it("counts the rules with a period, says period not set for the rest, and changes no row", async () => {
    const before = snapshot()
    const r = await api<Report>("privacy.php?action=retention_report", { token: owner })
    expect(r.status).toBe(200)
    expect(r.json.dry_run).toBe(true)
    const rule = (k: string) => r.json.rules.find((x) => x.key === k)!

    expect(rule("enquiries")).toMatchObject({ status: "counted", period: 12, counts: { enquiries: 1 } })
    expect(rule("deleted_files")).toMatchObject({ status: "counted", period: 30, counts: { files: 1 } })
    for (const k of ["clients", "invoices", "audit", "support", "comms", "staff", "certificates"]) {
      expect(rule(k)).toMatchObject({ status: "period_not_set", period: null, counts: null })
    }
    expect(rule("audit").config_key).toBe("$RETENTION_AUDIT_MONTHS")
    expect(snapshot()).toBe(before)
  })

  it("counts every rule once every period is set, including a client's projects and contracts", async () => {
    sql(`INSERT INTO clients (company, created_at, updated_at) VALUES ('Idle Ltd', NOW() - INTERVAL 3 YEAR, NOW() - INTERVAL 3 YEAR)`)
    const idle = one("SELECT id FROM clients WHERE company = 'Idle Ltd'")
    sql(`INSERT INTO projects (client_id, name, updated_at) VALUES (${idle}, 'Old site', NOW() - INTERVAL 3 YEAR)`)
    sql(`INSERT INTO contracts (client_id, title) VALUES (${idle}, 'Old agreement')`)
    // A busy client: its own row is old, but a project changed this month.
    sql(`INSERT INTO clients (company, updated_at) VALUES ('Busy Ltd', NOW() - INTERVAL 3 YEAR)`)
    sql(`INSERT INTO projects (client_id, name) VALUES ((SELECT id FROM clients WHERE company = 'Busy Ltd'), 'Live site')`)
    setOverrides(Object.fromEntries(PERIOD_KEYS.map((k) => [k, k === "RETENTION_DELETED_FILE_DAYS" ? 30 : 12])))

    const before = snapshot()
    const r = await api<Report>("privacy.php?action=retention_report", { token: owner })
    expect(r.status).toBe(200)
    expect(r.json.rules).toHaveLength(PERIOD_KEYS.length)
    for (const rule of r.json.rules) {
      expect(rule.status).toBe("counted")
      expect(Object.keys(rule.counts!).length).toBeGreaterThan(0)
      for (const n of Object.values(rule.counts!)) expect(typeof n).toBe("number")
    }
    const clients = r.json.rules.find((x) => x.key === "clients")!
    expect(clients.counts).toEqual({ clients: 1, projects: 1, contracts: 1 })
    expect(r.json.rules.find((x) => x.key === "audit")!.counts).toEqual({ audit_log: 1 })

    const cli = spawnSync("php", [path.join(WORK_DIR, "cron.php"), "job=retention_report"], { encoding: "utf8" })
    expect(cli.status).toBe(0)
    expect(cli.stdout).not.toContain("period not set")
    expect(cli.stdout).toContain("Client, project and contract records: older than 12 months from last change to the client, its projects, invoices or portal messages: clients 1, projects 1, contracts 1.")
    expect(snapshot()).toBe(before)
  })

  it("reports an invalid period and counts nothing for it", async () => {
    setOverrides({ RETENTION_AUDIT_MONTHS: "twelve", RETENTION_CERTIFICATE_MONTHS: 0 })
    const r = await api<Report>("privacy.php?action=retention_report", { token: owner })
    for (const k of ["audit", "certificates"]) {
      expect(r.json.rules.find((x) => x.key === k)).toMatchObject({ status: "invalid_period", period: null, counts: null })
    }
    const cli = spawnSync("php", [path.join(WORK_DIR, "cron.php"), "job=retention_report"], { encoding: "utf8" })
    expect(cli.stdout).toContain("Audit log: invalid period in $RETENTION_AUDIT_MONTHS. Use a whole number or null. Nothing counted.")
  })

  it("refuses retention_report over the web even with the cron key", async () => {
    setOverrides({ CRON_KEY: "synthetic-cron-key-only" })
    const before = snapshot()
    const r = await api<{ error?: string }>("cron.php?key=synthetic-cron-key-only&job=retention_report")
    expect(r.status).toBe(400)
    expect(r.json.error).toBe("retention_report runs from the command line only.")
    expect(snapshot()).toBe(before)
  })

  it("is super_admin only", async () => {
    createUser({ email: "admin@example.test", role: "admin" })
    createUser({ email: "manager@example.test", role: "manager" })
    expect((await api("privacy.php?action=retention_report")).status).toBe(401)
    expect((await api("privacy.php?action=retention_report", { token: await login("admin@example.test") })).status).toBe(403)
    expect((await api("privacy.php?action=retention_report", { token: await login("manager@example.test") })).status).toBe(403)
  })

  it("prints a plain summary from the command line, is refused over the web, and changes no row", async () => {
    const before = snapshot()
    const r = spawnSync("php", [path.join(WORK_DIR, "cron.php"), "job=retention_report"], { encoding: "utf8" })
    expect(r.status).toBe(0)
    expect(r.stdout).toMatch(/^Retention report \(dry run\)\. Nothing was deleted or changed\./)
    expect(r.stdout).toContain("Enquiries that did not become a client: older than 12 months from last change to the enquiry: enquiries 1.")
    expect(r.stdout).toContain("Soft-deleted files: older than 30 days from deletion: files 1.")
    expect(r.stdout).toContain("Audit log: period not set ($RETENTION_AUDIT_MONTHS). Nothing happens.")
    expect(r.stdout).not.toContain("{")
    expect(snapshot()).toBe(before)
    expect((await api("cron.php?job=retention_report")).status).toBe(403)
  })
})
