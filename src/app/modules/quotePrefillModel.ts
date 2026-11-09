import type { Client, Lead } from "@/lib/api"

// A quote drafted from an enquiry (Phase 7). It fills in what is already known and nothing more: the title, the
// client if the enquiry was converted, and one line for the kind of work. Prices, VAT and notes stay the owner's.
// The enquiry's message, budget and email are private to the leads screen and are never copied into a quote,
// which the client can see.

export type QuotePrefill = {
  title: string
  clientId: string
  lines: { description: string; qty: string; unit_price: string }[]
  /** True when the enquiry has not been converted to a client, so the quote has none yet. */
  needsClient: boolean
}

export function quotePrefill(lead: Lead, clients: Client[]): QuotePrefill {
  const who = (lead.company ?? "").trim() || lead.name.trim()
  const work = (lead.project_type ?? "").trim()
  const client = clients.find((c) => c.source_lead_id === lead.id)
  return {
    title: work ? `${work} for ${who}` : `Quote for ${who}`,
    clientId: client ? String(client.id) : "",
    lines: [{ description: work, qty: "1", unit_price: "" }],
    needsClient: !client,
  }
}
