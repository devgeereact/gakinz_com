/**
 * Manual payment record on invoices (SQL 13, invoices.php?action=record_payment).
 * The owner records a bank transfer, cash or cheque payment with a method,
 * reference, date and amount. The amount must be the exact VAT-inclusive total
 * from _money.php, the date must be real and in range, and an invoice can be
 * recorded paid once only, even under parallel requests.
 */
import fs from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createInvoice, createUser, login, one, resetDb, sql } from "./helpers"

type Row = Record<string, unknown>
type Err = { error?: string; expected_pence?: number }

let owner: string
let ownerId: number
let clientId: number

function record(body: Row, token = owner) {
  return api<Row & Err>("invoices.php?action=record_payment", { body, token })
}

/** A sent invoice issued on a fixed past date, so date checks never depend on today. */
function sentInvoice(items: Array<[number, number]>, vat = 20, issued = "2026-01-10"): number {
  const id = createInvoice(clientId, items, vat)
  sql(`UPDATE invoices SET issued_at = '${issued}' WHERE id = ${id}`)
  return id
}

function stored(id: number) {
  const [row] = sql(
    `SELECT status, DATE_FORMAT(paid_at, '%Y-%m-%d'), IFNULL(paid_method, 'NULL'), IFNULL(paid_reference, 'NULL'),
            IFNULL(paid_amount_pence, 'NULL'), IFNULL(paid_recorded_by, 'NULL') FROM invoices WHERE id = ${id}`,
  )
  const [status, paidOn, method, reference, pence, by] = row
  return { status, paidOn, method, reference, pence, by }
}

const auditCount = (action: string) => Number(one(`SELECT COUNT(*) FROM audit_log WHERE action = '${action}'`))

beforeEach(async () => {
  resetDb()
  ownerId = createUser({ email: "owner@example.test", role: "super_admin" })
  owner = await login("owner@example.test")
  clientId = createClient("Transfer Ltd")
})

