import { describe, expect, it } from "vitest"
import { MODULE_ROLES } from "@/lib/access"
import { DASHBOARD_MODULES, dashboardSources } from "./dashboardSources"

describe("dashboardSources: the dashboard asks only for what the role may see (K-135)", () => {
  const all = ["leads", "clients", "projects", "invoices", "support", "time"]

  it("loads every source for a manager, an admin and a super admin", () => {
    for (const role of ["manager", "admin", "super_admin"] as const) {
      expect(dashboardSources(role)).toEqual({ load: all, notForRole: [] })
    }
  })

  it("does not ask an editor for invoices, which the server refuses with 403 (a permanent error banner before)", () => {
    expect(dashboardSources("editor")).toEqual({ load: ["leads", "clients", "projects", "support", "time"], notForRole: ["invoices"] })
  })

  it("loads everything when the role is not known yet, as it did before", () => {
    expect(dashboardSources(undefined)).toEqual({ load: all, notForRole: [] })
  })

  it("names only modules that exist, so a typo cannot silently hide a source", () => {
    for (const key of Object.values(DASHBOARD_MODULES)) expect(MODULE_ROLES).toHaveProperty(key)
  })

  it("splits the six sources between load and notForRole with none lost or repeated", () => {
    for (const role of ["editor", "employee", "trainer", "manager"] as const) {
      const r = dashboardSources(role)
      expect([...r.load, ...r.notForRole].sort()).toEqual([...all].sort())
    }
  })
})
