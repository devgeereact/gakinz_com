import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { BAD_REPLY_ERROR, NETWORK_ERROR, type ApiResult, type RecordResult, type RecordSearchData } from "@/lib/api"
import {
  RECORD_SEARCH_DEBOUNCE_MS,
  canSearchRecords,
  createRecordSearcher,
  mergeRecords,
  recordRoute,
  searchQuery,
  searchableTypes,
  stateFromReply,
  type RecordSearchState,
} from "./recordSearchModel"

const res = (type: RecordResult["type"], id: number, route = ""): RecordResult => ({
  type,
  id,
  title: `${type} ${id}`,
  secondary: "",
  route,
})
const reply = (results: unknown[], types: RecordSearchData["types"] = {}): RecordSearchData =>
  ({ query: "q", types, results }) as RecordSearchData

describe("searchableTypes", () => {
  it("mirrors each owning module's role list", () => {
    expect(searchableTypes("super_admin")).toEqual(["client", "project", "enquiry", "invoice", "quote"])
    expect(searchableTypes("manager")).toEqual(["client", "project", "enquiry", "invoice", "quote"])
    expect(searchableTypes("editor")).toEqual(["client", "project", "enquiry", "quote"])
    expect(searchableTypes("employee")).toEqual(["project"])
    expect(searchableTypes("trainer")).toEqual([])
    expect(searchableTypes("client")).toEqual([])
    expect(searchableTypes(undefined)).toEqual([])
  })

  it("lets only roles with at least one type search", () => {
    expect(canSearchRecords("employee")).toBe(true)
    expect(canSearchRecords("trainer")).toBe(false)
    expect(canSearchRecords("client")).toBe(false)
  })
})

describe("searchQuery", () => {
  it("trims and accepts 2 to 80 characters", () => {
    expect(searchQuery("  ac ")).toBe("ac")
    expect(searchQuery("a")).toBeNull()
    expect(searchQuery("   ")).toBeNull()
    expect(searchQuery("x".repeat(80))).toBe("x".repeat(80))
    expect(searchQuery("x".repeat(81))).toBeNull()
  })

  it("counts a character outside the basic plane once, as the server does", () => {
    expect(searchQuery("😀".repeat(80))).toBe("😀".repeat(80))
    expect(searchQuery("😀")).toBeNull()
  })
})

describe("recordRoute", () => {
  it("keeps a deep link on the screen that owns the type", () => {
    expect(recordRoute({ type: "project", route: "/app/projects?project=12" })).toBe("/app/projects?project=12")
    expect(recordRoute({ type: "enquiry", route: "/app/leads?enquiry=3" })).toBe("/app/leads?enquiry=3")
    expect(recordRoute({ type: "invoice", route: "/app/invoicing?invoice=9" })).toBe("/app/invoicing?invoice=9")
  })

  it("falls back to the type's screen for a route elsewhere, off site or malformed", () => {
    expect(recordRoute({ type: "invoice", route: "/app/clients" })).toBe("/app/invoicing")
    expect(recordRoute({ type: "client", route: "https://evil.example/app/clients" })).toBe("/app/clients")
    expect(recordRoute({ type: "client", route: "//evil.example" })).toBe("/app/clients")
    expect(recordRoute({ type: "quote", route: "/app/proposals?x=<script>" })).toBe("/app/proposals")
    expect(recordRoute({ type: "quote", route: "" })).toBe("/app/proposals")
  })
})

