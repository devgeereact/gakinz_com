/**
 * Quote acceptance evidence (SQL 14, proposals.php?action=accept). Staff
 * clicking Accept is not proof the client agreed, so accept records how the
 * client's acceptance arrived, a reference, the day it was received, who
 * recorded it, and a SHA-256 fingerprint of the exact terms. Bad evidence is
 * refused before anything is written. The public link shows only the date.
 * Until SQL 14 runs, accept works exactly as it did before.
 */
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createUser, login, one, q, resetDb, sql } from "./helpers"

type Row = Record<string, unknown>
type AcceptReply = { error?: string; project_id?: number; existing?: boolean; evidence_recorded?: boolean; accepted_terms_sha256?: string | null }

let owner: string
let ownerId: number
let clientId: number

const CREATED = "2026-01-05 10:00:00"
const good = { method: "email", reference: "Re: Website quote, from buyer@example.test", received_on: "2026-01-12" }

/** A quote created on a fixed past day, so date checks never depend on today. */
function quote(opts: {
  status?: string
  lines?: Array<[string, number, number]>
  vat?: number
  validUntil?: string | null
  notes?: string
  title?: string
} = {}): number {
  const { status = "sent", lines = [["Design", 1, 1500], ["Build", 2, 1250.5]], vat = 20, validUntil = "2999-12-31", notes = "Five pages.", title = "Website" } = opts
  sql(
    `INSERT INTO proposals (client_id, title, status, vat_rate, valid_until, notes, created_at) VALUES ` +
      `(${clientId}, ${q(title)}, ${q(status)}, ${vat}, ${validUntil ? q(validUntil) : "NULL"}, ${q(notes)}, ${q(CREATED)})`,
  )
  const id = Number(one("SELECT MAX(id) FROM proposals"))
  for (const [d, qty, unit] of lines) {
    sql(`INSERT INTO proposal_items (proposal_id, description, qty, unit_price) VALUES (${id}, ${q(d)}, ${qty}, ${unit})`)
  }
  return id
}

const accept = (body: Row, token = owner) => api<AcceptReply>("proposals.php?action=accept", { body, token })
const projects = () => Number(one("SELECT COUNT(*) FROM projects"))
const invoices = () => Number(one("SELECT COUNT(*) FROM invoices"))

function evidenceRow(id: number) {
  const [r] = sql(
    `SELECT status, IFNULL(acceptance_method, 'NULL'), IFNULL(acceptance_reference, 'NULL'),
            IFNULL(DATE_FORMAT(acceptance_received_on, '%Y-%m-%d'), 'NULL'), IFNULL(accepted_by, 'NULL'),
            IF(accepted_at IS NULL, 'NULL', 'set'), IFNULL(accepted_terms_sha256, 'NULL')
     FROM proposals WHERE id = ${id}`,
  )
  const [status, method, reference, receivedOn, by, at, sha] = r
  return { status, method, reference, receivedOn, by, at, sha }
}

beforeEach(async () => {
  resetDb()
  ownerId = createUser({ email: "owner@example.test", role: "super_admin" })
  owner = await login("owner@example.test")
  clientId = createClient("Evidence Ltd")
})

