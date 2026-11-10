/**
 * V1 finish line item 6: the owner issues an invoice and takes a payment (Stripe or manual) with the right VAT.
 * The one number that matters is the payable total, and it is computed in more than one place (the staff invoice
 * view, the client's portal, the amount sent to Stripe, the amount a manual payment must equal). At amounts that
 * do not divide into whole pence they must still agree to the penny, and the 40/30/30 schedule a quote creates
 * must add back to the quote's own subtotal exactly (no penny lost or invented).
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, clearProviderRequests, createClient, createInvoice, createUser, login, one, providerRequests, resetDb, sql } from "./helpers"

let owner: string
let clientToken: string
let clientId: number

beforeEach(async () => {
  resetDb()
  clearProviderRequests()
  createUser({ email: "owner@example.test", role: "super_admin" })
  owner = await login("owner@example.test")
  clientId = createClient("Penny Ltd")
  createUser({ email: "buyer@example.test", role: "client", clientId })
  clientToken = await login("buyer@example.test")
})

// items are [qty, unit price]; expected figures are worked by hand, rounding each step to pence as _money.php does.
const CASES: Array<{ name: string; items: Array<[number, number]>; vat: number; subtotal: number; vatAmount: number; total: number }> = [
  { name: "3 x £33.33 at 20%", items: [[3, 33.33]], vat: 20, subtotal: 99.99, vatAmount: 20.0, total: 119.99 },
  { name: "7 x £14.99 at 5%", items: [[7, 14.99]], vat: 5, subtotal: 104.93, vatAmount: 5.25, total: 110.18 },
  { name: "one penny at 20% (VAT rounds to nothing)", items: [[1, 0.01]], vat: 20, subtotal: 0.01, vatAmount: 0.0, total: 0.01 },
  { name: "two lines at 20%", items: [[1, 1234.57], [2, 19.99]], vat: 20, subtotal: 1274.55, vatAmount: 254.91, total: 1529.46 },
  { name: "not VAT registered (0%)", items: [[1, 1500]], vat: 0, subtotal: 1500, vatAmount: 0, total: 1500 },
]

describe("the payable total agrees everywhere", () => {
  for (const c of CASES) {
    it(`${c.name}: staff view, portal, Stripe amount and manual payment all say £${c.total.toFixed(2)}`, async () => {
      const id = createInvoice(clientId, c.items, c.vat)
      const pence = Math.round(c.total * 100)

      const staff = await api<{ subtotal: number; vat_amount: number; total: number }>(`invoices.php?id=${id}`, { token: owner })
      expect(staff.json).toMatchObject({ subtotal: c.subtotal, vat_amount: c.vatAmount, total: c.total })

      const portal = await api<{ invoices: Array<{ id: number; total: number; vat_amount: number }> }>("portal.php", { token: clientToken })
      expect(portal.json.invoices.find((i) => i.id === id)).toMatchObject({ total: c.total, vat_amount: c.vatAmount })

      const link = await api("payments.php?action=link", { body: { invoice_id: id }, token: owner })
      expect(link.status).toBe(200)
      const sent = new URLSearchParams(providerRequests().at(-1)!.body)
      expect(sent.get("line_items[0][price_data][unit_amount]")).toBe(String(pence))

      // One penny short or over is refused; the exact total is accepted and stored in pence.
      const body = { id, method: "bank_transfer", reference: "REF", paid_on: one("SELECT CURRENT_DATE")! }
      const under = await api("invoices.php?action=record_payment", { body: { ...body, amount: (c.total - 0.01).toFixed(2) }, token: owner })
      const over = await api("invoices.php?action=record_payment", { body: { ...body, amount: (c.total + 0.01).toFixed(2) }, token: owner })
      expect([under.status, over.status]).toEqual([400, 400])
      const exact = await api("invoices.php?action=record_payment", { body: { ...body, amount: c.total.toFixed(2) }, token: owner })
      expect(exact.status).toBe(200)
      expect(one(`SELECT paid_amount_pence FROM invoices WHERE id = ${id}`)).toBe(String(pence))
    })
  }
})

describe("the 40/30/30 schedule adds back to the quote", () => {
  it.each([1234.57, 999.99, 0.1, 3333.33, 1500])("a £%s quote splits into three invoices whose subtotals sum to exactly the quote", async (price) => {
    const created = await api<{ id: number }>("proposals.php?action=create", {
      body: { client_id: clientId, title: "Split", vat_rate: 20, items: [{ description: "Build", qty: 1, unit_price: price }] },
      token: owner,
    })
    expect(created.status).toBe(201)
    await api("proposals.php?action=status", { body: { id: created.json.id, status: "sent" }, token: owner })
    const accepted = await api<{ project_id: number }>("proposals.php?action=accept", {
      body: { id: created.json.id, method: "email", reference: "Re: Split", received_on: one("SELECT CURRENT_DATE") },
      token: owner,
    })
    expect(accepted.status).toBe(200)
    const pence = sql(
      `SELECT ROUND(SUM(ii.qty * ii.unit_price) * 100) FROM invoices i JOIN invoice_items ii ON ii.invoice_id = i.id ` +
        `WHERE i.project_id = ${accepted.json.project_id} GROUP BY i.id ORDER BY i.id`,
    ).map((r) => Number(r[0]))
    const whole = Math.round(price * 100)
    const deposit = Math.round((whole * 40) / 100 + 1e-9)
    const stage = Math.round((whole * 30) / 100 + 1e-9)
    expect(pence).toEqual([deposit, stage, whole - deposit - stage])
    expect(pence.reduce((a, b) => a + b, 0)).toBe(whole)
  })
})
