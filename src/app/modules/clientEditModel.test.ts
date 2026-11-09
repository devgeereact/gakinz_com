import { describe, expect, it } from "vitest"
import type { Client } from "@/lib/api"
import { clientFormFrom, clientFormProblem, clientPatch } from "./clientEditModel"

const client: Client = {
  id: 7, company: "Acme Ltd", contact_name: "Ann", email: "ann@acme.test", phone: null, tag: "retainer",
  retainer_amount: 120, notes: null, source_lead_id: null, created_at: "2026-11-01 09:00:00",
}

describe("clientFormFrom", () => {
  it("fills every field, with empty text for the ones the client does not have", () => {
    expect(clientFormFrom(client)).toEqual({ company: "Acme Ltd", contact_name: "Ann", email: "ann@acme.test", phone: "", tag: "retainer", retainer_amount: 120, notes: "" })
  })
})

describe("clientFormProblem", () => {
  const ok = clientFormFrom(client)
  it("needs a company name", () => {
    expect(clientFormProblem({ ...ok, company: "  " })).toMatch(/company/i)
    expect(clientFormProblem(ok)).toBeNull()
  })
  it("accepts one valid address or none, and refuses anything else", () => {
    expect(clientFormProblem({ ...ok, email: "" })).toBeNull()
    expect(clientFormProblem({ ...ok, email: "not-an-email" })).toMatch(/email/i)
    expect(clientFormProblem({ ...ok, email: "a@b.test, c@d.test" })).toMatch(/email/i)
  })
  it("refuses a negative retainer", () => {
    expect(clientFormProblem({ ...ok, retainer_amount: -1 })).toMatch(/retainer/i)
  })
})

describe("clientPatch", () => {
  it("sends only what changed, trimmed", () => {
    expect(clientPatch(client, { ...clientFormFrom(client), phone: " 0123 ", notes: "Pays late" })).toEqual({ phone: "0123", notes: "Pays late" })
  })
  it("sends nothing when nothing changed", () => {
    expect(clientPatch(client, clientFormFrom(client))).toEqual({})
  })
  it("sends the retainer and tag when they change", () => {
    expect(clientPatch(client, { ...clientFormFrom(client), tag: "vip", retainer_amount: 0 })).toEqual({ tag: "vip", retainer_amount: 0 })
  })
})
