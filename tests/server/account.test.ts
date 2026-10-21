/**
 * My account (K-023, K-024). Every signed-in role, client included, manages its
 * own two-factor and sessions through auth.php. These check that each action is
 * scoped to the caller's own user id and cannot reach another account.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createUser, login, one, resetDb, sql, totp } from "./helpers"

const SECRET = "JBSWY3DPEHPK3PXP" // synthetic base32 TOTP secret
const OTHER_SECRET = "KRSXG5CTMVRXEZLU" // a second synthetic secret

const ROLES = ["super_admin", "admin", "manager", "trainer", "editor", "employee", "client"]

describe("my account: own state", () => {
  beforeEach(() => resetDb())

  it.each(ROLES)("lets a %s read its own sessions and start two-factor setup", async (role) => {
    createUser({ email: `${role}@example.test`, role, clientId: role === "client" ? createClient("Own Ltd") : null })
    const token = await login(`${role}@example.test`)

    const sessions = await api<Array<{ current: boolean }>>("auth.php?action=sessions", { token })
    expect(sessions.status).toBe(200)
    expect(sessions.json).toHaveLength(1)
    expect(sessions.json[0].current).toBe(true)

    const setup = await api<{ secret?: string }>("auth.php?action=twofa_setup", { token, body: {} })
    expect(setup.status).toBe(200)
    expect(setup.json.secret).toMatch(/^[A-Z2-7]+$/)
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
      token: await login("on@example.test", totp(SECRET)),
    })
    expect(on.json.totp_enabled).toBe(true)
  })

  it("refuses every account action without a token", async () => {
    for (const action of ["me", "sessions"]) {
      expect((await api(`auth.php?action=${action}`)).status).toBe(401)
    }
    for (const action of ["revoke", "twofa_setup", "twofa_enable", "twofa_disable", "twofa_recodes"]) {
      expect((await api(`auth.php?action=${action}`, { body: { id: 1, code: "000000" } })).status).toBe(401)
    }
  })
})

describe("my account: cannot touch another user", () => {
  let alice: number
  let bob: number
  let aliceToken: string
  let bobToken: string

  beforeEach(async () => {
    resetDb()
    alice = createUser({ email: "alice@example.test", role: "client", clientId: createClient("Alice Ltd") })
    bob = createUser({ email: "bob@example.test", role: "admin", totpSecret: OTHER_SECRET })
    aliceToken = await login("alice@example.test")
    bobToken = await login("bob@example.test", totp(OTHER_SECRET))
  })

  it("lists only the caller's own sessions", async () => {
    const r = await api<Array<{ id: number }>>("auth.php?action=sessions", { token: aliceToken })
    const bobSession = Number(one(`SELECT id FROM auth_tokens WHERE user_id = ${bob}`))
    expect(r.json.map((s) => s.id)).not.toContain(bobSession)
    expect(r.json).toHaveLength(1)
  })

  it("will not revoke another user's session", async () => {
    const bobSession = Number(one(`SELECT id FROM auth_tokens WHERE user_id = ${bob}`))
    const r = await api("auth.php?action=revoke", { token: aliceToken, body: { id: bobSession } })
    expect(r.status).toBe(404)
    expect(one(`SELECT COUNT(*) FROM auth_tokens WHERE id = ${bobSession}`)).toBe("1")
    expect((await api("auth.php?action=me", { token: bobToken })).status).toBe(200)
  })

  it("revokes the caller's own other session", async () => {
    // The database holds only a hash of each token (K-059), so the second
    // session's token comes from the login answer, not from the table.
    const second = await login("alice@example.test")
    const older = Number(one(`SELECT MIN(id) FROM auth_tokens WHERE user_id = ${alice}`))
    const r = await api("auth.php?action=revoke", { token: second, body: { id: older } })
    expect(r.status).toBe(200)
    expect((await api("auth.php?action=me", { token: aliceToken })).status).toBe(401)
  })

  it("ignores a user id in the body and changes only the caller's two-factor", async () => {
    const before = one(`SELECT CONCAT(totp_secret, '|', totp_enabled) FROM users WHERE id = ${bob}`)
    const setup = await api("auth.php?action=twofa_setup", { token: aliceToken, body: { id: bob, user_id: bob } })
    expect(setup.status).toBe(200)
    // Bob's code against Alice's pending secret must not enable anything for Bob.
    await api("auth.php?action=twofa_enable", { token: aliceToken, body: { code: totp(OTHER_SECRET), user_id: bob } })
    await api("auth.php?action=twofa_disable", { token: aliceToken, body: { code: totp(OTHER_SECRET), user_id: bob } })
    await api("auth.php?action=twofa_recodes", { token: aliceToken, body: { code: totp(OTHER_SECRET), user_id: bob } })
    expect(one(`SELECT CONCAT(totp_secret, '|', totp_enabled) FROM users WHERE id = ${bob}`)).toBe(before)
    expect(one(`SELECT totp_enabled FROM users WHERE id = ${alice}`)).toBe("0")
    expect(one(`SELECT totp_secret IS NOT NULL FROM users WHERE id = ${alice}`)).toBe("1")
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