describe("recording the evidence", () => {
  it("stores the method, reference, date, recorder and terms fingerprint with the project", async () => {
    const id = quote()
    const r = await accept({ id, ...good })
    expect(r.status).toBe(200)
    expect(r.json.evidence_recorded).toBe(true)
    expect(r.json.accepted_terms_sha256).toMatch(/^[0-9a-f]{64}$/)

    expect(evidenceRow(id)).toEqual({
      status: "accepted", method: "email", reference: good.reference, receivedOn: "2026-01-12",
      by: String(ownerId), at: "set", sha: r.json.accepted_terms_sha256,
    })
    expect(projects()).toBe(1)
    expect(invoices()).toBe(3)

    // Both staff reads return the evidence, with who recorded it.
    const detail = await api<Row>(`proposals.php?id=${id}`, { token: owner })
    expect(detail.json).toMatchObject({
      evidence_ready: true, acceptance_method: "email", acceptance_reference: good.reference,
      acceptance_received_on: "2026-01-12", accepted_by: ownerId, accepted_by_name: "owner",
      accepted_terms_sha256: r.json.accepted_terms_sha256,
    })
    const list = await api<Row[]>("proposals.php", { token: owner })
    expect(list.json.find((p) => p.id === id)).toMatchObject({ evidence_ready: true, acceptance_method: "email", accepted_by: ownerId })

    // The audit line names the method and fingerprint, not the reference.
    const auditLine = one("SELECT detail FROM audit_log WHERE action = 'proposal_accept'")!
    expect(auditLine).toContain("email received 2026-01-12")
    expect(auditLine).toContain(r.json.accepted_terms_sha256!.slice(0, 12))
    expect(auditLine).not.toContain("buyer@example.test")
  })

  it("trims the reference and accepts each method", async () => {
    for (const method of ["email", "letter", "in_person", "phone", "other"]) {
      const id = quote()
      const r = await accept({ id, method, reference: "   Signed copy  ", received_on: "2026-01-05" })
      expect(r.status, method).toBe(200)
      expect(evidenceRow(id)).toMatchObject({ method, reference: "Signed copy", receivedOn: "2026-01-05" })
    }
  })
})

describe("the terms fingerprint", () => {
  it("is the SHA-256 of the canonical terms JSON documented in proposals.php", async () => {
    const id = quote({ lines: [["Design", 1, 1500], ["Build", 2, 1250.5]], vat: 20, validUntil: "2999-12-31", notes: "Five pages." })
    const r = await accept({ id, ...good })
    // Subtotal 1500 + 2501 = 4001.00; VAT 800.20; schedule 1600.40 / 1200.30 / 1200.30.
    const canonical = JSON.stringify({
      v: 1,
      title: "Website",
      currency: "GBP",
      vat_rate: "20.00",
      valid_until: "2999-12-31",
      items: [
        { description: "Design", qty: "1.00", unit_price: "1500.00", amount: "1500.00" },
        { description: "Build", qty: "2.00", unit_price: "1250.50", amount: "2501.00" },
      ],
      subtotal: "4001.00",
      vat: "800.20",
      total: "4801.20",
      payment_schedule: [
        { label: "Deposit (40%)", percent: "40", amount: "1600.40", due_days_after_acceptance: "0" },
        { label: "Stage payment (30%)", percent: "30", amount: "1200.30", due_days_after_acceptance: "30" },
        { label: "Final payment (30%)", percent: "30", amount: "1200.30", due_days_after_acceptance: "60" },
      ],
      notes: "Five pages.",
    })
    expect(r.json.accepted_terms_sha256).toBe(crypto.createHash("sha256").update(canonical).digest("hex"))
    // And the invoices created are the schedule the fingerprint covers.
    const created = sql("SELECT ROUND(SUM(it.qty * it.unit_price), 2) FROM invoices i JOIN invoice_items it ON it.invoice_id = i.id GROUP BY i.id ORDER BY i.id")
    expect(created.map((x) => x[0])).toEqual(["1600.40", "1200.30", "1200.30"])
  })

  it("is the same for two quotes with identical terms and changes when one line changes", async () => {
    const a = quote()
    const b = quote()
    const c = quote({ lines: [["Design", 1, 1500], ["Build", 2, 1250.51]] })
    const d = quote({ lines: [["Design", 1, 1500], ["Build and launch", 2, 1250.5]] })
    const hashes = []
    for (const id of [a, b, c, d]) {
      const r = await accept({ id, ...good })
      expect(r.status).toBe(200)
      hashes.push(evidenceRow(id).sha)
    }
    expect(hashes[0]).toMatch(/^[0-9a-f]{64}$/)
    expect(hashes[1]).toBe(hashes[0])
    expect(hashes[2]).not.toBe(hashes[0])
    expect(hashes[3]).not.toBe(hashes[0])
    expect(hashes[3]).not.toBe(hashes[2])
  })

  it("changes with the VAT rate or the validity date", async () => {
    const base = quote()
    const vat = quote({ vat: 0 })
    const until = quote({ validUntil: "2999-11-30" })
    for (const id of [base, vat, until]) expect((await accept({ id, ...good })).status).toBe(200)
    const [h0, h1, h2] = [base, vat, until].map((id) => evidenceRow(id).sha)
    expect(new Set([h0, h1, h2]).size).toBe(3)
  })
})

