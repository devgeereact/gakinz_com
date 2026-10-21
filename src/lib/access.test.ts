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

  it("lets a client into the portal and My account ONLY", () => {
    expect(canAccess("client", "portal")).toBe(true)
    expect(canAccess("client", "account")).toBe(true)
    for (const key of Object.keys(MODULE_ROLES)) {
      if (key === "portal" || key === "account") continue
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

  // Fails CLOSED. A route added without a MODULE_ROLES entry must be invisible
  // until someone maps it, not open to every signed-in user including a client.
  it("denies an unmapped module key to every role", () => {
    for (const role of [...STAFF_ROLES, "client" as Role, undefined]) {
      expect(canAccess(role, "totally-unknown-module")).toBe(false)
    }
  })

  it("has a MODULE_ROLES entry for every path moduleKeyForPath can return", () => {
    // Guards the fail-closed rule: an unmapped key would silently hide a real
    // module from everyone, which is loud but still a bug.
    const paths = [
      "/app",
      ...Object.keys(MODULE_ROLES).map((k) => `/app/${k}`),
    ]
    for (const path of paths) {
      const key = moduleKeyForPath(path)
      expect(key, `no module key for ${path}`).not.toBeNull()
      expect(MODULE_ROLES[key as string], `no MODULE_ROLES entry for ${path}`).toBeDefined()
    }
  })
})

describe("work (the 24th module)", () => {
  it("mirrors the EDITORS list in server/work.php", () => {
    expect(MODULE_ROLES.work).toEqual(["super_admin", "admin", "manager", "editor"])
  })

  it("lets the four editor roles in and keeps everyone else out", () => {
    for (const role of ["super_admin", "admin", "manager", "editor"] as Role[]) {
      expect(canAccess(role, "work")).toBe(true)
    }
    for (const role of ["trainer", "employee", "client"] as Role[]) {
      expect(canAccess(role, "work")).toBe(false)
    }
  })

  it("maps /app/work (and deeper segments) to the work module", () => {
    expect(moduleKeyForPath("/app/work")).toBe("work")
    expect(moduleKeyForPath("/app/work/42")).toBe("work")
  })
})

describe("site content", () => {
  it("mirrors the EDITORS list in server/site.php", () => {
    expect(MODULE_ROLES.site).toEqual(["super_admin", "admin", "manager", "editor"])
  })

  it("keeps trainer, employee and client out, and maps /app/site", () => {
    for (const role of ["trainer", "employee", "client"] as Role[]) {
      expect(canAccess(role, "site")).toBe(false)
    }
    expect(canAccess("editor", "site")).toBe(true)
    expect(moduleKeyForPath("/app/site")).toBe("site")
  })
})

describe("recorded access mismatches", () => {
  it("no longer offers Files to a trainer (server/files.php STAFF omits it)", () => {
    expect(MODULE_ROLES.files).not.toContain("trainer")
    expect(canAccess("trainer", "files")).toBe(false)
    expect(canAccess("employee", "files")).toBe(true)
  })

  it("keeps trainer and employee off the dashboard they could not load", () => {
    expect(canAccess("trainer", "dashboard")).toBe(false)
    expect(canAccess("employee", "dashboard")).toBe(false)
    expect(canAccess("manager", "dashboard")).toBe(true)
  })

  it("lands every role somewhere it can actually open", () => {
    for (const role of [...STAFF_ROLES, "client" as Role]) {
      const key = moduleKeyForPath(defaultPathForRole(role))
      expect(key, `no module for ${role}'s landing`).not.toBeNull()
      expect(canAccess(role, key as string), `${role} bounced off its own landing`).toBe(true)
    }
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

  it("sends dashboard-capable staff to the /app index (a real route, not a 404)", () => {
    for (const role of ["super_admin", "admin", "manager", "editor"] as Role[]) {
      expect(defaultPathForRole(role)).toBe("/app")
    }
  })

  it("sends trainer and employee to a module they hold", () => {
    expect(defaultPathForRole("trainer")).toBe("/app/time")
    expect(defaultPathForRole("employee")).toBe("/app/projects")
  })
})

describe("portal is narrowed to match server/portal.php", () => {
  // Regression guard for the 2026-09-22 fix. server/portal.php previously
  // called require_auth($conn) with no role list, so an employee, editor or
  // trainer reached the staff branch, passed an arbitrary ?client_id, and read
  // invoice data that server/invoices.php restricts to super_admin, admin and
  // manager. The server branch is now gated on PORTAL_PREVIEW_ROLES and this
  // list must not drift back.
  it("admits only the three roles the server admits, plus client", () => {
    for (const role of ["super_admin", "admin", "manager", "client"] as Role[]) {
      expect(canAccess(role, "portal"), `${role} should reach the portal`).toBe(true)
    }
    for (const role of ["editor", "employee", "trainer"] as Role[]) {
      expect(canAccess(role, "portal"), `${role} must not see the portal`).toBe(false)
    }
  })

  it("keeps the client's own landing page reachable", () => {
    // A client has exactly one route. If portal ever stops admitting them,
    // they are locked out of the product entirely.
    expect(defaultPathForRole("client")).toBe("/app/portal")
    expect(canAccess("client", "portal")).toBe(true)
  })
})

describe("My account (K-023, K-024)", () => {
  // auth.php's sessions, revoke and twofa_* actions take no role list and act
  // only on the caller's own user id, so every signed-in role gets the screen.
  it("opens for every signed-in role, client included", () => {
    for (const role of [...STAFF_ROLES, "client" as Role]) {
      expect(canAccess(role, "account"), `${role} should reach My account`).toBe(true)
    }
  })

  it("stays closed when nobody is signed in", () => {
    expect(canAccess(undefined, "account")).toBe(false)
  })

  it("maps /app/account (and deeper segments) to the account module", () => {
    expect(moduleKeyForPath("/app/account")).toBe("account")
    expect(moduleKeyForPath("/app/account/")).toBe("account")
    expect(moduleKeyForPath("/app/account/security")).toBe("account")
  })

  it("does not widen Settings (Platform) beyond the admins", () => {
    for (const role of ["manager", "trainer", "editor", "employee", "client"] as Role[]) {
      expect(canAccess(role, "platform")).toBe(false)
    }
  })
})
