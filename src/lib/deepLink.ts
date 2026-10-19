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
