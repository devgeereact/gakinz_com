/**
 * Pure logic for the "Records" group in the global search (server/search.php).
 * No React, so it is unit tested directly: which types a role may search, the
 * query rule, merging a reply into ordered groups, the route each result opens,
 * and a searcher that debounces typing and aborts a stale request.
 *
 * The server is the authority on every rule here. This file only keeps the
 * interface honest: it never asks for a type the role cannot read, and it
 * drops anything in a reply that the role should not have been sent.
 */
import {
  BAD_REPLY_ERROR,
  RECORD_QUERY_MAX,
  RECORD_QUERY_MIN,
  RECORD_RESULTS_PER_TYPE,
  RECORD_TYPES,
  type ApiResult,
  type RecordResult,
  type RecordSearchData,
  type RecordType,
} from "@/lib/api"
import { canAccess, moduleKeyForPath } from "@/lib/access"
import type { Role } from "@/store/auth.store"

export const RECORD_SEARCH_DEBOUNCE_MS = 250

/** The CMS module that owns each type: the same key the sidebar and route gate use. */
export const RECORD_TYPE_MODULE: Record<RecordType, string> = {
  client: "clients",
  project: "projects",
  enquiry: "leads",
  invoice: "invoicing",
  quote: "proposals",
}

/** The screen each type lives on, used when a reply carries no usable route. */
export const RECORD_TYPE_SCREEN: Record<RecordType, string> = {
  client: "/app/clients",
  project: "/app/projects",
  enquiry: "/app/leads",
  invoice: "/app/invoicing",
  quote: "/app/proposals",
}

export const RECORD_TYPE_LABEL: Record<RecordType, string> = {
  client: "Client",
  project: "Project",
  enquiry: "Enquiry",
  invoice: "Invoice",
  quote: "Quote",
}

/** The types a role may search: those whose owning module it can open. */
export function searchableTypes(role: Role | undefined): RecordType[] {
  return RECORD_TYPES.filter((t) => canAccess(role, RECORD_TYPE_MODULE[t]))
}

export function canSearchRecords(role: Role | undefined): boolean {
  return searchableTypes(role).length > 0
}

/** The trimmed query when it is 2 to 80 characters (counted as the server does), else null. */
export function searchQuery(raw: string): string | null {
  const q = raw.trim()
  const len = Array.from(q).length
  return len >= RECORD_QUERY_MIN && len <= RECORD_QUERY_MAX ? q : null
}

/**
 * The route a result opens. The server's route is used when it is a CMS path
 * on the screen that owns the type (so a deep link such as
 * /app/projects?project=12 is kept); anything else falls back to that screen.
 */
export function recordRoute(r: Pick<RecordResult, "type" | "route">): string {
  const screen = RECORD_TYPE_SCREEN[r.type]
  const route = typeof r.route === "string" ? r.route : ""
  if (!/^\/app\/[a-z]+(\?[A-Za-z0-9=&_-]*)?$/.test(route)) return screen
  const path = route.split("?")[0]
  return moduleKeyForPath(path) === RECORD_TYPE_MODULE[r.type] ? route : screen
}

export type RecordGroup = { type: RecordType; label: string; items: RecordResult[] }

function isResult(x: unknown): x is RecordResult {
  if (!x || typeof x !== "object") return false
  const r = x as Record<string, unknown>
  return (
    typeof r.type === "string" &&
    (RECORD_TYPES as readonly string[]).includes(r.type) &&
    typeof r.id === "number" &&
    typeof r.title === "string" &&
    typeof r.secondary === "string" &&
    typeof r.route === "string"
  )
}

/**
 * A reply as groups in the fixed type order, keeping only well-formed results
 * of types the role may read, each once, at most 8 per type, with the route
 * already checked. Empty groups are left out.
 */
export function mergeRecords(data: RecordSearchData, role: Role | undefined): RecordGroup[] {
  const allowed = new Set(searchableTypes(role))
  const seen = new Set<string>()
  const byType = new Map<RecordType, RecordResult[]>()
  for (const raw of Array.isArray(data.results) ? data.results : []) {
    if (!isResult(raw) || !allowed.has(raw.type)) continue
    const key = `${raw.type}:${raw.id}`
    if (seen.has(key)) continue
    const list = byType.get(raw.type) ?? []
    if (list.length >= RECORD_RESULTS_PER_TYPE) continue
    seen.add(key)
    list.push({ type: raw.type, id: raw.id, title: raw.title, secondary: raw.secondary, route: recordRoute(raw) })
    byType.set(raw.type, list)
  }
  return RECORD_TYPES.filter((t) => byType.has(t)).map((t) => ({
    type: t,
    label: RECORD_TYPE_LABEL[t],
    items: byType.get(t) as RecordResult[],
  }))
}

