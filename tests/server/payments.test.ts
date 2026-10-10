/**
 * Plan findings A04, A05, A25: the amount sent to Stripe must be the
 * VAT-inclusive payable total, and the webhook must only mark an invoice paid
 * when Stripe reports that exact amount and currency, once per event.
 */
import { beforeEach, describe, expect, it } from "vitest"
import {
  api, clearProviderRequests, createClient, createInvoice, createUser, login, one, providerRequests,
  resetDb, sql, stripeSignature,
} from "./helpers"

function stripeEvent(id: string, invoiceId: number, amountTotal: number, currency = "gbp") {
  return JSON.stringify({
    id,
    type: "checkout.session.completed",
    data: { object: { payment_status: "paid", amount_total: amountTotal, currency, metadata: { invoice_id: String(invoiceId) } } },
  })
}

async function postWebhook(payload: string, signature = stripeSignature(payload)) {
  return api("payments.php?action=webhook", { raw: payload, headers: { "Stripe-Signature": signature } })
}

describe("Stripe payment link", () => {
  let token: string
  beforeEach(async () => {
    resetDb()
    clearProviderRequests()
    createUser({ email: "owner@example.test", role: "super_admin" })
    token = await login("owner@example.test")
  })

  it("charges the VAT-inclusive total: £100 plus 20% VAT is 12000 pence", async () => {
    const invoiceId = createInvoice(createClient("Synthetic Ltd"), [[1, 100]], 20)
    const r = await api("payments.php?action=link", { body: { invoice_id: invoiceId }, token })
    expect(r.status).toBe(200)
    const sent = new URLSearchParams(providerRequests()[0].body)
    expect(sent.get("line_items[0][price_data][unit_amount]")).toBe("12000")
    expect(sent.get("line_items[0][price_data][currency]")).toBe("gbp")
  })

  it("rounds VAT the same way as the invoice: 3 × £33.33 at 20% is 11999 pence", async () => {
    // subtotal 99.99, VAT round(19.998) = 20.00, total 119.99
    const invoiceId = createInvoice(createClient("Rounding Ltd"), [[3, 33.33]], 20)
    await api("payments.php?action=link", { body: { invoice_id: invoiceId }, token })
    const sent = new URLSearchParams(providerRequests()[0].body)
    expect(sent.get("line_items[0][price_data][unit_amount]")).toBe("11999")
  })

  it("charges the subtotal unchanged when VAT is 0%", async () => {
    const invoiceId = createInvoice(createClient("No VAT Ltd"), [[2, 50]], 0)
    await api("payments.php?action=link", { body: { invoice_id: invoiceId }, token })
    const sent = new URLSearchParams(providerRequests()[0].body)
    expect(sent.get("line_items[0][price_data][unit_amount]")).toBe("10000")
  })
})

describe("Stripe webhook", () => {
  let invoiceId: number
  beforeEach(() => {
    resetDb()
    invoiceId = createInvoice(createClient("Synthetic Ltd"), [[1, 100]], 20)
  })

  it("marks the invoice paid when the amount and currency match", async () => {
    const r = await postWebhook(stripeEvent("evt_match", invoiceId, 12000))
    expect(r.status).toBe(200)
    expect(one(`SELECT status FROM invoices WHERE id = ${invoiceId}`)).toBe("paid")
    expect(one(`SELECT outcome FROM payment_events WHERE event_id = 'evt_match'`)).toBe("marked_paid")
  })

  it("does not mark the invoice paid when Stripe took the ex-VAT amount", async () => {
    const r = await postWebhook(stripeEvent("evt_short", invoiceId, 10000))
    expect(r.status).toBe(200)
    expect(one(`SELECT status FROM invoices WHERE id = ${invoiceId}`)).toBe("sent")
    expect(one(`SELECT outcome FROM payment_events WHERE event_id = 'evt_short'`)).toBe("amount_mismatch")
    expect(one(`SELECT COUNT(*) FROM audit_log WHERE action = 'invoice_payment_mismatch'`)).toBe("1")
  })

  it("does not mark the invoice paid when the currency differs", async () => {
    await postWebhook(stripeEvent("evt_eur", invoiceId, 12000, "eur"))
    expect(one(`SELECT status FROM invoices WHERE id = ${invoiceId}`)).toBe("sent")
  })

  it("treats a redelivered event as a no-op", async () => {
    const payload = stripeEvent("evt_dup", invoiceId, 12000)
    await postWebhook(payload)
    const second = await postWebhook(payload)
    expect(second.json).toMatchObject({ duplicate: true })
    expect(one(`SELECT COUNT(*) FROM payment_events WHERE event_id = 'evt_dup'`)).toBe("1")
  })

  it("rejects a bad signature and changes nothing", async () => {
    const r = await postWebhook(stripeEvent("evt_forged", invoiceId, 12000), "t=1,v1=deadbeef")
    expect(r.status).toBe(400)
    expect(one(`SELECT status FROM invoices WHERE id = ${invoiceId}`)).toBe("sent")
    expect(sql(`SELECT * FROM payment_events`)).toHaveLength(0)
  })
})

describe("PayPal checkout (A26)", () => {
  it("is switched off until it can confirm payment without the browser returning", async () => {
    resetDb()
    createUser({ email: "owner@example.test", role: "super_admin" })
    const token = await login("owner@example.test")
    const invoiceId = createInvoice(createClient("Synthetic Ltd"), [[1, 100]], 20)
    const r = await api<{ error: string }>("payments.php?action=paypal_link", { body: { invoice_id: invoiceId }, token })
    expect(r.status).toBe(503)
    expect(r.json.error).toMatch(/switched off/)
  })
})
