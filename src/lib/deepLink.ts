/**
 * Record deep links for CMS screens. The Today attention list (server/today.php)
 * sends a route per item; these read the parameters back on the screen that
 * holds the record. Pure functions over URLSearchParams, so they are unit
 * tested. An id that is missing, malformed or not on the screen is ignored and
 * the plain screen shows, never an error.
 *
 *   /app/projects?project=<id>[&task=<id> | &asset=<id>]
 *   /app/invoicing?invoice=<id>
 *   /app/leads?enquiry=<id>                 (also with the existing ?due=1)
 *   /app/leads?view=calls&call=<id>
 *   /app/clients?client=<id>               (opens the client's detail sheet)
 *   /app/support?ticket=<id>               (opens the ticket, e.g. from its time on /app/time)
 *
 * Quotes have no detail view on /app/proposals, so the search opens that
 * screen plainly.
 */

const ID = /^[1-9]\d{0,9}$/
const INT_MAX = 2147483647

/** A positive database id from a query parameter, or null. */
export function idParam(params: URLSearchParams, key: string): number | null {
  const v = params.get(key)
  if (v === null || !ID.test(v)) return null
  const n = Number(v)
  return n <= INT_MAX ? n : null
}

export type ProjectsLink = { project: number | null; task: number | null; asset: number | null }

/** A task or asset only counts with the project that holds it. */
export function projectsLink(params: URLSearchParams): ProjectsLink {
  const project = idParam(params, "project")
  if (project === null) return { project: null, task: null, asset: null }
  return { project, task: idParam(params, "task"), asset: idParam(params, "asset") }
}

export function invoicingLink(params: URLSearchParams): { invoice: number | null } {
  return { invoice: idParam(params, "invoice") }
}

export function clientsLink(params: URLSearchParams): { client: number | null } {
  return { client: idParam(params, "client") }
}

export function supportLink(params: URLSearchParams): { ticket: number | null } {
  return { ticket: idParam(params, "ticket") }
}

/** `call` only counts inside the Calls view, where calls are listed. */
export function leadsLink(params: URLSearchParams): { enquiry: number | null; call: number | null } {
  const calls = params.get("view") === "calls"
  return { enquiry: calls ? null : idParam(params, "enquiry"), call: calls ? idParam(params, "call") : null }
}

/** The element id a linked record is rendered with, so it can be scrolled to. */
export const recordElementId = (kind: "task" | "asset" | "invoice" | "call", id: number) => `record-${kind}-${id}`

/** Classes for the record a link points at. */
export const LINKED_RECORD = "ring-2 ring-acc ring-offset-2 ring-offset-background"

/** For a table row, where an outline does not draw reliably. */
export const LINKED_ROW = "bg-acc-soft"

/**
 * Applying a link while the screen stays mounted. A screen reads its link on
 * every render and applies it (opens the project or enquiry, scrolls to the
 * record) only when the link is new:
 *
 *   - the link value differs from the one last applied, or
 *   - the navigation carries a fresh nonce in its history state.
 *
 * The nonce is how the global search re-applies a link the user is already on:
 * picking the same record twice is the same URL, so only the state tells the
 * two navigations apart. Ordinary URL changes on the screen (a filter, the
 * Calls toggle) carry no nonce, so they never reopen a drawer the user closed
 * or undo a project the user picked. An empty link is never applied and does
 * not replace the last one, so leaving and re-entering a view inside the
 * screen does not count as a new link either.
 */
export const LINK_NONCE = "gkLinkNonce"

export type LinkMark = { value: string; nonce: string | null }

let nonceSeq = 0

/** History state for a navigation that must apply its link even on the same URL. */
export function linkNavigationState(): Record<typeof LINK_NONCE, string> {
  nonceSeq += 1
  return { [LINK_NONCE]: `${Date.now().toString(36)}-${nonceSeq}` }
}

/** The nonce in a location's state, or null. */
export function linkNonce(state: unknown): string | null {
  if (!state || typeof state !== "object") return null
  const v = (state as Record<string, unknown>)[LINK_NONCE]
  return typeof v === "string" && v !== "" ? v : null
}

/** A stable description of a parsed link plus the navigation's nonce. */
export function linkMark(link: Record<string, number | null>, state: unknown): LinkMark {
  const value = Object.keys(link)
    .sort()
    .filter((k) => link[k] !== null)
    .map((k) => `${k}=${link[k]}`)
    .join("&")
  return { value, nonce: linkNonce(state) }
}

/** Whether `next` should be applied, given the mark applied last (null before any). */
export function isNewLink(last: LinkMark | null, next: LinkMark): boolean {
  if (next.value === "") return false
  if (last === null || last.value !== next.value) return true
  return next.nonce !== null && next.nonce !== last.nonce
}

/** A short string for a mark, used to key a scroll-into-view so a re-applied link scrolls again. */
export const linkRevision = (m: LinkMark) => `${m.value}#${m.nonce ?? ""}`
