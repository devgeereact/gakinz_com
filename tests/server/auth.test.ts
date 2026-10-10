/**
 * Plan findings A22 and A23. A magic link is a customer convenience: it must
 * never sign in a staff account, never skip two-factor, and must work at most
 * once even under concurrent requests.
 */
import crypto from "node:crypto"
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createUser, login, one, q, resetDb, sql, totp, PASSWORD } from "./helpers"

function magicLink(userId: number, minutes = 15): string {
  const token = crypto.randomBytes(32).toString("hex")
  sql(`INSERT INTO magic_links (user_id, token, expires_at) VALUES (${userId}, ${q(token)}, NOW() + INTERVAL ${minutes} MINUTE)`)
  return token
}

const consume = (token: string) =>
  api<{ token?: string; error?: string }>("auth.php?action=magic_consume", { body: { token } })

const SECRET = "JBSWY3DPEHPK3PXP" // synthetic base32 TOTP secret

describe("magic-link sign-in", () => {
  let clientUser: number
  beforeEach(() => {
    resetDb()
    clientUser = createUser({ email: "client@example.test", role: "client", clientId: createClient("Synthetic Ltd") })
  })

  it("signs a client in once", async () => {
    const link = magicLink(clientUser)
    const first = await consume(link)
    expect(first.status).toBe(200)
    expect(first.json.token).toMatch(/^[0-9a-f]{64}$/)
    const again = await consume(link)
    expect(again.status).toBe(400)
  })

  it("redeems at most once under concurrent requests", async () => {
    const link = magicLink(clientUser)
    const results = await Promise.all(Array.from({ length: 6 }, () => consume(link)))
    expect(results.filter((r) => r.status === 200)).toHaveLength(1)
    expect(one(`SELECT COUNT(*) FROM auth_tokens WHERE user_id = ${clientUser}`)).toBe("1")
  })

  it("rejects an expired link", async () => {
    const link = magicLink(clientUser, -1)
    expect((await consume(link)).status).toBe(400)
  })

  it.each(["super_admin", "admin", "manager", "editor", "employee", "trainer"])(
    "never signs in a %s account",
    async (role) => {
      const staff = createUser({ email: `${role}@example.test`, role })
      const r = await consume(magicLink(staff))
      expect(r.status).toBe(403)
      expect(r.json.token).toBeUndefined()
      expect(one(`SELECT COUNT(*) FROM auth_tokens WHERE user_id = ${staff}`)).toBe("0")
    },
  )

  it("does not skip two-factor for a client who has it on", async () => {
    const guarded = createUser({ email: "guarded@example.test", role: "client", clientId: createClient("Guarded Ltd"), totpSecret: SECRET })
    const r = await consume(magicLink(guarded))
    expect(r.status).toBe(403)
    expect(r.json.error).toMatch(/two-factor/i)
    expect(one(`SELECT COUNT(*) FROM auth_tokens WHERE user_id = ${guarded}`)).toBe("0")
  })
})

describe("password sign-in with two-factor (regression)", () => {
  beforeEach(() => resetDb())

  it("still asks for the code, and accepts a valid one", async () => {
    createUser({ email: "owner@example.test", role: "super_admin", totpSecret: SECRET })
    const without = await api<{ two_factor_required?: boolean }>("auth.php?action=login", {
      body: { email: "owner@example.test", password: PASSWORD },
    })
    expect(without.status).toBe(401)
    expect(without.json.two_factor_required).toBe(true)
    expect(await login("owner@example.test", totp(SECRET))).toMatch(/^[0-9a-f]{64}$/)
  })
})
