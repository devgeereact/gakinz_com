/**
 * Pure state for the Today attention list (server/today.php). No React and no
 * fetches, so it is unit tested directly. The server decides what each section
 * holds and which sections a role receives; this file only turns a reply, or a
 * failed reply, into rows the screen can draw without ever showing a zero for
 * a source that did not load.
 */
import {
  BAD_REPLY_ERROR,
  TODAY_SECTION_KEYS,
  type ApiResult,
  type TodayData,
  type TodayItem,
  type TodaySectionKey,
} from "@/lib/api"
import { followUpState, localIsoDate } from "@/lib/format"
import { notAvailableYet } from "@/lib/notAvailable"
import type { Role } from "@/store/auth.store"

export const TODAY_SECTION_LABELS: Record<TodaySectionKey, string> = {
  new_enquiries: "New enquiries",
  follow_ups_due: "Follow-ups due",
  calls: "Calls",
  overdue_tasks: "Overdue tasks",
  waiting_material: "Waiting client material",
  unpaid_invoices: "Unpaid invoices",
}

/**
 * Mirror of TODAY_SECTIONS in server/today.php, which mirrors the role
 * constant of each section's source endpoint. Used only to decide which
 * sections to show as unavailable when the whole request fails, so a failed
 * load still shows "Unavailable" for unpaid invoices instead of hiding them.
 * Not a security boundary: the server omits what a role cannot read.
 */
const LEADS: Role[] = ["super_admin", "admin", "manager", "editor"]
const DELIVERY: Role[] = ["super_admin", "admin", "manager", "editor", "employee"]
const SECTION_ROLES: Record<TodaySectionKey, Role[]> = {
  new_enquiries: LEADS,
  follow_ups_due: LEADS,
  calls: LEADS,
  overdue_tasks: DELIVERY,
  waiting_material: DELIVERY,
  unpaid_invoices: ["super_admin", "admin", "manager"],
}

/** The sections a role should receive, in screen order. */
export function expectedSections(role: Role | null | undefined): TodaySectionKey[] {
  if (!role) return []
  return TODAY_SECTION_KEYS.filter((k) => SECTION_ROLES[k].includes(role))
}

export type TodayView = {
  /** The last reply, or null when the latest load failed. */
  data: TodayData | null
  /** generated_at of the last successful load (UTC ISO), kept across failures. */
  updatedAt: string | null
  /** Why the latest load failed, or null. */
  error: string | null
  /**
   * True when the latest load showed today.php is not on the server yet (the
   * shared rule in src/lib/notAvailable.ts). The screen then falls back to the
   * client-side "Follow-ups due" card instead of an error.
   */
  notOnServer?: boolean
}

export const initialTodayView: TodayView = { data: null, updatedAt: null, error: null }

function isTodayData(v: unknown): v is TodayData {
  if (!v || typeof v !== "object") return false
  const d = v as { generated_at?: unknown; sections?: unknown }
  return typeof d.generated_at === "string" && !!d.sections && typeof d.sections === "object" && !Array.isArray(d.sections)
}

/**
 * The next view after a load. A failure drops the previous data, so nothing
 * stale is presented as current, but keeps the time of the last success.
 */
export function applyTodayResult(prev: TodayView, res: ApiResult<unknown>): TodayView {
  if (res.ok && isTodayData(res.data)) return { data: res.data, updatedAt: res.data.generated_at, error: null }
  if (!res.ok && notAvailableYet(res)) return { data: null, updatedAt: prev.updatedAt, error: null, notOnServer: true }
  return { data: null, updatedAt: prev.updatedAt, error: res.ok ? BAD_REPLY_ERROR : res.error }
}

export type TodayRow =
  | { key: TodaySectionKey; label: string; state: "unavailable" }
  | { key: TodaySectionKey; label: string; state: "empty" }
  | { key: TodaySectionKey; label: string; state: "items"; count: number; items: TodayItem[]; more: number }

/**
 * One row per section to draw, in screen order. With data, the server is the
 * authority on which sections exist. Without data (the load failed), every
 * section the role should receive is shown as unavailable.
 */
