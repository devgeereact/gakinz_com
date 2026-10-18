/**
 * Pure logic for the portal's two requests: ask for an update and request a
 * call. No React and no fetches, so it is unit tested directly. The server is
 * the authority on every rule here; these only stop an obviously incomplete
 * form from being sent and pick out the client's open requests.
 */
import { CALL_SLOTS_MAX, CALL_TOPIC_MAX, type CallRequestInput, type ClientThread, type PortalCallRequest } from "@/lib/api"

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
