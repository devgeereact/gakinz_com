/**
 * The core business journey, end to end through the real endpoints:
 * a public enquiry becomes a client, the client gets a quote, the accepted
 * quote becomes a project with a 40/30/30 invoice schedule, the deposit is
 * paid through the (fake) Stripe provider, and the client sees exactly that
 * in their portal and nothing belonging to anyone else.
 */
import { beforeAll, describe, expect, it } from "vitest"
import {
  api, clearProviderRequests, createClient, createUser, login, one, providerRequests, resetDb, sql, stripeSignature,
} from "./helpers"

type Portal = {
  client: { id: number; company: string }
  projects: Array<{ id: number; name: string }>
  invoices: Array<{ id: number; status: string; total: number }>
}

let owner: string
let enquiryId: number
let clientId: number
let proposalId: number
let projectId: number
let depositId: number

beforeAll(async () => {
  resetDb()
  clearProviderRequests()
  createUser({ email: "owner@example.test", role: "super_admin" })
  owner = await login("owner@example.test")
})

describe("enquiry to paid deposit", () => {
  it("1. takes a public enquiry from the contact form", async () => {
    const r = await api<{ id: number }>("contact.php", {
      body: { name: "Synthetic Buyer", email: "buyer@example.test", company: "Journey Ltd", message: "We need a new booking site." },
    })
    expect(r.status).toBe(201)
    enquiryId = r.json.id
    expect(one(`SELECT company FROM enquiries WHERE id = ${enquiryId}`)).toBe("Journey Ltd")
  })

  it("2. shows the enquiry to staff and not to the public", async () => {
    expect((await api("leads.php")).status).toBe(401)
    const r = await api<Array<{ id: number }>>("leads.php", { token: owner })
    expect(r.json.map((l) => l.id)).toContain(enquiryId)
  })

  it("3. converts the enquiry into a client and marks it won", async () => {
    const r = await api<{ id: number }>("clients.php?action=convert", { body: { lead_id: enquiryId }, token: owner })
    expect(r.status).toBe(201)
    clientId = r.json.id
    expect(one(`SELECT company FROM clients WHERE id = ${clientId}`)).toBe("Journey Ltd")
    expect(one(`SELECT status FROM enquiries WHERE id = ${enquiryId}`)).toBe("won")
  })

  it("4. converting the same enquiry twice returns the same client", async () => {
    const r = await api<{ id: number; existing?: boolean }>("clients.php?action=convert", { body: { lead_id: enquiryId }, token: owner })
    expect(r.json).toMatchObject({ id: clientId, existing: true })
    expect(one("SELECT COUNT(*) FROM clients")).toBe("1")
  })

  it("5. drafts and sends a £1,000 + 20% VAT quote", async () => {
    const r = await api<{ id: number }>("proposals.php?action=create", {
      body: { client_id: clientId, title: "Booking site", vat_rate: 20, items: [{ description: "Build", qty: 1, unit_price: 1000 }] },
      token: owner,
    })
    expect(r.status).toBe(201)
    proposalId = r.json.id
    const sent = await api("proposals.php?action=status", { body: { id: proposalId, status: "sent" }, token: owner })
    expect(sent.status).toBe(200)
  })

  it("6. accepting the quote creates one project and a 40/30/30 schedule carrying the VAT", async () => {
    const evidence = { method: "email", reference: "Re: Booking site, from buyer@example.test", received_on: one("SELECT CURRENT_DATE") }
    const r = await api<{ project_id: number }>("proposals.php?action=accept", { body: { id: proposalId, ...evidence }, token: owner })
    expect(r.status).toBe(200)
    expect(one(`SELECT acceptance_method FROM proposals WHERE id = ${proposalId}`)).toBe("email")
    projectId = r.json.project_id
    expect(one(`SELECT client_id FROM projects WHERE id = ${projectId}`)).toBe(String(clientId))
    const subtotals = sql(
      `SELECT SUM(ii.qty * ii.unit_price) FROM invoices i JOIN invoice_items ii ON ii.invoice_id = i.id ` +
        `WHERE i.project_id = ${projectId} GROUP BY i.id ORDER BY i.id`,
    ).map((row) => Number(row[0]))
    expect(subtotals).toEqual([400, 300, 300])
    expect(one(`SELECT COUNT(*) FROM invoices WHERE project_id = ${projectId} AND vat_rate = 20`)).toBe("3")
    depositId = Number(one(`SELECT MIN(id) FROM invoices WHERE project_id = ${projectId}`))
  })

  it("7. the deposit invoice totals £480 including VAT", async () => {
    const r = await api<{ total: number; subtotal: number }>(`invoices.php?id=${depositId}`, { token: owner })
    expect(r.status).toBe(200)
    expect(r.json).toMatchObject({ subtotal: 400, total: 480 })
  })

  it("8. the payment link charges the VAT-inclusive deposit: 48000 pence", async () => {
    const r = await api("payments.php?action=link", { body: { invoice_id: depositId }, token: owner })
    expect(r.status).toBe(200)
    const sent = new URLSearchParams(providerRequests().at(-1)!.body)
    expect(sent.get("line_items[0][price_data][unit_amount]")).toBe("48000")
    expect(sent.get("metadata[invoice_id]")).toBe(String(depositId))
  })

  it("9. the signed webhook for that amount marks only the deposit paid", async () => {
    const payload = JSON.stringify({
      id: "evt_journey_deposit",
      type: "checkout.session.completed",
      data: { object: { payment_status: "paid", amount_total: 48000, currency: "gbp", metadata: { invoice_id: String(depositId) } } },
    })
    const r = await api("payments.php?action=webhook", { raw: payload, headers: { "Stripe-Signature": stripeSignature(payload) } })
    expect(r.status).toBe(200)
    expect(one(`SELECT status FROM invoices WHERE id = ${depositId}`)).toBe("paid")
    expect(one(`SELECT COUNT(*) FROM invoices WHERE project_id = ${projectId} AND status = 'paid'`)).toBe("1")
  })

  it("10. the client sees their project and invoices in the portal, and nothing of another client's", async () => {
    const otherId = createClient("Other Ltd")
    createUser({ email: "buyer@example.test", role: "client", clientId })
    const client = await login("buyer@example.test")

    const r = await api<Portal>(`portal.php?client_id=${otherId}`, { token: client })
    expect(r.status).toBe(200)
    expect(r.json.client.id).toBe(clientId)
    expect(r.json.projects.map((p) => p.id)).toEqual([projectId])
    expect(r.json.invoices).toHaveLength(3)
    expect(r.json.invoices.find((i) => i.id === depositId)?.status).toBe("paid")
  })
})
