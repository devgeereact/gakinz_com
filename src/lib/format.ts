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

/** Today's date in the browser's own time zone as YYYY-MM-DD (not UTC). */
export function localIsoDate(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** A YYYY-MM-DD date as "12 Oct", read as a local calendar day. */
export function formatYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

/**
 * An enquiry's follow-up state: "overdue" before today, "today", "upcoming"
 * after today, or null when there is no next action or the enquiry is closed.
 */
export function followUpState(
  lead: { status: string; next_action_at?: string | null },
  today = localIsoDate(),
): "overdue" | "today" | "upcoming" | null {
  const at = lead.next_action_at
  if (!at || lead.status === "won" || lead.status === "lost") return null
  return at < today ? "overdue" : at === today ? "today" : "upcoming"
}
