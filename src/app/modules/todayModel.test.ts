import { describe, expect, it } from "vitest"
import { BAD_REPLY_ERROR, NETWORK_ERROR, type TodayData, type TodayItem } from "@/lib/api"
import {
  applyTodayResult,
  expectedSections,
  initialTodayView,
  itemRoute,
  itemWhen,
  todayRows,
  updatedLabel,
  type TodayView,
} from "./todayModel"

const item = (id: number, over: Partial<TodayItem> = {}): TodayItem => ({
  type: "invoice",
  id,
  title: `GK-INV-000${id}`,
  reason: "Sent and past its due date, not paid",
  at: "2026-10-01",
  route: "/app/invoicing",
  ...over,
})

const data = (sections: TodayData["sections"], at = "2026-10-19T08:30:00Z"): TodayData => ({ generated_at: at, sections })

describe("applyTodayResult", () => {
  it("keeps a good reply and records its generated_at as the last refresh", () => {
    const d = data({ unpaid_invoices: { status: "ok", count: 1, items: [item(1)] } })
    expect(applyTodayResult(initialTodayView, { ok: true, data: d })).toEqual({ data: d, updatedAt: d.generated_at, error: null })
  })

  it("drops stale data on a failed refresh but keeps the time of the last success", () => {
    const first = applyTodayResult(initialTodayView, { ok: true, data: data({}, "2026-10-19T07:00:00Z") })
    const failed = applyTodayResult(first, { ok: false, error: NETWORK_ERROR })
    expect(failed).toEqual({ data: null, updatedAt: "2026-10-19T07:00:00Z", error: NETWORK_ERROR })
  })

  it("treats a 200 reply without the expected shape as a failure", () => {
    expect(applyTodayResult(initialTodayView, { ok: true, data: [] }).error).toBe(BAD_REPLY_ERROR)
    expect(applyTodayResult(initialTodayView, { ok: true, data: { generated_at: "x", sections: [] } }).data).toBeNull()
    expect(applyTodayResult(initialTodayView, { ok: true, data: null }).error).toBe(BAD_REPLY_ERROR)
  })
})

describe("todayRows", () => {
  it("shows every section the role should get as unavailable when the load failed, never as empty", () => {
    const view: TodayView = { data: null, updatedAt: null, error: NETWORK_ERROR }
    const rows = todayRows(view, "manager")
    expect(rows.map((r) => r.key)).toEqual([
      "new_enquiries",
      "follow_ups_due",
      "calls",
      "overdue_tasks",
      "waiting_material",
      "unpaid_invoices",
    ])
    expect(rows.every((r) => r.state === "unavailable")).toBe(true)
    // An editor cannot read invoices, so a failed load does not invent that section.
    expect(todayRows(view, "editor").some((r) => r.key === "unpaid_invoices")).toBe(false)
    expect(todayRows(view, "client")).toEqual([])
  })

  it("marks an unavailable invoice source unavailable, not 'nothing due'", () => {
    const rows = todayRows(
      { data: data({ unpaid_invoices: { status: "unavailable", count: null, items: [] } }), updatedAt: "x", error: null },
      "super_admin",
    )
    expect(rows).toEqual([{ key: "unpaid_invoices", label: "Unpaid invoices", state: "unavailable" }])
  })

  it("follows the server on which sections exist, in a fixed screen order", () => {
    const rows = todayRows(
      {
        data: data({
          unpaid_invoices: { status: "ok", count: 0, items: [] },
          new_enquiries: { status: "ok", count: 0, items: [] },
        }),
        updatedAt: "x",
        error: null,
      },
      "super_admin",
    )
    expect(rows.map((r) => [r.key, r.state])).toEqual([
      ["new_enquiries", "empty"],
      ["unpaid_invoices", "empty"],
    ])
  })

  it("reports how many more items exist beyond those sent", () => {
    const items = Array.from({ length: 20 }, (_, i) => item(i + 1))
    const [row] = todayRows({ data: data({ unpaid_invoices: { status: "ok", count: 23, items } }), updatedAt: "x", error: null }, "admin")
    expect(row).toMatchObject({ state: "items", count: 23, more: 3 })
    if (row.state === "items") expect(row.items).toHaveLength(20)
  })

  it("never reads a malformed ok section as zero", () => {
    const bad = { status: "ok", count: null, items: [] } as unknown as TodayData["sections"]["calls"]
    const [row] = todayRows({ data: data({ calls: bad }), updatedAt: "x", error: null }, "admin")
    expect(row.state).toBe("unavailable")
  })
})

describe("expectedSections", () => {
  it("mirrors the server's role rules", () => {
    expect(expectedSections("employee")).toEqual(["overdue_tasks", "waiting_material"])
    expect(expectedSections("trainer")).toEqual([])
    expect(expectedSections(undefined)).toEqual([])
  })
})

describe("itemRoute", () => {
  it("follows CMS paths and refuses anything else", () => {
    expect(itemRoute({ route: "/app/leads?due=1" })).toBe("/app/leads?due=1")
    expect(itemRoute({ route: "/app/leads?view=calls" })).toBe("/app/leads?view=calls")
    expect(itemRoute({ route: "https://example.test/app/leads" })).toBe("/app")
    expect(itemRoute({ route: "//example.test" })).toBe("/app")
    expect(itemRoute({ route: "javascript:alert(1)" })).toBe("/app")
  })
})

describe("itemWhen and updatedLabel", () => {
  it("shows a due date as a calendar day whatever the zone", () => {
    expect(itemWhen("2026-10-01")).toBe("1 Oct")
    expect(itemWhen("2026-10-01", "Pacific/Auckland")).toBe("1 Oct")
  })

  it("shows a UTC moment in the given zone", () => {
    expect(itemWhen("2026-10-19T13:30:00Z", "Europe/London")).toBe("19 Oct, 14:30")
    expect(itemWhen(null)).toBe("")
    expect(itemWhen("not a date")).toBe("")
  })

  it("shows the last successful refresh as a time, or nothing before the first", () => {
    expect(updatedLabel({ data: null, updatedAt: "2026-10-19T08:05:00Z", error: "x" }, "UTC")).toBe("08:05")
    expect(updatedLabel(initialTodayView)).toBeNull()
  })
})