describe("refusing missing or bad evidence", () => {
  const long = "x".repeat(201)
  it.each([
    ["no method", { reference: good.reference, received_on: good.received_on }, /how the client accepted/],
    ["an unknown method", { ...good, method: "fax" }, /how the client accepted/],
    ["no reference", { method: "email", received_on: good.received_on }, /reference/],
    ["a two-character reference", { ...good, reference: " ab " }, /3 to 200/],
    ["a 201-character reference", { ...good, reference: long }, /3 to 200/],
    ["no date", { method: "email", reference: good.reference }, /YYYY-MM-DD/],
    ["a UK-format date", { ...good, received_on: "12/01/2026" }, /YYYY-MM-DD/],
    ["an impossible date", { ...good, received_on: "2026-02-30" }, /YYYY-MM-DD/],
    ["a date before the quote existed", { ...good, received_on: "2026-01-04" }, /before the quote was created/],
  ])("refuses %s and creates nothing", async (_label, body, message) => {
    const id = quote()
    const r = await accept({ id, ...body })
    expect(r.status).toBe(400)
    expect(r.json.error).toMatch(message)
    expect(projects()).toBe(0)
    expect(invoices()).toBe(0)
    expect(evidenceRow(id)).toMatchObject({ status: "sent", method: "NULL", sha: "NULL" })
  })

  it("refuses a date after today on the database clock", async () => {
    const id = quote()
    const tomorrow = one("SELECT DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY)")
    const r = await accept({ id, ...good, received_on: tomorrow })
    expect(r.status).toBe(400)
    expect(r.json.error).toMatch(/future/)
    expect(projects()).toBe(0)
    // Today itself is fine.
    expect((await accept({ id, ...good, received_on: one("SELECT CURRENT_DATE") })).status).toBe(200)
  })

  it("refuses a caller who is not staff, whatever the evidence", async () => {
    const id = quote()
    createUser({ email: "client@example.test", role: "client", clientId })
    expect((await accept({ id, ...good }, await login("client@example.test"))).status).toBe(403)
    expect((await api("proposals.php?action=accept", { body: { id, ...good } })).status).toBe(401)
    expect(projects()).toBe(0)
    expect(evidenceRow(id).status).toBe("sent")
  })
})

describe("existing guards, with evidence", () => {
  it.each(["draft", "declined"])("still refuses a %s quote and stores no evidence", async (status) => {
    const id = quote({ status })
    const r = await accept({ id, ...good })
    expect(r.status).toBe(409)
    expect(projects()).toBe(0)
    expect(evidenceRow(id)).toMatchObject({ status, method: "NULL" })
  })

  it("still refuses an expired quote", async () => {
    const id = quote({ validUntil: "2026-01-06" })
    const r = await accept({ id, ...good })
    expect(r.status).toBe(409)
    expect(r.json.error).toMatch(/expired/)
    expect(evidenceRow(id).method).toBe("NULL")
  })

  it("is single use: a second accept returns the same project and leaves the first evidence alone", async () => {
    const id = quote()
    const first = await accept({ id, ...good })
    const before = evidenceRow(id)
    const second = await accept({ id, method: "phone", reference: "Called on Tuesday", received_on: "2026-01-20" })
    expect(second.status).toBe(200)
    expect(second.json).toMatchObject({ existing: true, project_id: first.json.project_id })
    expect(evidenceRow(id)).toEqual(before)
    expect(projects()).toBe(1)
    expect(invoices()).toBe(3)
  })

  it("records exactly one set of evidence under concurrent acceptance", async () => {
    const id = quote()
    const refs = Array.from({ length: 6 }, (_, i) => `Parallel reference ${i}`)
    const replies = await Promise.all(refs.map((reference) => accept({ id, ...good, reference })))
    expect(replies.every((r) => r.status === 200)).toBe(true)
    expect(replies.filter((r) => r.json.existing !== true)).toHaveLength(1)
    expect(projects()).toBe(1)
    expect(invoices()).toBe(3)
    expect(refs).toContain(evidenceRow(id).reference)
  })
})