export type RecordSearchState =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "ok"; query: string; groups: RecordGroup[]; partial: boolean }
  | { status: "failed"; query: string; error: string }
  | { status: "hidden" } // the server has no record search yet, or refuses this role

/**
 * The state after a reply. A 404 (search.php not uploaded yet) hides the
 * group for the session rather than show an error on every keystroke. Any
 * other failure, a 403 included, is shown: a staff role refused here means the
 * server and access.ts disagree, which should be seen, not hidden. `partial`
 * is true when any type the server searched was unavailable, so the list may
 * be missing rows.
 */
export function stateFromReply(query: string, res: ApiResult<RecordSearchData>, role: Role | undefined): RecordSearchState {
  if (!res.ok) {
    if (res.status === 404) return { status: "hidden" }
    return { status: "failed", query, error: res.error }
  }
  const data = res.data
  if (!data || typeof data !== "object" || !Array.isArray(data.results)) {
    return { status: "failed", query, error: BAD_REPLY_ERROR }
  }
  const types = data.types && typeof data.types === "object" ? Object.values(data.types) : []
  return { status: "ok", query, groups: mergeRecords(data, role), partial: types.includes("unavailable") }
}

/** The menu value of a record item; unique across the whole menu. */
export function recordItemValue(r: Pick<RecordResult, "type" | "id">): string {
  return `record-${r.type}-${r.id}`
}

/**
 * Which menu item to select when a reply lands: the first record, so Enter
 * opens the best record match, unless the user has moved the selection
 * (arrow keys or pointer) since the query last changed. Null means leave the
 * selection alone.
 */
export function autoSelectRecord(state: RecordSearchState, userMoved: boolean): string | null {
  if (userMoved || state.status !== "ok") return null
  const first = state.groups[0]?.items[0]
  return first ? recordItemValue(first) : null
}

/** Keys with which cmdk moves the selection (its arrow, Home/End and Ctrl+N/P/J/K bindings). */
export function isSelectionKey(e: Pick<KeyboardEvent, "key" | "ctrlKey">): boolean {
  if (["ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return true
  return e.ctrlKey && ["n", "p", "j", "k"].includes(e.key)
}

export type RecordSearcherOptions = {
  role: Role | undefined
  find: (query: string, signal: AbortSignal) => Promise<ApiResult<RecordSearchData>>
  onState: (state: RecordSearchState) => void
  /** Called with the menu value to select when a reply lands (see autoSelectRecord). */
  onSelect?: (value: string) => void
  delayMs?: number
}

/**
 * Debounces typing and keeps only the newest request: each update cancels the
 * pending timer and aborts the request in flight, so a slow reply for "ac"
 * can never overwrite the results for "acme".
 */
export function createRecordSearcher(opts: RecordSearcherOptions) {
  const delay = opts.delayMs ?? RECORD_SEARCH_DEBOUNCE_MS
  let timer: ReturnType<typeof setTimeout> | null = null
  let controller: AbortController | null = null
  let hidden = !canSearchRecords(opts.role)
  let last: RecordSearchState | null = null
  let moved = false // the user moved the selection since the query last changed

  const emit = (s: RecordSearchState) => {
    last = s
    opts.onState(s)
  }
  const cancel = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    controller?.abort()
    controller = null
  }

  return {
    /** The user moved the menu selection: arriving records leave it alone. */
    markMoved(): void {
      moved = true
    },
    update(raw: string): void {
      cancel()
      moved = false
      if (hidden) {
        if (last?.status !== "hidden") emit({ status: "hidden" })
        return
      }
      const q = searchQuery(raw)
      if (q === null) {
        emit({ status: "idle" })
        return
      }
      emit({ status: "loading", query: q })
      timer = setTimeout(async () => {
        timer = null
        const mine = new AbortController()
        controller = mine
        const res = await opts.find(q, mine.signal)
        if (mine.signal.aborted) return
        controller = null
        if (!res.ok && res.status === 403) {
          console.warn("Record search refused this role (403). server/search.php and src/lib/access.ts may disagree.")
        }
        const next = stateFromReply(q, res, opts.role)
        if (next.status === "hidden") hidden = true
        emit(next)
        const pick = autoSelectRecord(next, moved)
        if (pick) opts.onSelect?.(pick)
      }, delay)
    },
    dispose(): void {
      cancel()
    },
  }
}