describe("record_payment", () => {
  it("records a bank transfer for the exact VAT-inclusive total and marks the invoice paid", async () => {
    // 3 x £33.33 = £99.99, VAT round(19.998) = £20.00, payable £119.99
    const id = sentInvoice([[3, 33.33]], 20)
    const r = await record({ id, method: "bank_transfer", reference: "GK-INV 0001 ACME", paid_on: "2026-01-15", amount: "119.99" })
    expect(r.status).toBe(200)
    expect(r.json).toMatchObject({ status: "paid", paid_method: "bank_transfer", paid_amount_pence: 11999 })

    expect(stored(id)).toEqual({
      status: "paid", paidOn: "2026-01-15", method: "bank_transfer", reference: "GK-INV 0001 ACME",
      pence: "11999", by: String(ownerId),
    })
    expect(auditCount("invoice_paid_manual")).toBe(1)

    // Both staff reads carry the record.
    const detail = await api<Row>(`invoices.php?id=${id}`, { token: owner })
    expect(detail.json).toMatchObject({ paid_method: "bank_transfer", paid_reference: "GK-INV 0001 ACME", paid_amount_pence: 11999, paid_recorded_by: ownerId })
    const list = await api<Row[]>("invoices.php", { token: owner })
    expect(list.json.find((x) => x.id === id)).toMatchObject({ status: "paid", paid_method: "bank_transfer", paid_amount_pence: 11999 })
  })

  it("accepts a numeric amount and cash with no reference", async () => {
    const id = sentInvoice([[1, 100]], 0)
    const r = await record({ id, method: "cash", paid_on: "2026-01-10", amount: 100 })
    expect(r.status).toBe(200)
    expect(stored(id)).toMatchObject({ status: "paid", method: "cash", reference: "NULL", pence: "10000" })
  })

  it("refuses an amount that is not the full payable total, and says what the total is", async () => {
    const id = sentInvoice([[1, 100]], 20) // payable £120.00
    for (const amount of ["100.00", "120.01", "119.999", "-120", "abc", ""]) {
      const r = await record({ id, method: "bank_transfer", reference: "REF", paid_on: "2026-01-15", amount })
      expect(r.status, `amount ${amount}`).toBe(400)
    }
    const short = await record({ id, method: "bank_transfer", reference: "REF", paid_on: "2026-01-15", amount: "100.00" })
    expect(short.json.error).toContain("£120.00")
    expect(short.json.expected_pence).toBe(12000)
    expect(stored(id).status).toBe("sent")
    expect(auditCount("invoice_paid_manual")).toBe(0)
  })

  it("refuses a payment date in the future", async () => {
    const id = sentInvoice([[1, 50]], 0)
    const tomorrow = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10)
    const r = await record({ id, method: "cash", paid_on: tomorrow, amount: "50.00" })
    expect(r.status).toBe(400)
    expect(r.json.error).toMatch(/future/)
    expect(stored(id).status).toBe("sent")
  })

  it("refuses a payment date before the invoice was issued, and a date that does not exist", async () => {
    const id = sentInvoice([[1, 50]], 0, "2026-01-10")
    const early = await record({ id, method: "cash", paid_on: "2026-01-09", amount: "50.00" })
    expect(early.status).toBe(400)
    expect(early.json.error).toMatch(/before the invoice was issued/)
    const unreal = await record({ id, method: "cash", paid_on: "2026-02-30", amount: "50.00" })
    expect(unreal.status).toBe(400)
    expect(stored(id).status).toBe("sent")
  })

  it("requires a reference for a bank transfer or cheque, and refuses one over 100 characters", async () => {
    const id = sentInvoice([[1, 50]], 0)
    const missing = await record({ id, method: "bank_transfer", reference: "   ", paid_on: "2026-01-15", amount: "50.00" })
    expect(missing.status).toBe(400)
    expect(missing.json.error).toMatch(/reference/)
    const cheque = await record({ id, method: "cheque", paid_on: "2026-01-15", amount: "50.00" })
    expect(cheque.status).toBe(400)
    const long = await record({ id, method: "bank_transfer", reference: "x".repeat(101), paid_on: "2026-01-15", amount: "50.00" })
    expect(long.status).toBe(400)
    const badMethod = await record({ id, method: "crypto", reference: "x", paid_on: "2026-01-15", amount: "50.00" })
    expect(badMethod.status).toBe(400)
    expect(stored(id).status).toBe("sent")
  })

  it("refuses an invoice that is already paid, a draft, or deleted", async () => {
    const paid = sentInvoice([[1, 50]], 0)
    sql(`UPDATE invoices SET status = 'paid', paid_at = NOW() WHERE id = ${paid}`)
    const a = await record({ id: paid, method: "cash", paid_on: "2026-01-15", amount: "50.00" })
    expect(a.status).toBe(409)
    expect(a.json.error).toMatch(/already paid/)
    expect(stored(paid).method).toBe("NULL")

    const draft = sentInvoice([[1, 50]], 0)
    sql(`UPDATE invoices SET status = 'draft' WHERE id = ${draft}`)
    const b = await record({ id: draft, method: "cash", paid_on: "2026-01-15", amount: "50.00" })
    expect(b.status).toBe(409)
    expect(stored(draft).status).toBe("draft")

    const gone = sentInvoice([[1, 50]], 0)
    sql(`UPDATE invoices SET deleted_at = NOW() WHERE id = ${gone}`)
    const c = await record({ id: gone, method: "cash", paid_on: "2026-01-15", amount: "50.00" })
    expect(c.status).toBe(404)
    expect(stored(gone).status).toBe("sent")
  })

  it("refuses every non-staff role and an anonymous caller", async () => {
    const id = sentInvoice([[1, 50]], 0)
    createUser({ email: "editor@example.test", role: "editor" })
    createUser({ email: "employee@example.test", role: "employee" })
    createUser({ email: "client@example.test", role: "client", clientId })
    for (const email of ["editor@example.test", "employee@example.test", "client@example.test"]) {
      const r = await record({ id, method: "cash", paid_on: "2026-01-15", amount: "50.00" }, await login(email))
      expect(r.status, email).toBe(403)
    }
    const anon = await api("invoices.php?action=record_payment", { body: { id, method: "cash", paid_on: "2026-01-15", amount: "50.00" } })
    expect(anon.status).toBe(401)
    expect(stored(id).status).toBe("sent")
  })

  it("lets exactly one of two parallel records succeed", async () => {
    const id = sentInvoice([[2, 75]], 20) // payable £180.00
    const [a, b] = await Promise.all([
      record({ id, method: "bank_transfer", reference: "FIRST", paid_on: "2026-01-15", amount: "180.00" }),
      record({ id, method: "cheque", reference: "SECOND", paid_on: "2026-01-16", amount: "180.00" }),
    ])
    expect([a.status, b.status].sort()).toEqual([200, 409])
    const winner = a.status === 200 ? "FIRST" : "SECOND"
    expect(stored(id)).toMatchObject({ status: "paid", reference: winner, pence: "18000" })
    expect(auditCount("invoice_paid_manual")).toBe(1)
  })

  it("clears the recorded payment when the invoice is moved back from paid", async () => {
    const id = sentInvoice([[1, 50]], 0)
    expect((await record({ id, method: "cheque", reference: "000123", paid_on: "2026-01-15", amount: "50.00" })).status).toBe(200)
    const back = await api("invoices.php?action=status", { body: { id, status: "sent" }, token: owner })
    expect(back.status).toBe(200)
    expect(stored(id)).toEqual({ status: "sent", paidOn: "NULL", method: "NULL", reference: "NULL", pence: "NULL", by: "NULL" })
    // And it can then be recorded again.
    expect((await record({ id, method: "cash", paid_on: "2026-01-20", amount: "50.00" })).status).toBe(200)
  })

  it("never gives a client the recorded-by user in the portal", async () => {
    const id = sentInvoice([[1, 50]], 0)
    await record({ id, method: "bank_transfer", reference: "REF", paid_on: "2026-01-15", amount: "50.00" })
    createUser({ email: "client@example.test", role: "client", clientId })
    const portal = await api<{ invoices: Row[] }>("portal.php", { token: await login("client@example.test") })
    expect(portal.status).toBe(200)
    const inv = portal.json.invoices.find((x) => x.id === id)
    expect(inv).toBeDefined()
    expect(inv).not.toHaveProperty("paid_recorded_by")
  })
})

