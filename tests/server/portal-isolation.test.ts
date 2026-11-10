/**
 * V1 finish line item 7: a client signs in to the portal and sees only their own project, invoice and files.
 * This is the whole-surface matrix: signed out, the wrong role and the other client, against the portal and
 * against every staff endpoint a client might try. (File-by-file isolation is in portal-files.test.ts, tickets in
 * support-client.test.ts, and the happy path in journey.test.ts step 10.)
 */
import { beforeAll, describe, expect, it } from "vitest"
import { api, createClient, createInvoice, createUser, login, one, q, resetDb, sql } from "./helpers"

let clientA: number
let clientB: number
let invoiceB: number
let projectB: number
let tokenA: string
let owner: string
const tokens: Record<string, string> = {}

beforeAll(async () => {
  resetDb()
  clientA = createClient("Alpha Isolation Ltd", "alpha@example.test")
  clientB = createClient("Bravo Secret Ltd", "bravo@example.test")
  sql(`INSERT INTO projects (client_id, name, status) VALUES (${clientA}, 'Alpha site', 'in_progress'), (${clientB}, 'Bravo confidential relaunch', 'in_progress')`)
  projectB = Number(one(`SELECT id FROM projects WHERE client_id = ${clientB}`))
  createInvoice(clientA, [[1, 100]], 20)
  invoiceB = createInvoice(clientB, [[1, 777]], 20)
  sql(`UPDATE invoices SET number = 'BRAVO-777' WHERE id = ${invoiceB}`)
  createUser({ email: "owner@example.test", role: "super_admin" })
  createUser({ email: "a@example.test", role: "client", clientId: clientA })
  createUser({ email: "unlinked@example.test", role: "client" })
  for (const role of ["employee", "trainer", "editor"]) createUser({ email: `${role}@example.test`, role })
  owner = await login("owner@example.test")
  tokenA = await login("a@example.test")
  tokens.unlinked = await login("unlinked@example.test")
  for (const role of ["employee", "trainer", "editor"]) tokens[role] = await login(`${role}@example.test`)
})

describe("the portal shows a client only their own records", () => {
  it("ignores a client_id and returns nothing that belongs to the other client", async () => {
    const r = await api<{ client: { id: number }; projects: Array<{ name: string }>; invoices: Array<{ number: string }> }>(`portal.php?client_id=${clientB}`, { token: tokenA })
    expect(r.status).toBe(200)
    expect(r.json.client.id).toBe(clientA)
    const text = JSON.stringify(r.json)
    for (const secret of ["Bravo", "bravo@example.test", "BRAVO-777", "777"]) expect(text).not.toContain(secret)
    expect(r.json.projects.map((p) => p.name)).toEqual(["Alpha site"])
  })

  it("refuses a signed-out caller", async () => {
    expect((await api(`portal.php?client_id=${clientB}`)).status).toBe(401)
  })

  it("refuses a client account that is not linked to a client", async () => {
    expect((await api("portal.php", { token: tokens.unlinked })).status).toBe(403)
  })

  it.each(["employee", "trainer", "editor"])("refuses the %s role a look at any client's portal", async (role) => {
    expect((await api(`portal.php?client_id=${clientB}`, { token: tokens[role] })).status).toBe(403)
  })

  it("lets the owner preview a client's portal, so the refusals above are about role and not a broken route", async () => {
    const r = await api<{ client: { id: number } }>(`portal.php?client_id=${clientB}`, { token: owner })
    expect(r.status).toBe(200)
    expect(r.json.client.id).toBe(clientB)
  })
})

describe("a client is refused by every staff endpoint, and a signed-out caller by all of them", () => {
  const staff: Array<[string, string, unknown?]> = [
    ["GET", "invoices.php"],
    ["GET", "invoices.php?id=INVOICE_B"],
    ["POST", "invoices.php?action=record_payment", { id: "INVOICE_B", method: "cash", paid_on: "2026-01-01", amount: "1" }],
    ["POST", "payments.php?action=link", { invoice_id: "INVOICE_B" }],
    ["GET", "clients.php"],
    ["GET", "clients.php?id=CLIENT_B"],
    ["POST", "clients.php?action=update", { id: "CLIENT_B", company: "Hijacked" }],
    ["GET", "projects.php"],
    ["GET", "projects.php?id=PROJECT_B"],
    ["GET", "leads.php"],
    ["GET", "proposals.php"],
    ["GET", "files.php"],
    ["GET", "tasks.php"],
    ["GET", "users.php"],
    ["GET", "certificates.php"],
    ["GET", "privacy.php?action=retention_report"],
  ]
  const fill = (s: string) => s.replace("INVOICE_B", String(invoiceB)).replace("CLIENT_B", String(clientB)).replace("PROJECT_B", String(projectB))
  const fillBody = (b: unknown) => (b === undefined ? undefined : JSON.parse(fill(JSON.stringify(b))))

  it.each(staff)("%s %s answers 403 to a client and 401 to nobody", async (method, path, body) => {
    const url = fill(path)
    const asClient = await api(url, { method, body: fillBody(body), token: tokenA })
    expect(asClient.status).toBe(403)
    const anon = await api(url, { method, body: fillBody(body) })
    expect(anon.status).toBe(401)
  })

  it("left the other client's data exactly as it was", () => {
    expect(one(`SELECT company FROM clients WHERE id = ${clientB}`)).toBe("Bravo Secret Ltd")
    expect(one(`SELECT status FROM invoices WHERE id = ${invoiceB}`)).toBe("sent")
  })
})
