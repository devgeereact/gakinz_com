/**
 * Hardening from the 2026-10-17 readiness audit (K-056 to K-058).
 *  - An admin cannot demote or suspend a super admin.
 *  - Failed sign-ins for one email from another address do not lock the owner out.
 *  - Code checks on a signed-in account stop after ten wrong codes.
 *  - A password reset link works once.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createUser, login, one, PASSWORD, q, resetDb, sql, totp } from "./helpers"

const SECRET = "JBSWY3DPEHPK3PXP" // synthetic base32 TOTP secret

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

describe("sign-in throttle", () => {
  beforeEach(() => resetDb())

  it("does not lock an account because of failures from another address", async () => {
    createUser({ email: "owner@example.test", role: "super_admin" })
    sql(
      `INSERT INTO audit_log (user_id, action, detail, ip) VALUES ` +
        Array.from({ length: 12 }, () => `(NULL, 'login_failed', ${q("owner@example.test")}, '203.0.113.9')`).join(","),
    )
    await expect(login("owner@example.test")).resolves.toMatch(/\w+/)
  })

  it("still blocks the address that keeps failing", async () => {
    createUser({ email: "owner@example.test", role: "super_admin" })
    for (let i = 0; i < 10; i++) {
      await api("auth.php?action=login", { body: { email: "owner@example.test", password: "wrong-password" } })
    }
    const r = await api("auth.php?action=login", { body: { email: "owner@example.test", password: PASSWORD } })
    expect(r.status).toBe(429)
  })
})

describe("two-factor code checks on a signed-in account", () => {
  beforeEach(() => resetDb())

  it("stops after ten wrong codes, so a stolen token cannot guess its way to turning two-factor off", async () => {
    createUser({ email: "owner@example.test", role: "super_admin", totpSecret: SECRET })
    const token = await login("owner@example.test", totp(SECRET))
    for (let i = 0; i < 10; i++) {
      const r = await api("auth.php?action=twofa_disable", { token, body: { code: "000000" } })
      expect(r.status).toBe(400)
    }
    const blocked = await api("auth.php?action=twofa_disable", { token, body: { code: totp(SECRET) } })
    expect(blocked.status).toBe(429)
    expect(one(`SELECT totp_enabled FROM users WHERE email = 'owner@example.test'`)).toBe("1")
  })
})

describe("password reset link", () => {
  beforeEach(() => resetDb())

  it("works once", async () => {
    const id = createUser({ email: "emp@example.test", role: "employee" })
    sql(`INSERT INTO password_resets (user_id, token, expires_at) VALUES (${id}, 'synthetic-reset-token', NOW() + INTERVAL 1 HOUR)`)
    const first = await api("auth.php?action=reset", { body: { token: "synthetic-reset-token", password: "New-Synthetic-1" } })
    expect(first.status).toBe(200)
    const second = await api("auth.php?action=reset", { body: { token: "synthetic-reset-token", password: "New-Synthetic-2" } })
    expect(second.status).toBe(400)
  })
})
