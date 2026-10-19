/**
 * Pure logic for the portal's two requests: ask for an update and request a
 * call. No React and no fetches, so it is unit tested directly. The server is
 * the authority on every rule here; these only stop an obviously incomplete
 * form from being sent and pick out the client's open requests.
 */
import {
  BAD_REPLY_ERROR,
  CALL_SLOTS_MAX,
  CALL_TOPIC_MAX,
  type ApiResult,
  type CallRequestInput,
  type ClientThread,
  type PortalCallRequest,
} from "@/lib/api"

/** The words require_auth() in server/_bootstrap.php answers a wrong role with. */
export const ROLE_REFUSAL = "Not allowed."

/**
 * Whether a failed call to one of the portal's NEW client routes means the
 * route is not on the server yet, so the feature should be hidden or say "not
 * available yet" quietly rather than show an error. Use it only for those
 * routes: the calls list and call request (bookings.php ?action=mine and
 * ?action=request), the update request (support.php ?action=update_request),
 * and the asset list and supply (assets.php ?action=mine and ?action=supply).
 *
 * dist/ can go live before the PHP files are uploaded, and an older server
 * answers these routes in the ways below, each treated as "not available yet":
 *
 * - 503: the file is new but its SQL has not run.
 * - 403 with exactly "Not allowed.": the role gate of an older file. Older
 *   bookings.php and support.php are staff-only for these actions. The new
 *   files accept the client role on these routes, so a client never meets
 *   this refusal from them. Any other 403, such as "Your account is not
 *   linked to a client." or "Account is not active.", is a real refusal and
 *   stays an error.
 * - 405, with or without a JSON body: older bookings.php ends a POST action
 *   it does not know with "Method not allowed.", and the host may refuse a
 *   POST to a missing file the same way. The new files never answer these
 *   routes with a 405.
 * - 404 with no JSON body: the host's own page for a missing file. A 404 WITH
 *   a JSON error ("Item not found.", "Client not found.", "Project not
 *   found.") is about a record and stays an error.
 * - A reply that is not JSON at all (BAD_REPLY_ERROR): a file that was never
 *   uploaded, which .htaccess rewrites to app-shell.html with a 200.
 *
 * A network failure has no status and stays an error.
 */
export function notAvailableYet(res: Extract<ApiResult<unknown>, { ok: false }>): boolean {
  if (res.status === undefined) return false
  if (res.status === 503 || res.status === 405) return true
  if (res.status === 403) return res.details?.error === ROLE_REFUSAL
  if (res.status === 404) return res.details === undefined
  return res.error === BAD_REPLY_ERROR
}

/** The prefix support.php puts on an update request's subject. */
export const UPDATE_PREFIX = "Update request: "

export const isUpdateRequest = (subject: string) => subject.startsWith(UPDATE_PREFIX)

/** The client's update requests that are not yet resolved, newest first as the server lists them. */
export function openUpdateRequests(threads: ClientThread[]): ClientThread[] {
  return threads.filter((t) => isUpdateRequest(t.subject) && t.status !== "resolved")
}

/** Call requests still waiting on the owner, or confirmed and still to come. */
export function openCallRequests(calls: PortalCallRequest[], now = Date.now()): PortalCallRequest[] {
  return calls.filter((c) => c.status === "requested" || (c.status === "confirmed" && Date.parse(c.starts_at) > now))
}

export type SlotDraft = { date: string; time: string }
export type CallFormState = { topic: string; zone: string; slots: SlotDraft[] }

export const emptyCallForm = (zone: string): CallFormState => ({ topic: "", zone, slots: [{ date: "", time: "" }] })

const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^\d{2}:\d{2}$/

/** What stops the form being sent, or null when it is ready. */
export function callFormProblem(form: CallFormState): string | null {
  const topic = form.topic.trim()
  if (topic === "") return "Say briefly what the call is about."
  if (topic.length > CALL_TOPIC_MAX) return `Keep the topic under ${CALL_TOPIC_MAX} characters.`
  if (form.zone.trim() === "") return "Choose your time zone."
  const filled = form.slots.filter((s) => s.date !== "" || s.time !== "")
  if (filled.length === 0) return "Propose at least one time."
  if (filled.length > CALL_SLOTS_MAX) return `Propose up to ${CALL_SLOTS_MAX} times.`
  for (const [i, s] of filled.entries()) {
    if (!DATE.test(s.date) || !TIME.test(s.time)) return `Time ${i + 1} needs both a date and a time.`
  }
  const keys = filled.map((s) => `${s.date}T${s.time}`)
  if (new Set(keys).size !== keys.length) return "Each proposed time must be different."
  return null
}

/** The request body: trimmed topic, and only the slots the client filled in. */
export function callPayload(form: CallFormState): CallRequestInput {
  return {
    topic: form.topic.trim(),
    timezone: form.zone,
    slots: form.slots.filter((s) => s.date !== "" || s.time !== "").map((s) => ({ date: s.date, time: s.time })),
  }
}

/** Today's date in a zone, YYYY-MM-DD, for the date picker's lower bound. */
export function todayIn(zone: string, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now)
  } catch {
    return now.toISOString().slice(0, 10)
  }
}

/**
 * What the Requests panel shows. Any load failure is shown with a retry, even
 * when one of the two lists did arrive, so the panel never spins for ever.
 */
export function requestsLoadState(threads: unknown[] | null, calls: unknown[] | null, loadError: string | null): "error" | "loading" | "ready" {
  if (loadError) return "error"
  if (threads === null || calls === null) return "loading"
  return "ready"
}
