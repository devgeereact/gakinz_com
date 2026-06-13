import { describe, it, expect } from "vitest"
import { canAccess, moduleKeyForPath, defaultPathForRole, MODULE_ROLES } from "./access"
import type { Role } from "@/store/auth.store"

const STAFF_ROLES: Role[] = ["super_admin", "admin", "manager", "trainer", "editor", "employee"]

describe("canAccess", () => {
  it("denies everything when role is undefined (not signed in)", () => {
    for (const key of Object.keys(MODULE_ROLES)) {
      expect(canAccess(undefined, key)).toBe(false)
    }
  })

  it("lets a client into the portal ONLY", () => {
    expect(canAccess("client", "portal")).toBe(true)
    for (const key of Object.keys(MODULE_ROLES)) {
      if (key === "portal") continue
      expect(canAccess("client", key)).toBe(false)
    }
  })

  it("never exposes staff modules to a client", () => {
    // The sensitive ones explicitly.
    for (const key of ["dashboard", "leads", "clients", "invoicing", "mailbox", "platform", "analytics"]) {
      expect(canAccess("client", key)).toBe(false)
    }
  })

  it("matches MODULE_ROLES for every staff role + module", () => {
    for (const [key, allowed] of Object.entries(MODULE_ROLES)) {
      for (const role of STAFF_ROLES) {
        expect(canAccess(role, key)).toBe(allowed.includes(role))
      }
    }
  })

  it("super_admin reaches the admin-only platform module", () => {
    expect(canAccess("super_admin", "platform")).toBe(true)
    expect(canAccess("admin", "platform")).toBe(true)
    expect(canAccess("manager", "platform")).toBe(false)
  })

  it("treats an unknown (ungated) module as open to any signed-in user", () => {
    expect(canAccess("employee", "totally-unknown-module")).toBe(true)
    expect(canAccess("client", "totally-unknown-module")).toBe(true)
    expect(canAccess(undefined, "totally-unknown-module")).toBe(false)
  })
})

describe("moduleKeyForPath", () => {
  it("maps the /app index to the dashboard", () => {
    expect(moduleKeyForPath("/app")).toBe("dashboard")
    expect(moduleKeyForPath("/app/")).toBe("dashboard")
  })

  it("maps known module paths (with deeper segments)", () => {
    expect(moduleKeyForPath("/app/leads")).toBe("leads")
    expect(moduleKeyForPath("/app/portal")).toBe("portal")
    expect(moduleKeyForPath("/app/invoicing/123")).toBe("invoicing")
    expect(moduleKeyForPath("/app/platform/users")).toBe("platform")
  })

  it("returns null for paths with no module mapping", () => {
    expect(moduleKeyForPath("/app/components/spinners")).toBeNull()
    expect(moduleKeyForPath("/login")).toBeNull()
  })
})

describe("defaultPathForRole", () => {
  it("sends a client to their portal", () => {
    expect(defaultPathForRole("client")).toBe("/app/portal")
  })

  it("sends staff to the dashboard (a real route, not a 404)", () => {
    for (const role of STAFF_ROLES) {
      expect(defaultPathForRole(role)).toBe("/app")
    }
  })
})