export function todayRows(view: TodayView, role: Role | null | undefined): TodayRow[] {
  const label = (key: TodaySectionKey) => TODAY_SECTION_LABELS[key]
  if (!view.data) return expectedSections(role).map((key) => ({ key, label: label(key), state: "unavailable" }))
  const { sections } = view.data
  return TODAY_SECTION_KEYS.filter((key) => sections[key] !== undefined).map((key): TodayRow => {
    const s = sections[key]!
    const items = Array.isArray(s.items) ? s.items : []
    if (s.status !== "ok" || typeof s.count !== "number") return { key, label: label(key), state: "unavailable" }
    if (s.count === 0 && items.length === 0) return { key, label: label(key), state: "empty" }
    return { key, label: label(key), state: "items", count: s.count, items, more: Math.max(0, s.count - items.length) }
  })
}

/**
 * The screen that lists a whole section, for its "And N more" link: the list
 * view, not any one record, since the remaining items are not on Today.
 */
export const TODAY_SECTION_SCREENS: Record<TodaySectionKey, string> = {
  new_enquiries: "/app/leads",
  follow_ups_due: "/app/leads?due=1",
  calls: "/app/leads?view=calls",
  overdue_tasks: "/app/projects",
  waiting_material: "/app/projects",
  unpaid_invoices: "/app/invoicing",
}

export const sectionRoute = (key: TodaySectionKey): string => TODAY_SECTION_SCREENS[key]

/** Only an in-app CMS path is followed; anything else opens Today itself. */
export function itemRoute(item: Pick<TodayItem, "route">): string {
  return /^\/app\/[a-z][a-z0-9-]*(\?[a-z0-9=&_-]*)?$/i.test(item.route) ? item.route : "/app"
}

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * When an item is due or happens: "12 Oct" for a due date, "12 Oct, 14:30"
 * for a moment, shown in the browser's zone unless one is given.
 */
export function itemWhen(at: string | null, timeZone?: string): string {
  if (!at) return ""
  const ymd = YMD.exec(at)
  if (ymd) {
    const d = new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])))
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
  }
  const t = Date.parse(at)
  if (Number.isNaN(t)) return ""
  return new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone })
}

/** "08:30" for the last successful load, or null before the first one. */
export function updatedLabel(view: TodayView, timeZone?: string): string | null {
  if (!view.updatedAt) return null
  const t = Date.parse(view.updatedAt)
  if (Number.isNaN(t)) return null
  return new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone })
}

export type TodayPanel =
  | { kind: "none" }
  | { kind: "failed"; error: string }
  | { kind: "rows"; rows: TodayRow[] }
  | { kind: "follow_ups" }

/**
 * What the attention list shows as a whole. When today.php is not on the
 * server yet, a role that would get follow-ups sees the client-side
 * "Follow-ups due" card (built from the enquiries list) and any other role
 * sees nothing, never an error. A failed load always shows: as unavailable
 * sections when the role is known, or, before the role is known, as a single
 * "could not be loaded" alert with Retry, never an empty space.
 */
export function todayPanel(view: TodayView, role: Role | null | undefined): TodayPanel {
  if (view.notOnServer && !view.data) {
    return expectedSections(role).includes("follow_ups_due") ? { kind: "follow_ups" } : { kind: "none" }
  }
  const rows = todayRows(view, role)
  if (rows.length > 0) return { kind: "rows", rows }
  if (!view.data && view.error) return { kind: "failed", error: view.error }
  return { kind: "none" }
}

export type FollowUpLead = {
  status: string
  next_action_at?: string | null
  priority?: number | null
}

export type FollowUps<L> = {
  /** False until the server sends the follow-up fields (the 2026-10-10 schema step). */
  ready: boolean
  count: number
  top: L[]
  today: string
}

/**
 * The fallback "Follow-ups due" card, used only while today.php is not on the
 * server: open enquiries whose next action is today or earlier, oldest first,
 * then the owner's priority, at most five. `ready` is false until the server
 * has the follow-up columns (it omits them before that schema step runs).
 */
export function fallbackFollowUps<L extends FollowUpLead>(leads: L[], today = localIsoDate()): FollowUps<L> {
  const due = leads
    .filter((l) => {
      const st = followUpState(l, today)
      return st === "overdue" || st === "today"
    })
    .sort((a, b) => (a.next_action_at ?? "").localeCompare(b.next_action_at ?? "") || (b.priority ?? 0) - (a.priority ?? 0))
  return {
    ready: leads.length === 0 || leads.some((l) => l.priority !== undefined),
    count: due.length,
    top: due.slice(0, 5),
    today,
  }
}
