/**
 * Hardening from the 2026-10-17 readiness audit (K-056 to K-058).
 *  - An admin cannot demote or suspend a super admin.
 *
 * The sign-in throttle, the two-factor code limits and the reset-link single use went with the legacy
 * sign-in (D-057); legacy-retired.test.ts shows those endpoints no longer exist.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createUser, login, one, resetDb } from "./helpers"

describe("super admin protection", () => {
  beforeEach(() => resetDb())

  it("refuses an admin changing a super admin's role or status, and leaves the owner signed in", async () => {
    const ownerId = createUser({ email: "owner@example.test", role: "super_admin" })
    createUser({ email: "admin@example.test", role: "admin" })
    const owner = await login("owner@example.test")
    const admin = await login("admin@example.test")

    const role = await api("users.php?action=role", { token: admin, body: { id: ownerId, role: "employee" } })
    expect(role.status).toBe(403)
    const status = await api("users.php?action=status", { token: admin, body: { id: ownerId, status: "suspended" } })
    expect(status.status).toBe(403)

    expect(one(`SELECT role FROM users WHERE id = ${ownerId}`)).toBe("super_admin")
    expect(one(`SELECT status FROM users WHERE id = ${ownerId}`)).toBe("active")
    expect((await api("auth.php?action=me", { token: owner })).status).toBe(200)
  })

  it("still lets an admin manage other staff, and a super admin manage another super admin", async () => {
    const empId = createUser({ email: "emp@example.test", role: "employee" })
    const secondId = createUser({ email: "second@example.test", role: "super_admin" })
    createUser({ email: "owner@example.test", role: "super_admin" })
    createUser({ email: "admin@example.test", role: "admin" })
    const admin = await login("admin@example.test")
    const owner = await login("owner@example.test")

    expect((await api("users.php?action=role", { token: admin, body: { id: empId, role: "editor" } })).status).toBe(200)
    expect((await api("users.php?action=status", { token: owner, body: { id: secondId, status: "suspended" } })).status).toBe(200)
  })
})