describe("mergeRecords", () => {
  it("groups in a fixed type order whatever order the reply uses", () => {
    const groups = mergeRecords(reply([res("quote", 1), res("client", 2), res("project", 3)]), "admin")
    expect(groups.map((g) => [g.type, g.label, g.items.map((i) => i.id)])).toEqual([
      ["client", "Client", [2]],
      ["project", "Project", [3]],
      ["quote", "Quote", [1]],
    ])
  })

  it("drops types the role cannot read, duplicates, malformed rows and anything past 8 per type", () => {
    const many = Array.from({ length: 10 }, (_, i) => res("project", i + 1))
    const groups = mergeRecords(
      reply([res("invoice", 1), res("client", 5), ...many, res("project", 1), { type: "project", id: "x" }, null, { type: "task", id: 4 }]),
      "editor",
    )
    expect(groups.map((g) => g.type)).toEqual(["client", "project"])
    expect(groups[1].items.map((i) => i.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(mergeRecords(reply([res("client", 5)]), "employee")).toEqual([])
  })

  it("strips fields the result type does not declare and checks each route", () => {
    const extra = { ...res("client", 1, "/app/invoicing"), notes: "Private" }
    const [g] = mergeRecords(reply([extra]), "admin")
    expect(g.items[0]).toEqual({ type: "client", id: 1, title: "client 1", secondary: "", route: "/app/clients" })
  })
})

describe("stateFromReply", () => {
  it("hides the group when search.php is missing or refuses the role", () => {
    expect(stateFromReply("ac", { ok: false, error: "x", status: 404 }, "admin")).toEqual({ status: "hidden" })
    expect(stateFromReply("ac", { ok: false, error: "Not allowed.", status: 403 }, "admin")).toEqual({ status: "hidden" })
  })

  it("reports a network or server failure as failed with its message", () => {
    expect(stateFromReply("ac", { ok: false, error: NETWORK_ERROR }, "admin")).toEqual({ status: "failed", query: "ac", error: NETWORK_ERROR })
    expect(stateFromReply("ac", { ok: false, error: "Boom", status: 500 }, "admin")).toMatchObject({ status: "failed", error: "Boom" })
  })

  it("treats a reply without a results list as unreadable", () => {
    const bad = { ok: true, data: { query: "ac" } } as unknown as ApiResult<RecordSearchData>
    expect(stateFromReply("ac", bad, "admin")).toEqual({ status: "failed", query: "ac", error: BAD_REPLY_ERROR })
  })

  it("marks the list partial when any searched type was unavailable", () => {
    const ok = stateFromReply("ac", { ok: true, data: reply([res("client", 1)], { client: "ok", invoice: "unavailable" }) }, "admin")
    expect(ok).toMatchObject({ status: "ok", query: "ac", partial: true })
    const full = stateFromReply("ac", { ok: true, data: reply([], { client: "ok" }) }, "admin")
    expect(full).toEqual({ status: "ok", query: "ac", groups: [], partial: false })
  })
})

describe("createRecordSearcher", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  type Call = { query: string; signal: AbortSignal; resolve: (r: ApiResult<RecordSearchData>) => void }
  function setup(role: Parameters<typeof canSearchRecords>[0] = "admin") {
    const calls: Call[] = []
    const states: RecordSearchState[] = []
    const searcher = createRecordSearcher({
      role,
      find: (query, signal) => new Promise((resolve) => calls.push({ query, signal, resolve })),
      onState: (s) => states.push(s),
    })
    return { calls, states, searcher }
  }

  it("waits 250ms after the last keystroke and sends only the final query", async () => {
    const { calls, states, searcher } = setup()
    searcher.update("ac")
    await vi.advanceTimersByTimeAsync(100)
    searcher.update("acm")
    await vi.advanceTimersByTimeAsync(RECORD_SEARCH_DEBOUNCE_MS - 1)
    expect(calls).toHaveLength(0)
    expect(states.at(-1)).toEqual({ status: "loading", query: "acm" })
    await vi.advanceTimersByTimeAsync(1)
    expect(calls.map((c) => c.query)).toEqual(["acm"])
  })

  it("aborts the request in flight and ignores its late reply", async () => {
    const { calls, states, searcher } = setup()
    searcher.update("ac")
    await vi.advanceTimersByTimeAsync(RECORD_SEARCH_DEBOUNCE_MS)
    searcher.update("acme")
    expect(calls[0].signal.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(RECORD_SEARCH_DEBOUNCE_MS)
    calls[1].resolve({ ok: true, data: reply([res("client", 2)]) })
    calls[0].resolve({ ok: true, data: reply([res("client", 1)]) })
    await vi.advanceTimersByTimeAsync(0)
    const last = states.at(-1)
    expect(last).toMatchObject({ status: "ok", query: "acme" })
    expect(last?.status === "ok" && last.groups[0].items.map((i) => i.id)).toEqual([2])
    expect(states.filter((s) => s.status === "ok")).toHaveLength(1)
  })

  it("goes idle without a request for a query that is too short, and cancels a pending one", async () => {
    const { calls, states, searcher } = setup()
    searcher.update("ac")
    searcher.update("a")
    await vi.advanceTimersByTimeAsync(RECORD_SEARCH_DEBOUNCE_MS * 2)
    expect(calls).toHaveLength(0)
    expect(states.at(-1)).toEqual({ status: "idle" })
  })

  it("stays hidden for the session after a 404, without further requests", async () => {
    const { calls, states, searcher } = setup()
    searcher.update("ac")
    await vi.advanceTimersByTimeAsync(RECORD_SEARCH_DEBOUNCE_MS)
    calls[0].resolve({ ok: false, error: "Not found", status: 404 })
    await vi.advanceTimersByTimeAsync(0)
    searcher.update("acme")
    await vi.advanceTimersByTimeAsync(RECORD_SEARCH_DEBOUNCE_MS)
    expect(calls).toHaveLength(1)
    expect(states.at(-1)).toEqual({ status: "hidden" })
  })

  it("never asks the server for a role with no searchable type", async () => {
    const { calls, states, searcher } = setup("trainer")
    searcher.update("acme")
    await vi.advanceTimersByTimeAsync(RECORD_SEARCH_DEBOUNCE_MS)
    expect(calls).toHaveLength(0)
    expect(states).toEqual([{ status: "hidden" }])
  })

  it("dispose cancels the pending timer and the request in flight", async () => {
    const { calls, searcher } = setup()
    searcher.update("ac")
    await vi.advanceTimersByTimeAsync(RECORD_SEARCH_DEBOUNCE_MS)
    searcher.update("acme")
    searcher.dispose()
    await vi.advanceTimersByTimeAsync(RECORD_SEARCH_DEBOUNCE_MS)
    expect(calls).toHaveLength(1)
    expect(calls[0].signal.aborted).toBe(true)
  })
})
