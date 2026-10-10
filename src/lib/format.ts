// Shared number / currency formatting for GAkinzOS (CMS).
// One source of truth so figures read consistently across every module —
// see docs/DECISIONS.md D-006 (aligned numeric tables, consistent number formatting).
// All en-GB. Two currency tempos:
//   money() — whole-pound, for KPI tiles / dashboards (no pence noise)
//   gbp()   — 2-decimal precise, for invoices / line items / anything billed

const WHOLE = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
})

const PRECISE = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
})

/** Whole-pound currency for KPIs / summaries (e.g. £12,400). */
export function money(n: number, currency = "GBP") {
  if (currency === "GBP") return WHOLE.format(n)
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

/** Precise 2-decimal currency for invoices / billed line items (e.g. £12,400.00). */
export function gbp(n: number) {
  return PRECISE.format(n)
}

/** Plain grouped number (e.g. 1,234). */
export function num(n: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits }).format(n)
}