describe("the public link", () => {
  async function link(id: number): Promise<string> {
    const r = await api<{ token: string }>("proposals.php?action=share", { body: { id }, token: owner })
    return `proposals.php?token=${r.json.token}`
  }

  it("shows the acceptance date and nothing else of the evidence", async () => {
    const id = quote()
    const url = await link(id)
    expect((await api<Row>(url)).json.accepted_on).toBeNull()

    await accept({ id, ...good })
    const pub = await api<Row>(url)
    expect(pub.status).toBe(200)
    expect(pub.json).toMatchObject({ status: "accepted", accepted_on: "2026-01-12" })
    const text = JSON.stringify(pub.json)
    expect(text).not.toContain("buyer@example.test")
    expect(text).not.toContain("Website quote")
    for (const key of ["acceptance_reference", "acceptance_method", "accepted_by", "accepted_by_name", "accepted_terms_sha256", "accepted_at"]) {
      expect(pub.json).not.toHaveProperty(key)
    }
  })
})

describe("before SQL 14 has run", () => {
  // The ALTER recorded at the foot of server/schema.sql, uncommented.
  const migrate = fs.readFileSync(path.resolve(__dirname, "../../server/schema.sql"), "utf8")
    .match(/-- {3}ALTER TABLE proposals\n[\s\S]*?ADD COLUMN accepted_terms_sha256[^;]*;/)![0]
    .replace(/^--\s{3}/gm, "")

  it("accepts without evidence exactly as before, and every read still works", async () => {
    const id = quote()
    const url = `proposals.php?token=${(await api<{ token: string }>("proposals.php?action=share", { body: { id }, token: owner })).json.token}`
    sql(
      "ALTER TABLE proposals DROP COLUMN accepted_at, DROP COLUMN accepted_by, DROP COLUMN acceptance_method, " +
        "DROP COLUMN acceptance_reference, DROP COLUMN acceptance_received_on, DROP COLUMN accepted_terms_sha256",
    )
    try {
      const r = await accept({ id })
      expect(r.status).toBe(200)
      expect(r.json).toMatchObject({ evidence_recorded: false, accepted_terms_sha256: null })
      expect(projects()).toBe(1)
      expect(invoices()).toBe(3)
      expect(one(`SELECT status FROM proposals WHERE id = ${id}`)).toBe("accepted")
      expect(one("SELECT detail FROM audit_log WHERE action = 'proposal_accept'")).toMatch(/SQL 14 not run/)

      // The old guards hold: single use, sent only.
      expect((await accept({ id })).json.existing).toBe(true)
      expect((await accept({ id: quote({ status: "draft" }) })).status).toBe(409)

      const list = await api<Row[]>("proposals.php", { token: owner })
      expect(list.status).toBe(200)
      expect(list.json.find((p) => p.id === id)).toMatchObject({ evidence_ready: false, acceptance_method: null, accepted_terms_sha256: null })
      const detail = await api<Row>(`proposals.php?id=${id}`, { token: owner })
      expect(detail.status).toBe(200)
      expect(detail.json).toMatchObject({ evidence_ready: false, acceptance_reference: null })
      const pub = await api<Row>(url)
      expect(pub.status).toBe(200)
      expect(pub.json.accepted_on).toBeNull()
    } finally {
      sql(migrate)
    }
  })
})
