/**
 * The legacy sign-in is retired (Phase 5, D-057). People sign in through Clerk, which proves who they are;
 * the server links the Clerk user to a users row by email and the row's role decides what they may do.
 * So: the password, magic-link, reference, Google and two-factor entry points are gone (404), accounts carry
 * no password, an invite is a notice and not a set-password link, and the one thing that stays in auth.php,
 * `me`, still answers. The server still ACCEPTS an existing stored session token (until the soak ends and
 * Phase 9 drops the tables), which is how the other suites hold a session.
 */
import fs from "node:fs"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { WORK_DIR } from "./env"
import { api, createClient, createUser, login, one, resetDb, sql } from "./helpers"

const OVERRIDES = path.join(WORK_DIR, "overrides.json")
let admin: string

beforeEach(async () => {
  resetDb()
  fs.rmSync(OVERRIDES, { force: true })
  createUser({ email: "admin@example.test", role: "super_admin" })
  admin = await login("admin@example.test")
})
afterEach(() => fs.rmSync(OVERRIDES, { force: true }))

describe("retired auth.php actions answer 404", () => {
  for (const action of ["login", "forgot", "reset", "magic_request", "magic_consume", "logout", "revoke", "twofa_setup", "twofa_enable", "twofa_disable", "twofa_recodes"]) {
    it(`POST ${action}`, async () => {
      const r = await api<{ error?: string }>(`auth.php?action=${action}`, { body: { email: "x@example.test", password: "whatever-long-enough", token: "t" }, token: admin })
      expect(r.status).toBe(404)
      expect(r.json.error).toBe("Unknown auth action.")
    })
  }

  it("GET sessions", async () => {
    expect((await api("auth.php?action=sessions", { token: admin })).status).toBe(404)
  })

  it("keeps `me`, which the Clerk sign-in uses to load the user", async () => {
    const r = await api<{ user: { email: string; role: string } }>("auth.php?action=me", { token: admin })
    expect(r.status).toBe(200)
    expect(r.json.user).toMatchObject({ email: "admin@example.test", role: "super_admin" })
    expect((await api("auth.php?action=me")).status).toBe(401)
  })
})

describe("retired endpoint files answer 404", () => {
  for (const [file, action, body] of [
    ["oauth.php", "status", undefined], ["oauth.php", "start", undefined], ["oauth.php", "callback", undefined],
    ["client_access.php", "status", undefined], ["client_access.php", "request", { email: "a@example.test", reference: "GK-P-2026-0001" }],
    ["client_access.php", "redeem", { token: "a".repeat(64) }],
  ] as const) {
    it(`${file} ${action}`, async () => {
      const r = await api(`${file}?action=${action}`, body ? { body } : {})
      expect(r.status).toBe(404)
    })
  }
})

describe("accounts carry no password", () => {
  const hashOf = (email: string) => one(`SELECT password_hash FROM users WHERE email = '${email}'`)

  it("creates a user without a password, and ignores one if it is sent", async () => {
    const a = await api("users.php?action=create", { body: { name: "Ann", email: "ann@example.test", role: "editor" }, token: admin })
    expect(a.status).toBe(201)
    expect(hashOf("ann@example.test")).toBe("!")
    const b = await api("users.php?action=create", { body: { name: "Bo", email: "bo@example.test", role: "editor", password: "A-long-password-1" }, token: admin })
    expect(b.status).toBe(201)
    expect(hashOf("bo@example.test")).toBe("!") // the unusable placeholder, never a real hash
  })

  it("invites a person without a set-password link, and the account works even if the email cannot be sent", async () => {
    const r = await api<{ id: number; emailed: boolean }>("users.php?action=invite", { body: { name: "Cy", email: "cy@example.test", role: "employee" }, token: admin })
    expect(r.status).toBe(201)
    expect(typeof r.json.emailed).toBe("boolean")
    expect(hashOf("cy@example.test")).toBe("!")
    expect(one("SELECT COUNT(*) FROM password_resets")).toBe("0")
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'user_invite'")).toBe("1")
  })

  it("keeps the invite rules: staff roles only, no duplicate email, only a super admin invites one", async () => {
    expect((await api("users.php?action=invite", { body: { name: "Dee", email: "dee@example.test", role: "client" }, token: admin })).status).toBe(400)
    await api("users.php?action=invite", { body: { name: "Ed", email: "ed@example.test", role: "employee" }, token: admin })
    expect((await api("users.php?action=invite", { body: { name: "Ed", email: "ed@example.test", role: "employee" }, token: admin })).status).toBe(409)
    createUser({ email: "mgr@example.test", role: "admin" })
    const mgr = await login("mgr@example.test")
    expect((await api("users.php?action=invite", { body: { name: "Su", email: "su@example.test", role: "super_admin" }, token: mgr })).status).toBe(403)
  })

  it("still links a client account to a client", async () => {
    const cid = createClient("Acme")
    expect((await api("users.php?action=create", { body: { name: "Cli", email: "cli@example.test", role: "client" }, token: admin })).status).toBe(400)
    expect((await api("users.php?action=create", { body: { name: "Cli", email: "cli@example.test", role: "client", client_id: cid }, token: admin })).status).toBe(201)
  })
})

describe("the bootstrap seed", () => {
  it("creates the first super admin from the configured email, with no password, once", async () => {
    sqlClearUsers()
    fs.writeFileSync(OVERRIDES, JSON.stringify({ SEED_ADMIN_EMAIL: "Owner@Example.test" }))
    await api("auth.php?action=me") // any auth.php request runs the seed; this one is unauthenticated (401)
    expect(one("SELECT CONCAT(email, ' ', role, ' ', password_hash) FROM users")).toBe("owner@example.test super_admin !")
    await api("auth.php?action=me")
    expect(one("SELECT COUNT(*) FROM users")).toBe("1")
  })

  it("seeds nothing when no email is configured", async () => {
    sqlClearUsers()
    await api("auth.php?action=me")
    expect(one("SELECT COUNT(*) FROM users")).toBe("0")
  })
})

function sqlClearUsers() {
  // resetDb leaves the signed-in admin; the seed only acts on an empty table.
  sql("DELETE FROM auth_tokens")
  sql("DELETE FROM users")
}