describe("before SQL 13 has run", () => {
  // The ALTER recorded at the foot of server/schema.sql, uncommented.
  const migrate = fs.readFileSync(path.resolve(__dirname, "../../server/schema.sql"), "utf8")
    .match(/-- {3}ALTER TABLE invoices\n[\s\S]*?ADD COLUMN paid_recorded_by[^;]*;/)![0]
    .replace(/^--\s{3}/gm, "")

  it("answers 503 for record_payment and keeps every existing invoice action working", async () => {
    const id = sentInvoice([[1, 50]], 0)
    sql("ALTER TABLE invoices DROP COLUMN paid_method, DROP COLUMN paid_reference, DROP COLUMN paid_amount_pence, DROP COLUMN paid_recorded_by")
    try {
      const r = await record({ id, method: "cash", paid_on: "2026-01-15", amount: "50.00" })
      expect(r.status).toBe(503)
      expect(r.json.error).toMatch(/SQL 13/)

      const list = await api<Row[]>("invoices.php", { token: owner })
      expect(list.status).toBe(200)
      expect(list.json[0]).toMatchObject({ id, paid_method: null, paid_reference: null })
      expect((await api(`invoices.php?id=${id}`, { token: owner })).status).toBe(200)
      expect((await api("invoices.php?action=status", { body: { id, status: "paid" }, token: owner })).status).toBe(200)
      expect((await api("invoices.php?action=status", { body: { id, status: "sent" }, token: owner })).status).toBe(200)
      expect(one(`SELECT status FROM invoices WHERE id = ${id}`)).toBe("sent")
    } finally {
      sql(migrate)
    }
  })
})
