/**
 * My account (K-023, K-024, D-057). Sign-in security is Clerk's, so the only account state the PHP
 * API still reports is `me`: the caller's own user row and their own app two-factor flag. The
 * retired self-service actions (sessions, revoke, twofa_*) are covered in legacy-retired.test.ts.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createUser, login, resetDb, sql } from "./helpers"

const SECRET = "JBSWY3DPEHPK3PXP" // synthetic base32 TOTP secret

const ROLES = ["super_admin", "admin", "manager", "trainer", "editor", "employee", "client"]

describe("my account: me", () => {
  beforeEach(() => resetDb())

  it.each(ROLES)("lets a %s read its own record", async (role) => {
    createUser({ email: `${role}@example.test`, role, clientId: role === "client" ? createClient("Own Ltd") : null })
    const token = await login(`${role}@example.test`)
    const r = await api<{ user: { email: string; role: string } }>("auth.php?action=me", { token })
    expect(r.status).toBe(200)
    expect(r.json.user.email).toBe(`${role}@example.test`)
    expect(r.json.user.role).toBe(role)
  })

  it("reports the caller's own two-factor state from me", async () => {
    createUser({ email: "off@example.test", role: "employee" })
    createUser({ email: "on@example.test", role: "client", clientId: createClient("On Ltd"), totpSecret: SECRET })

    const off = await api<{ totp_enabled: boolean | null; user: { email: string } }>("auth.php?action=me", {
      token: await login("off@example.test"),
    })
    expect(off.status).toBe(200)
    expect(off.json.user.email).toBe("off@example.test")
    expect(off.json.totp_enabled).toBe(false)

    const on = await api<{ totp_enabled: boolean | null }>("auth.php?action=me", {
      token: await login("on@example.test"),
    })
    expect(on.json.totp_enabled).toBe(true)
  })

  it("refuses me without a token", async () => {
    expect((await api("auth.php?action=me")).status).toBe(401)
  })

  it("never returns another account's record", async () => {
    createUser({ email: "alice@example.test", role: "client", clientId: createClient("Alice Ltd") })
    createUser({ email: "bob@example.test", role: "admin" })
    const alice = await login("alice@example.test")
    const r = await api<{ user: { email: string } }>("auth.php?action=me&id=2&user_id=2", { token: alice })
    expect(r.json.user.email).toBe("alice@example.test")
  })
})

describe("me on a database without the two-factor columns", () => {
  it("still answers, with totp_enabled null", async () => {
    resetDb()
    createUser({ email: "legacy@example.test", role: "editor" })
    const token = await login("legacy@example.test")
    sql("ALTER TABLE users CHANGE totp_enabled totp_enabled_hidden TINYINT(1) NOT NULL DEFAULT 0")
    try {
      const r = await api<{ user: unknown; totp_enabled: boolean | null }>("auth.php?action=me", { token })
      expect(r.status).toBe(200)
      expect(r.json.totp_enabled).toBeNull()
    } finally {
      sql("ALTER TABLE users CHANGE totp_enabled_hidden totp_enabled TINYINT(1) NOT NULL DEFAULT 0")
    }
  })
})
