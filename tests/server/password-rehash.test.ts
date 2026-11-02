/**
 * Passwords (go-live hardening 2026-11-01): bcrypt at cost 12, and an older, weaker
 * hash is replaced the next time its owner signs in with the right password.
 */
import { spawnSync } from "node:child_process"
import { beforeEach, describe, expect, it } from "vitest"
import { api, createUser, one, PASSWORD, q, resetDb, sql } from "./helpers"

const weakHash = (p: string) => spawnSync("php", ["-r", "echo password_hash($argv[1], PASSWORD_BCRYPT, ['cost' => 4]);", "--", p], { encoding: "utf8" }).stdout

describe("password hash upgrade", () => {
  beforeEach(() => resetDb())

  it("rehashes a cost-4 hash to cost 12 on a correct sign-in", async () => {
    createUser({ email: "old@example.test", role: "admin" })
    sql(`UPDATE users SET password_hash = ${q(weakHash(PASSWORD))} WHERE email = 'old@example.test'`)
    const r = await api<{ token?: string }>("auth.php?action=login", { body: { email: "old@example.test", password: PASSWORD } })
    expect(r.status).toBe(200)
    expect(one("SELECT LEFT(password_hash, 7) FROM users WHERE email = 'old@example.test'")).toBe("$2y$12$")
  })

  it("leaves the hash alone on a wrong password", async () => {
    createUser({ email: "old@example.test", role: "admin" })
    const weak = weakHash(PASSWORD)
    sql(`UPDATE users SET password_hash = ${q(weak)} WHERE email = 'old@example.test'`)
    expect((await api("auth.php?action=login", { body: { email: "old@example.test", password: "wrong-password" } })).status).toBe(401)
    expect(one("SELECT password_hash FROM users WHERE email = 'old@example.test'")).toBe(weak)
  })
})
