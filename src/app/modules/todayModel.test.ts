import { describe, expect, it } from "vitest"
import { BAD_REPLY_ERROR, NETWORK_ERROR, type TodayData, type TodayItem } from "@/lib/api"
import {
  applyTodayResult,
  expectedSections,
  fallbackFollowUps,
  initialTodayView,
  itemRoute,
  itemWhen,
  ownerAlertsNotice,
  scheduledJobsNotice,
  sectionRoute,
  todayPanel,
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
      "deletion_requests",
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
    expect(expectedSections("employee")).toEqual(["overdue_tasks", "waiting_material", "deletion_requests"])
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

describe("todayPanel", () => {
  it("shows the failure itself when the load failed before the role is known", () => {
    expect(todayPanel({ data: null, updatedAt: null, error: NETWORK_ERROR }, undefined)).toEqual({ kind: "failed", error: NETWORK_ERROR })
  })

  it("shows unavailable rows when the role is known", () => {
    const p = todayPanel({ data: null, updatedAt: null, error: NETWORK_ERROR }, "editor")
    expect(p.kind).toBe("rows")
    if (p.kind === "rows") expect(p.rows.every((r) => r.state === "unavailable")).toBe(true)
  })

  it("shows nothing before the first load, or when the server sent no section for this role", () => {
    expect(todayPanel(initialTodayView, undefined)).toEqual({ kind: "none" })
    expect(todayPanel({ data: data({}), updatedAt: "x", error: null }, "admin")).toEqual({ kind: "none" })
  })
})

describe("today.php not on the server yet", () => {
  const shell = { ok: false as const, error: BAD_REPLY_ERROR, status: 200 }

  it("marks the view as not on the server, with no error, for the SPA shell's HTML 200", () => {
    const v = applyTodayResult(initialTodayView, shell)
    expect(v).toEqual({ data: null, updatedAt: null, error: null, notOnServer: true })
  })

  it("treats a bare 404, a 503 and the old role gate the same way", () => {
    expect(applyTodayResult(initialTodayView, { ok: false, error: "x", status: 404 }).notOnServer).toBe(true)
    expect(applyTodayResult(initialTodayView, { ok: false, error: "x", status: 503, details: { error: "x" } }).notOnServer).toBe(true)
    const gate = { ok: false as const, error: "Not allowed.", status: 403, details: { error: "Not allowed." } }
    expect(applyTodayResult(initialTodayView, gate).notOnServer).toBe(true)
  })

  it("still reports a real failure as an error", () => {
    const v = applyTodayResult(initialTodayView, { ok: false, error: "Server error.", status: 500, details: { error: "Server error." } })
    expect(v.notOnServer).toBeUndefined()
    expect(v.error).toBe("Server error.")
    expect(applyTodayResult(initialTodayView, { ok: false, error: NETWORK_ERROR }).error).toBe(NETWORK_ERROR)
  })

  it("clears the flag once today.php answers", () => {
    const missing = applyTodayResult(initialTodayView, shell)
    const d = data({})
    expect(applyTodayResult(missing, { ok: true, data: d }).notOnServer).toBeUndefined()
  })

  it("shows the client-side follow-ups card to a role that gets follow-ups, and nothing to any other role", () => {
    const v = applyTodayResult(initialTodayView, shell)
    expect(todayPanel(v, "editor")).toEqual({ kind: "follow_ups" })
    expect(todayPanel(v, "admin")).toEqual({ kind: "follow_ups" })
    expect(todayPanel(v, "employee")).toEqual({ kind: "none" })
    expect(todayPanel(v, undefined)).toEqual({ kind: "none" })
  })
})

describe("fallbackFollowUps", () => {
  const lead = (id: number, next_action_at: string | null, over: Partial<{ status: string; priority: 0 | 1 | 2 | 3 }> = {}) => ({
    id,
    status: "new",
    priority: 0 as 0 | 1 | 2 | 3,
    next_action_at,
    ...over,
  })

  it("keeps open enquiries due today or earlier, oldest first, then higher priority", () => {
    const leads = [
      lead(1, "2026-10-19"),
      lead(2, "2026-10-12"),
      lead(3, "2026-10-20"),
      lead(4, "2026-10-19", { priority: 3 }),
      lead(5, "2026-10-01", { status: "won" }),
      lead(6, null),
    ]
    const f = fallbackFollowUps(leads, "2026-10-19")
    expect(f.ready).toBe(true)
    expect(f.count).toBe(3)
    expect(f.top.map((l) => l.id)).toEqual([2, 4, 1])
  })

  it("shows at most five but counts them all", () => {
    const leads = Array.from({ length: 7 }, (_, i) => lead(i + 1, `2026-10-0${i + 1}`))
    const f = fallbackFollowUps(leads, "2026-10-19")
    expect(f.count).toBe(7)
    expect(f.top).toHaveLength(5)
  })

  it("is not ready while the server omits the follow-up fields", () => {
    const f = fallbackFollowUps([{ status: "new" }], "2026-10-19")
    expect(f.ready).toBe(false)
    expect(fallbackFollowUps([], "2026-10-19").ready).toBe(true)
  })
})

describe("sectionRoute", () => {
  it("opens the list view of each section, never a single record", () => {
    expect(sectionRoute("follow_ups_due")).toBe("/app/leads?due=1")
    expect(sectionRoute("calls")).toBe("/app/leads?view=calls")
    expect(sectionRoute("unpaid_invoices")).toBe("/app/invoicing")
    expect(sectionRoute("overdue_tasks")).toBe("/app/projects")
    expect(sectionRoute("deletion_requests")).toBe("/app/support")
    expect(itemRoute({ route: "/app/support?ticket=7" })).toBe("/app/support?ticket=7")
    for (const k of expectedSections("super_admin")) expect(itemRoute({ route: sectionRoute(k) })).toBe(sectionRoute(k))
  })
})

describe("scheduledJobsNotice", () => {
  const view = (scheduled_jobs: unknown): TodayView => ({
    data: { generated_at: "2026-11-10T09:00:00Z", sections: {}, scheduled_jobs } as TodayData,
    updatedAt: "2026-11-10T09:00:00Z",
    error: null,
  })

  it("names what is off when no run has ever been seen", () => {
    const n = scheduledJobsNotice(view({ last_run: null, stale: true, all_off: true, off: ["Retainer billing", "The weekly digest"] }))
    expect(n?.title).toBe("Scheduled jobs are not running")
    expect(n?.detail).toContain("No run has ever been seen.")
    expect(n?.detail).toContain("nothing is sent or billed automatically")
    expect(n?.off).toEqual(["Retainer billing", "The weekly digest"])
  })

  it("says only some are off when others run", () => {
    const n = scheduledJobsNotice(view({ last_run: "2026-11-10T02:00:00Z", stale: true, all_off: false, off: ["Retainer billing"] }))
    expect(n?.title).toBe("Some scheduled jobs are not running")
    expect(n?.detail).toContain("have not run in the last 36 hours")
  })

  it("gives the date of the last run when there was one", () => {
    const n = scheduledJobsNotice(view({ last_run: "2026-11-01T02:00:00Z", stale: true, off: [] }))
    expect(n?.detail).toContain("The last run was on 1 Nov 2026.")
  })

  it("says nothing when the jobs are running, when the server does not say, or when the load failed", () => {
    expect(scheduledJobsNotice(view({ last_run: "2026-11-10T02:00:00Z", stale: false, off: [] }))).toBeNull()
    expect(scheduledJobsNotice(view(undefined))).toBeNull()
    expect(scheduledJobsNotice({ data: null, updatedAt: null, error: "boom" })).toBeNull()
  })

  it("ignores junk in the list of what is off", () => {
    const n = scheduledJobsNotice(view({ last_run: null, stale: true, off: ["Retainer billing", 7, null] }))
    expect(n?.off).toEqual(["Retainer billing"])
  })
})

describe("ownerAlertsNotice", () => {
  const view = (owner_alerts: unknown): TodayView => ({
    data: { generated_at: "2026-11-11T09:00:00Z", sections: {}, owner_alerts } as TodayData,
    updatedAt: "2026-11-11T09:00:00Z",
    error: null,
  })

  it("says nothing when no alert failed, when the server does not say, or when the load failed", () => {
    expect(ownerAlertsNotice(view({ failed: 0, items: [] }))).toBeNull()
    expect(ownerAlertsNotice(view(undefined))).toBeNull()
    expect(ownerAlertsNotice({ data: null, updatedAt: null, error: "Network error" })).toBeNull()
    expect(ownerAlertsNotice(view({ failed: "3", items: [] }))).toBeNull()
  })

  it("names one failed alert in the singular and says the record itself is safe", () => {
    const n = ownerAlertsNotice(view({ failed: 1, items: [{ kind: "enquiry", detail: "GK-E-2026-0002 · connection refused", at: "2026-11-10T14:30:00Z" }] }))
    expect(n?.title).toBe("1 alert email did not go out in the last 7 days")
    expect(n?.detail).toContain("saved")
    expect(n?.lines).toEqual(["New enquiry GK-E-2026-0002 · connection refused, 10 Nov"])
  })

  it("labels each kind, counts the ones beyond the list, and survives a malformed item", () => {
    const n = ownerAlertsNotice(
      view({
        failed: 9,
        items: [
          { kind: "deletion", detail: "ticket #9 · 550 no", at: "2026-11-10T14:30:00Z" },
          { kind: "suppressed", detail: "enquiry_notified GK-E-2026-0003", at: null },
          { kind: "other", detail: 5 },
        ],
      }),
    )
    expect(n?.title).toBe("9 alert emails did not go out in the last 7 days")
    expect(n?.lines).toEqual(["Data deletion request ticket #9 · 550 no, 10 Nov", "Held back (20 an hour limit) enquiry_notified GK-E-2026-0003", "And 6 more."])
  })
})
