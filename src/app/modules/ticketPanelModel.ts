/** What the ticket panel shows. A finished load with no ticket is an error with a retry, never a skeleton. */
export function ticketPanelView(s: { loading: boolean; hasTicket: boolean }): "loading" | "ticket" | "error" {
  if (s.loading) return "loading"
  return s.hasTicket ? "ticket" : "error"
}
