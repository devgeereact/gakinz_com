/**
 * "Paid" records the same evidence on every path (K-131). Before: `status=paid`, the Stripe webhook and PayPal
 * set only paid_at, while record_payment recorded the method, the amount and who. Now one function
 * (gk_mark_invoice_paid) does it, so the evidence is the same everywhere. A DRAFT can still be paid by a
 * provider or marked paid by hand: that is the owner's flow (quote accepted, draft deposit invoice, Stripe
 * link, webhook: journey.test.ts), and money that really arrived must be recorded. Re-marking a paid invoice
 * is a clear 409, and a harmless no-op is not mistaken for a missing invoice.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, clearProviderRequests, createClient, createInvoice, createUser, login, one, resetDb, sql, stripeSignature } from "./helpers"

let owner: string
let ownerId: number
let clientId: number

beforeEach(async () => {
  resetDb()
  clearProviderRequests()
  createUser({ email: "owner@example.test", role: "super_admin" })
  owner = await login("owner@example.test")
  ownerId = Number(one("SELECT id FROM users WHERE email = 'owner@example.test'"))
  clientId = createClient("Synthetic Ltd")
})

const paidFields = (id: number) =>
  sql(`SELECT status, IFNULL(paid_method,'NULL'), IFNULL(paid_reference,'NULL'), IFNULL(paid_amount_pence,'NULL'), IFNULL(paid_recorded_by,'NULL'), IF(paid_at IS NULL,'no','yes') FROM invoices WHERE id = ${id}`)[0]
const draft = (id: number) => sql(`UPDATE invoices SET status = 'draft' WHERE id = ${id}`)

function stripeEvent(id: string, invoiceId: number, amount: number, extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    id, type: "checkout.session.completed",
    data: { object: { payment_status: "paid", amount_total: amount, currency: "gbp", payment_intent: "pi_synthetic_1", metadata: { invoice_id: String(invoiceId) }, ...extra } },
  })
}
const webhook = (payload: string) => api("payments.php?action=webhook", { raw: payload, headers: { "Stripe-Signature": stripeSignature(payload) } })

describe("marking an invoice paid by hand (invoices.php status)", () => {
  it("records who marked it, the amount and that the method is not known", async () => {
    const id = createInvoice(clientId, [[1, 100]], 20) // £120.00 with VAT
    const r = await api("invoices.php?action=status", { body: { id, status: "paid" }, token: owner })
    expect(r.status).toBe(200)
    expect(paidFields(id)).toEqual(["paid", "other", "NULL", "12000", String(ownerId), "yes"])
  })

  it("can mark a draft paid, with the same evidence", async () => {
    const id = createInvoice(clientId, [[1, 100]])
    draft(id)
    const r = await api("invoices.php?action=status", { body: { id, status: "paid" }, token: owner })
    expect(r.status).toBe(200)
    expect(paidFields(id)).toEqual(["paid", "other", "NULL", "10000", String(ownerId), "yes"])
  })

  it("does not mistake a change that changes nothing for a missing invoice", async () => {
    const id = createInvoice(clientId, [[1, 100]]) // already sent
    expect((await api("invoices.php?action=status", { body: { id, status: "sent" }, token: owner })).status).toBe(200)
  })

  it("refuses an invoice that is already paid, without re-stamping it", async () => {
    const id = createInvoice(clientId, [[1, 100]])
    await api("invoices.php?action=status", { body: { id, status: "paid" }, token: owner })
    const before = one(`SELECT paid_at FROM invoices WHERE id = ${id}`)
    const r = await api("invoices.php?action=status", { body: { id, status: "paid" }, token: owner })
    expect(r.status).toBe(409)
    expect(one(`SELECT paid_at FROM invoices WHERE id = ${id}`)).toBe(before)
  })

  it("still clears every payment field when an invoice is moved back from paid", async () => {
    const id = createInvoice(clientId, [[1, 100]])
    await api("invoices.php?action=status", { body: { id, status: "paid" }, token: owner })
    await api("invoices.php?action=status", { body: { id, status: "sent" }, token: owner })
    expect(paidFields(id)).toEqual(["sent", "NULL", "NULL", "NULL", "NULL", "no"])
  })

  it("answers 404 for an invoice that does not exist", async () => {
    expect((await api("invoices.php?action=status", { body: { id: 99999, status: "paid" }, token: owner })).status).toBe(404)
  })
})

describe("Stripe webhook", () => {
  it("records the provider, its reference and the amount, and no person", async () => {
    const id = createInvoice(clientId, [[1, 100]], 20)
    expect((await webhook(stripeEvent("evt_paid_1", id, 12000))).status).toBe(200)
    expect(paidFields(id)).toEqual(["paid", "stripe", "pi_synthetic_1", "12000", "NULL", "yes"])
    expect(one("SELECT outcome FROM payment_events WHERE event_id = 'evt_paid_1'")).toBe("marked_paid")
  })

  it("records a draft deposit invoice as paid when the matching payment arrives (the owner's journey)", async () => {
    const id = createInvoice(clientId, [[1, 100]])
    draft(id)
    expect((await webhook(stripeEvent("evt_draft_1", id, 10000))).status).toBe(200)
    expect(paidFields(id)).toEqual(["paid", "stripe", "pi_synthetic_1", "10000", "NULL", "yes"])
    expect(one("SELECT outcome FROM payment_events WHERE event_id = 'evt_draft_1'")).toBe("marked_paid")
  })

  it("does nothing to an invoice that is already paid, and says so", async () => {
    const id = createInvoice(clientId, [[1, 100]])
    await api("invoices.php?action=status", { body: { id, status: "paid" }, token: owner })
    const before = paidFields(id)
    await webhook(stripeEvent("evt_after_manual", id, 10000))
    expect(paidFields(id)).toEqual(before) // the manual record is not overwritten by the provider's
    expect(one("SELECT outcome FROM payment_events WHERE event_id = 'evt_after_manual'")).toBe("already_paid")
  })

  it("leaves a wrong amount unpaid, as before", async () => {
    const id = createInvoice(clientId, [[1, 100]], 20)
    await webhook(stripeEvent("evt_short_1", id, 10000))
    expect(paidFields(id)[0]).toBe("sent")
    expect(one("SELECT outcome FROM payment_events WHERE event_id = 'evt_short_1'")).toBe("amount_mismatch")
  })

  it("is idempotent: a redelivered event changes nothing", async () => {
    const id = createInvoice(clientId, [[1, 100]], 20)
    await webhook(stripeEvent("evt_dup_1", id, 12000))
    const first = paidFields(id)
    const again = await webhook(stripeEvent("evt_dup_1", id, 12000))
    expect(again.json).toMatchObject({ duplicate: true })
    expect(paidFields(id)).toEqual(first)
  })
})

describe("payment link and chase are unchanged for drafts", () => {
  it("still creates a Stripe payment link for a draft invoice", async () => {
    const id = createInvoice(clientId, [[1, 100]])
    draft(id)
    expect((await api("payments.php?action=link", { body: { invoice_id: id }, token: owner })).status).toBe(200)
  })

  it("still refuses a payment link for an invoice that is already paid", async () => {
    const id = createInvoice(clientId, [[1, 100]])
    await api("invoices.php?action=status", { body: { id, status: "paid" }, token: owner })
    expect((await api("payments.php?action=link", { body: { invoice_id: id }, token: owner })).status).toBe(400)
  })
})
