import { describe, expect, it } from "vitest"
import type { Client, Lead } from "@/lib/api"
import { quotePrefill } from "./quotePrefillModel"

const lead = (over: Partial<Lead> = {}): Lead => ({
  id: 5, name: "Ann Smith", email: "ann@acme.test", company: "Acme Ltd", budget: "£5k", project_type: "Website design",
  message: "We need a new site.", status: "contacted", source: "website", tags: null, score: 2, lost_reason: null, created_at: "2026-11-01", ...over,
})
const client = (id: number, source_lead_id: number | null): Client => ({
  id, company: "Acme Ltd", contact_name: null, email: null, phone: null, tag: "one-off", retainer_amount: 0, notes: null, source_lead_id, created_at: "2026-11-01",
})

describe("quotePrefill", () => {
  it("titles the quote from the work and the company, with one line for that work", () => {
    const q = quotePrefill(lead(), [])
    expect(q.title).toBe("Website design for Acme Ltd")
    expect(q.lines).toEqual([{ description: "Website design", qty: "1", unit_price: "" }])
  })
  it("uses the person's name when there is no company, and a plain title when there is no work type", () => {
    expect(quotePrefill(lead({ company: null, project_type: null }), []).title).toBe("Quote for Ann Smith")
    expect(quotePrefill(lead({ company: "  ", project_type: "" }), []).lines).toEqual([{ description: "", qty: "1", unit_price: "" }])
  })
  it("attaches the client this enquiry was converted into, and says so", () => {
    const q = quotePrefill(lead(), [client(2, 9), client(3, 5)])
    expect(q.clientId).toBe("3")
    expect(q.needsClient).toBe(false)
  })
  it("leaves the client empty and asks for the conversion when there is none", () => {
    const q = quotePrefill(lead(), [client(2, 9)])
    expect(q.clientId).toBe("")
    expect(q.needsClient).toBe(true)
  })
  it("never copies the enquiry's message, budget or email into the quote", () => {
    expect(JSON.stringify(quotePrefill(lead(), []))).not.toMatch(/new site|£5k|ann@acme/)
  })
})
