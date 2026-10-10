/**
 * K-028: only a sent, unexpired quote can be accepted, and
 * acceptance creates exactly one project and one 40/30/30 invoice schedule even
 * when the button is pressed twice or requests arrive together.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createUser, login, one, q, resetDb, sql } from "./helpers"

let token: string
let clientId: number

function proposal(status: string, validUntil: string | null = null, vat = 20): number {
  sql(
    `INSERT INTO proposals (client_id, title, status, vat_rate, valid_until) VALUES ` +
      `(${clientId}, 'Synthetic website', ${q(status)}, ${vat}, ${validUntil ? q(validUntil) : "NULL"})`,
  )
  const id = Number(one("SELECT MAX(id) FROM proposals"))
  sql(`INSERT INTO proposal_items (proposal_id, description, qty, unit_price) VALUES (${id}, 'Build', 1, 1000)`)
  return id
}

const accept = (id: number) => api<{ error?: string; project_id?: number; existing?: boolean }>("proposals.php?action=accept", { body: { id }, token })
const projects = () => Number(one("SELECT COUNT(*) FROM projects"))
const invoices = () => Number(one("SELECT COUNT(*) FROM invoices"))

beforeEach(async () => {
  resetDb()
  clientId = createClient("Synthetic Ltd")
  createUser({ email: "owner@example.test", role: "super_admin" })
  token = await login("owner@example.test")
})

describe("quote acceptance", () => {
  it.each(["draft", "declined"])("refuses a %s quote and creates nothing", async (status) => {
    const r = await accept(proposal(status))
    expect(r.status).toBe(409)
    expect(projects()).toBe(0)
    expect(invoices()).toBe(0)
  })

  it("refuses an expired quote", async () => {
    const r = await accept(proposal("sent", "2020-01-01"))
    expect(r.status).toBe(409)
    expect(r.json.error).toMatch(/expired/i)
    expect(projects()).toBe(0)
  })

  it("converts a sent quote into one project and three invoices with the quote's VAT", async () => {
    const id = proposal("sent")
    const r = await accept(id)
    expect(r.status).toBe(200)
    expect(projects()).toBe(1)
    expect(invoices()).toBe(3)
    expect(sql("SELECT ROUND(SUM(it.qty * it.unit_price), 2), MIN(i.vat_rate) FROM invoices i JOIN invoice_items it ON it.invoice_id = i.id")[0])
      .toEqual(["1000.00", "20.00"])
    expect(one(`SELECT status FROM proposals WHERE id = ${id}`)).toBe("accepted")
  })

  it("returns the existing project when accepted twice", async () => {
    const id = proposal("sent")
    const first = await accept(id)
    const second = await accept(id)
    expect(second.status).toBe(200)
    expect(second.json.existing).toBe(true)
    expect(second.json.project_id).toBe(first.json.project_id)
    expect(projects()).toBe(1)
    expect(invoices()).toBe(3)
  })

  it("creates one project and three invoices under concurrent acceptance", async () => {
    const id = proposal("sent")
    await Promise.all(Array.from({ length: 6 }, () => accept(id)))
    expect(projects()).toBe(1)
    expect(invoices()).toBe(3)
  })

  it("will not move an accepted quote back to draft", async () => {
    const id = proposal("sent")
    await accept(id)
    const r = await api("proposals.php?action=status", { body: { id, status: "draft" }, token })
    expect(r.status).toBe(409)
    expect(one(`SELECT status FROM proposals WHERE id = ${id}`)).toBe("accepted")
  })
})
