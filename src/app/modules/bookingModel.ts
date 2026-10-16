/**
 * Pure logic for call bookings (Enquiries) and private feedback (Clients and
 * the portal). No React and no fetches, so it is unit tested directly.
 * The status rules mirror server/bookings.php; the server is the authority.
 */
import type { Booking, BookingEvent, BookingStatus, FeedbackFollowUp, FeedbackInput } from "@/lib/api"

type Tone = "ok" | "warn" | "bad" | "acc" | "secondary"

// "Requested" always says it is not confirmed, so a request is never read as a booked call.
export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: Tone }> = {
  requested: { label: "Requested, not confirmed", tone: "warn" },
  confirmed: { label: "Confirmed", tone: "ok" },
  completed: { label: "Completed", tone: "secondary" },
  cancelled: { label: "Cancelled", tone: "bad" },
}

export const BOOKING_NEXT: Record<BookingStatus, BookingStatus[]> = {
  requested: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
}

export const canReschedule = (s: BookingStatus) => s === "requested" || s === "confirmed"

/** The zones offered in the picker: London first, the viewer's own, then common ones. */
export const COMMON_ZONES = [
  "Europe/London",
  "UTC",
  "Europe/Dublin",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Lagos",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Australia/Sydney",
]

export function zoneOptions(viewerZone: string | undefined, current?: string): string[] {
  const out = ["Europe/London"]
  for (const z of [current, viewerZone, ...COMMON_ZONES]) if (z && !out.includes(z)) out.push(z)
  return out
}

export function viewerZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return undefined
  }
}

function fmt(utc: string, zone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(utc))
}

/**
 * A call's time in the zone it was agreed in, and, when the viewer is in a
 * different zone and the clock reads differently there, the viewer's own time.
 */
export function formatCallTime(startsAtUtc: string, zone: string, viewer?: string): { agreed: string; yours: string | null } {
  const agreed = `${fmt(startsAtUtc, zone)} ${zone}`
  if (!viewer || viewer === zone) return { agreed, yours: null }
  const a = fmt(startsAtUtc, zone)
  const y = fmt(startsAtUtc, viewer)
  return { agreed, yours: a === y ? null : `${y} your time` }
}

/** Open calls still to come, soonest first; then everything else, newest first. */
export function sortCalls(list: Booking[], now = Date.now()): Booking[] {
  const open = (b: Booking) => canReschedule(b.status) && Date.parse(b.starts_at) >= now
  const upcoming = list.filter(open).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const rest = list.filter((b) => !open(b)).sort((a, b) => b.starts_at.localeCompare(a.starts_at))
  return [...upcoming, ...rest]
}

/** An open call whose time has passed: the owner still needs to record what happened. */
export const isOverdueCall = (b: Booking, now = Date.now()) =>
  canReschedule(b.status) && Date.parse(b.starts_at) + b.duration_min * 60_000 < now

/** The latest customer email on a call, when it failed and can be retried. */
export function failedNotice(b: Booking): BookingEvent | null {
  const ev = b.history.find((e) => e.notify_status !== null)
  return ev && ev.notify_status === "failed" ? ev : null
}

/** Who the call is with, for lists that are not already inside a record. */
export function callWith(b: Booking): string {
  return b.client_company || b.enquiry_company || b.enquiry_name || "Unlinked call"
}

/** One line of history, in plain words. */
export function describeEvent(e: BookingEvent): string {
  if (e.kind === "created") return `Recorded as ${BOOKING_STATUS[e.to_status ?? "requested"].label.toLowerCase()}`
  if (e.kind === "rescheduled" && e.from_starts_at && e.from_timezone) {
    return `Moved from ${formatCallTime(e.from_starts_at, e.from_timezone).agreed}`
  }
  if (e.kind === "status" && e.to_status) return `Marked ${BOOKING_STATUS[e.to_status].label.toLowerCase()}`
  return "Changed"
}

export function noticeText(e: BookingEvent): string | null {
  if (e.notify_status === "sent") return `Customer emailed${e.notify_to ? ` at ${e.notify_to}` : ""}`
  if (e.notify_status === "failed") return `Email to the customer failed${e.notify_error ? `: ${e.notify_error}` : ""}`
  if (e.notify_status === "sending") return "Email to the customer is sending"
  return null
}

/** Only links that are plainly web addresses become clickable. */
export const isWebLink = (s: string | null | undefined): s is string => !!s && /^https?:\/\/\S+$/i.test(s.trim())

/** A local date-time input value (YYYY-MM-DDTHH:MM) is well formed. */
export const validLocal = (v: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)

export const FOLLOW_UP_LABEL: Record<FeedbackFollowUp, string> = {
  new: "New",
  following_up: "Following up",
  closed: "Closed",
}

export type FeedbackFormState = {
  project_id: number | null
  rating: number | null
  went_well: string
  could_improve: string
  follow_up_ok: boolean
  may_publish: boolean
  attribution: string
}

export const EMPTY_FEEDBACK: FeedbackFormState = {
  project_id: null,
  rating: null,
  went_well: "",
  could_improve: "",
  follow_up_ok: false,
  may_publish: false,
  attribution: "",
}

/** The request body: blanks become null, and an attribution goes only with permission to quote. */
export function feedbackPayload(f: FeedbackFormState): FeedbackInput {
  return {
    project_id: f.project_id,
    rating: f.rating,
    went_well: f.went_well.trim() || null,
    could_improve: f.could_improve.trim() || null,
    follow_up_ok: f.follow_up_ok,
    may_publish: f.may_publish,
    attribution: f.may_publish ? f.attribution.trim() || null : null,
  }
}

/** A feedback form is worth sending once it has a rating or some words. */
export function feedbackReady(f: { rating: number | null; went_well: string; could_improve: string }): boolean {
  return f.rating !== null || f.went_well.trim() !== "" || f.could_improve.trim() !== ""
}
