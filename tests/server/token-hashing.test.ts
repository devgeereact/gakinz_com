/**
 * K-059: tokens are stored hashed. A copy of the database holds no working
 * credential, and sessions issued before the change keep working. Sign-in itself is Clerk (D-057); only
 * stored session tokens are still read, for the soak.
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
    // Once it expires it stops working (the soak ends with Phase 9, D-057).
    sql(`UPDATE auth_tokens SET expires_at = NOW() - INTERVAL 1 DAY WHERE user_id = ${id}`)
    expect((await api("auth.php?action=me", { token: legacy })).status).toBe(401)
  })
})
