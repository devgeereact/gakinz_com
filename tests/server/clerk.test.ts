/**
 * Clerk email-code sign-in: a Clerk session token is accepted by require_auth(), linked to a
 * users row by clerk_user_id or (first sign-in) by verified email, and never creates a user.
 * The signing keys come from a pre-seeded cache file (no network): the issuer is synthetic.
 */
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { WORK_DIR } from "./env"
import { api, createClient, createUser, login, one, q, resetDb, sql } from "./helpers"

const ISSUER = "https://clerk.test.example"
const AZP = "https://gakinz.com"
const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url")

const good = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 })
const other = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 })

function seedJwks(): void {
  const jwk = { ...good.publicKey.export({ format: "jwk" }), kid: "k1", use: "sig", alg: "RS256" }
  const dir = path.join(WORK_DIR, "clerk-cache")
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `clerk-jwks-${crypto.createHash("sha256").update(ISSUER).digest("hex")}.json`)
  fs.writeFileSync(file, JSON.stringify({ fetched_at: Math.floor(Date.now() / 1000), keys: [jwk] }))
}

function token(claims: Record<string, unknown> = {}, key = good.privateKey, header: Record<string, unknown> = {}): string {
  const now = Math.floor(Date.now() / 1000)
  const h = b64u(JSON.stringify({ alg: "RS256", kid: "k1", typ: "JWT", ...header }))
  const p = b64u(JSON.stringify({ iss: ISSUER, sub: "user_abc", azp: AZP, exp: now + 60, nbf: now - 5, email: "staff@example.test", ...claims }))
  const sig = crypto.sign("RSA-SHA256", Buffer.from(`${h}.${p}`), key)
  return `${h}.${p}.${b64u(sig)}`
}

const me = (t: string) => api<{ user?: { email: string; role: string }; error?: string }>("auth.php?action=me", { token: t })

describe("Clerk sign-in", () => {
  beforeEach(() => {
    resetDb()
    seedJwks()
  })

  it("links an approved user by verified email on first sign-in, keeping the role", async () => {
    createUser({ email: "staff@example.test", role: "admin" })
    const r = await me(token())
    expect(r.status).toBe(200)
    expect(r.json.user?.role).toBe("admin")
    expect(one(`SELECT clerk_user_id FROM users WHERE email = ${q("staff@example.test")}`)).toBe("user_abc")
  })

  it("matches later sign-ins on the Clerk user id alone", async () => {
    createUser({ email: "staff@example.test", role: "manager" })
    await me(token())
    const r = await me(token({ email: undefined }))
    expect(r.status).toBe(200)
    expect(r.json.user?.email).toBe("staff@example.test")
  })

  it("does not let another Clerk user take over a linked row", async () => {
    createUser({ email: "staff@example.test", role: "admin" })
    await me(token())
    expect((await me(token({ sub: "user_mallory" }))).status).toBe(401)
  })

  it("gives an unknown email nothing and creates no user", async () => {
    createUser({ email: "staff@example.test", role: "admin" })
    const before = one("SELECT COUNT(*) FROM users")
    expect((await me(token({ sub: "user_x", email: "stranger@example.test" }))).status).toBe(401)
    expect(one("SELECT COUNT(*) FROM users")).toBe(before)
  })

  it("refuses a suspended or deleted user", async () => {
    createUser({ email: "staff@example.test", role: "admin" })
    await me(token())
    sql(`UPDATE users SET status = 'suspended' WHERE email = ${q("staff@example.test")}`)
    expect((await me(token())).status).toBe(403)
    sql(`UPDATE users SET status = 'active', deleted_at = NOW() WHERE email = ${q("staff@example.test")}`)
    expect((await me(token())).status).toBe(401)
  })

  it("keeps role checks: a client token cannot use a staff endpoint", async () => {
    createUser({ email: "client@example.test", role: "client", clientId: createClient("Synthetic Ltd") })
    const t = token({ sub: "user_client", email: "client@example.test" })
    expect((await me(t)).status).toBe(200)
    expect((await api("users.php", { token: t })).status).toBe(403)
  })

  it("rejects bad tokens", async () => {
    createUser({ email: "staff@example.test", role: "admin" })
    const now = Math.floor(Date.now() / 1000)
    expect((await me(token({}, other.privateKey))).status).toBe(401)
    expect((await me(token({ iss: "https://clerk.evil.example" }))).status).toBe(401)
    expect((await me(token({ exp: now - 60 }))).status).toBe(401)
    expect((await me(token({ azp: "https://evil.example" }))).status).toBe(401)
    expect((await me(token({}, good.privateKey, { kid: "unknown" }))).status).toBe(401)
    expect((await me("a.b.c")).status).toBe(401)
    expect(one(`SELECT clerk_user_id IS NULL FROM users WHERE email = ${q("staff@example.test")}`)).toBe("1")
  })

  it("still accepts the existing password session", async () => {
    createUser({ email: "legacy@example.test", role: "admin" })
    const legacy = await login("legacy@example.test")
    expect((await me(legacy)).status).toBe(200)
  })
})
