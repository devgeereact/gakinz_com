/**
 * K-059: tokens are stored hashed. A copy of the database holds no working
 * credential, and sessions issued before the change keep working.
 */
import crypto from "node:crypto"
import { beforeEach, describe, expect, it } from "vitest"
import { api, createUser, login, one, q, resetDb, sql, tokenHash } from "./helpers"

describe("hashed tokens", () => {
  beforeEach(() => resetDb())

  it("stores a hash, not the token, and the stored value does not sign in", async () => {
    const id = createUser({ email: "owner@example.test", role: "super_admin" })
    const token = await login("owner@example.test")
    const stored = one(`SELECT token FROM auth_tokens WHERE user_id = ${id}`) as string
    expect(stored).not.toBe(token)
    expect(stored).toBe(tokenHash(token))
    expect((await api("auth.php?action=me", { token })).status).toBe(200)
    expect((await api("auth.php?action=me", { token: stored })).status).toBe(401)
  })

  it("still accepts a session stored raw before the change, until it expires", async () => {
    const id = createUser({ email: "owner@example.test", role: "super_admin" })
    const legacy = crypto.randomBytes(32).toString("hex")
    sql(`INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (${id}, ${q(legacy)}, NOW() + INTERVAL 1 DAY)`)
    expect((await api("auth.php?action=me", { token: legacy })).status).toBe(200)

    const sessions = await api<Array<{ current: boolean }>>("auth.php?action=sessions", { token: legacy })
    expect(sessions.json.some((s) => s.current)).toBe(true)

    expect((await api("auth.php?action=logout", { token: legacy, body: {} })).status).toBe(200)
    expect(one(`SELECT COUNT(*) FROM auth_tokens WHERE user_id = ${id}`)).toBe("0")
  })

  it("marks the current session and logs out by the hashed row", async () => {
    const id = createUser({ email: "owner@example.test", role: "super_admin" })
    const token = await login("owner@example.test")
    const sessions = await api<Array<{ current: boolean }>>("auth.php?action=sessions", { token })
    expect(sessions.json).toHaveLength(1)
    expect(sessions.json[0].current).toBe(true)
    await api("auth.php?action=logout", { token, body: {} })
    expect(one(`SELECT COUNT(*) FROM auth_tokens WHERE user_id = ${id}`)).toBe("0")
  })
})
