/**
 * Certificates, end to end (Phase 6, K-134, K-061): a super admin or admin issues one in the CMS
 * (certificates.php), anyone verifies it on /verify (verify.php), and a revoked one is simply "no match".
 * Each route runs through the real PHP against a real database.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createUser, login, one, resetDb, sql } from "./helpers"

type Issued = { id: number; public_id: string }
type Row = { id: number; public_id: string; recipient: string; programme: string; issued_at: string; revoked_at: string | null }

const REF = /^GK-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/

let admin: string

beforeEach(async () => {
  resetDb()
  createUser({ email: "admin@example.test", role: "admin" })
  admin = await login("admin@example.test")
})

const issue = (body: Record<string, unknown>, token = admin) =>
  api<Issued & { error?: string }>("certificates.php?action=issue", { body, token })
const verify = (id: string) => api<Record<string, unknown> & { error?: string }>(`verify.php?id=${encodeURIComponent(id)}`)
const SAMPLE = { recipient: "Synthetic Student", programme: "Synthetic Web Design Course", issued_at: "2026-11-01" }

describe("issuing", () => {
  it("creates a certificate with an unguessable reference and records who issued it", async () => {
    const r = await issue(SAMPLE)
    expect(r.status).toBe(201)
    expect(r.json.public_id).toMatch(REF)
    expect(sql(`SELECT public_id, recipient, programme, issued_at, revoked_at IS NULL FROM certificates WHERE id = ${r.json.id}`)[0]).toEqual([
      r.json.public_id, "Synthetic Student", "Synthetic Web Design Course", "2026-11-01", "1",
    ])
    const uid = one(`SELECT id FROM users WHERE email = 'admin@example.test'`)
    expect(sql(`SELECT user_id, detail FROM audit_log WHERE action = 'certificate_issue'`)).toEqual([[uid, r.json.public_id]])
  })

  it("never repeats a reference and avoids look-alike characters", async () => {
    const ids = new Set<string>()
    for (let i = 0; i < 25; i++) {
      const r = await issue({ ...SAMPLE, recipient: `Student ${i}` })
      expect(r.status).toBe(201)
      expect(r.json.public_id).not.toMatch(/[01ILOU]/)
      ids.add(r.json.public_id)
    }
    expect(ids.size).toBe(25)
  })

  it("defaults the issue date to today and trims the text", async () => {
    const r = await issue({ recipient: "  Padded Name  ", programme: " Course " })
    expect(r.status).toBe(201)
    expect(sql(`SELECT recipient, programme, issued_at = CURRENT_DATE FROM certificates WHERE id = ${r.json.id}`)[0]).toEqual(["Padded Name", "Course", "1"])
  })

  it.each([
    ["no recipient", { programme: "Course" }],
    ["no programme", { recipient: "Name" }],
    ["a blank recipient", { recipient: "   ", programme: "Course" }],
    ["a malformed date", { recipient: "Name", programme: "Course", issued_at: "01/11/2026" }],
    ["an impossible date", { recipient: "Name", programme: "Course", issued_at: "2026-02-31" }],
    ["a date in the future", { recipient: "Name", programme: "Course", issued_at: "2999-01-01" }],
  ])("refuses %s and writes nothing", async (_label, body) => {
    const r = await issue(body)
    expect(r.status).toBe(400)
    expect(one("SELECT COUNT(*) FROM certificates")).toBe("0")
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'certificate_issue'")).toBe("0")
  })
})

describe("the register in the CMS", () => {
  it("lists issued certificates, newest first, with their state", async () => {
    const a = await issue({ ...SAMPLE, recipient: "First" })
    const b = await issue({ ...SAMPLE, recipient: "Second" })
    await api("certificates.php?action=revoke", { body: { id: a.json.id }, token: admin })
    const r = await api<Row[]>("certificates.php", { token: admin })
    expect(r.status).toBe(200)
    expect(r.json.map((c) => c.recipient)).toEqual(["Second", "First"])
    expect(r.json[0]).toMatchObject({ id: b.json.id, public_id: b.json.public_id, revoked_at: null })
    expect(r.json[1].revoked_at).not.toBeNull()
  })

  it("is for super admins and admins only", async () => {
    const issued = await issue(SAMPLE)
    for (const role of ["manager", "trainer", "editor", "employee"]) {
      createUser({ email: `${role}@example.test`, role })
      const t = await login(`${role}@example.test`)
      expect((await api("certificates.php", { token: t })).status, `${role} list`).toBe(403)
      expect((await issue(SAMPLE, t)).status, `${role} issue`).toBe(403)
      expect((await api("certificates.php?action=revoke", { body: { id: issued.json.id }, token: t })).status, `${role} revoke`).toBe(403)
    }
    createUser({ email: "portal@example.test", role: "client", clientId: createClient("Portal Ltd") })
    const client = await login("portal@example.test")
    expect((await api("certificates.php", { token: client })).status).toBe(403)
    expect((await issue(SAMPLE, client)).status).toBe(403)
    createUser({ email: "owner@example.test", role: "super_admin" })
    expect((await issue(SAMPLE, await login("owner@example.test"))).status).toBe(201)
    expect(one("SELECT COUNT(*) FROM certificates")).toBe("2")
  })

  it("refuses a signed-out caller on every route", async () => {
    expect((await api("certificates.php")).status).toBe(401)
    expect((await api("certificates.php?action=issue", { body: SAMPLE })).status).toBe(401)
    expect((await api("certificates.php?action=revoke", { body: { id: 1 } })).status).toBe(401)
  })
})

describe("revoking", () => {
  it("makes the certificate unverifiable, and records who did it", async () => {
    const c = await issue(SAMPLE)
    expect((await verify(c.json.public_id)).status).toBe(200)
    const r = await api<{ ok: boolean }>("certificates.php?action=revoke", { body: { id: c.json.id }, token: admin })
    expect(r.status).toBe(200)
    expect((await verify(c.json.public_id)).status).toBe(404)
    expect(one(`SELECT revoked_at IS NOT NULL FROM certificates WHERE id = ${c.json.id}`)).toBe("1")
    const uid = one(`SELECT id FROM users WHERE email = 'admin@example.test'`)
    expect(sql(`SELECT user_id, detail FROM audit_log WHERE action = 'certificate_revoke'`)).toEqual([[uid, c.json.public_id]])
  })

  it("answers 404 for a missing id and 409 for one already revoked, with one audit row", async () => {
    expect((await api("certificates.php?action=revoke", { body: { id: 9999 }, token: admin })).status).toBe(404)
    expect((await api("certificates.php?action=revoke", { body: {}, token: admin })).status).toBe(400)
    const c = await issue(SAMPLE)
    expect((await api("certificates.php?action=revoke", { body: { id: c.json.id }, token: admin })).status).toBe(200)
    const before = one(`SELECT revoked_at FROM certificates WHERE id = ${c.json.id}`)
    expect((await api("certificates.php?action=revoke", { body: { id: c.json.id }, token: admin })).status).toBe(409)
    expect(one(`SELECT revoked_at FROM certificates WHERE id = ${c.json.id}`)).toBe(before)
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'certificate_revoke'")).toBe("1")
  })
})

describe("verifying in public", () => {
  it("returns only the recipient, programme, date and reference", async () => {
    const c = await issue(SAMPLE)
    const r = await verify(c.json.public_id)
    expect(r.status).toBe(200)
    expect(r.json).toEqual({
      id: c.json.public_id, recipient: "Synthetic Student", programme: "Synthetic Web Design Course", issued_at: "1 November 2026",
    })
    expect(r.headers.get("cache-control")).toMatch(/no-store/)
  })

  it("accepts the reference in lower case or with spaces round it", async () => {
    const c = await issue(SAMPLE)
    expect((await verify(` ${c.json.public_id.toLowerCase()} `)).status).toBe(200)
  })

  it("answers the same 404 for a revoked, unknown, malformed or wildcard reference", async () => {
    const c = await issue(SAMPLE)
    await api("certificates.php?action=revoke", { body: { id: c.json.id }, token: admin })
    const answers = []
    for (const id of [c.json.public_id, "GK-AAAA-BBBB-CCCC", "nonsense", "GK-%", "' OR 1=1 --", "x".repeat(500)]) {
      const r = await verify(id)
      answers.push([r.status, JSON.stringify(r.json)])
    }
    expect(new Set(answers.map((a) => a.join("|"))).size).toBe(1)
    expect(answers[0][0]).toBe(404)
  })

  it("asks for a reference when none is given, and accepts GET only", async () => {
    expect((await api("verify.php")).status).toBe(400)
    expect((await api("verify.php?id=GK-AAAA-BBBB-CCCC", { body: {} })).status).toBe(405)
  })
})

describe("guessing is throttled (K-061)", () => {
  const misses = () => Number(one("SELECT COUNT(*) FROM audit_log WHERE action = 'certificate_lookup_miss'"))

  it("counts misses, not hits, and stops one connection after twenty misses in ten minutes", async () => {
    const c = await issue(SAMPLE)
    for (let i = 0; i < 5; i++) expect((await verify(c.json.public_id)).status).toBe(200)
    expect(misses()).toBe(0)
    for (let i = 0; i < 20; i++) expect((await verify(`GK-AAAA-AAAA-${String(1000 + i)}`)).status).toBe(404)
    expect(misses()).toBe(20)
    const blocked = await verify("GK-AAAA-AAAA-ZZZZ")
    expect(blocked.status).toBe(429)
    // A blocked caller learns nothing, not even about a real reference, and no more rows are written.
    expect((await verify(c.json.public_id)).status).toBe(429)
    expect(misses()).toBe(20)
  })

  it("lets the connection back in once the window has passed", async () => {
    const c = await issue(SAMPLE)
    for (let i = 0; i < 20; i++) await verify(`GK-AAAA-AAAA-${String(1000 + i)}`)
    expect((await verify(c.json.public_id)).status).toBe(429)
    sql("UPDATE audit_log SET created_at = NOW() - INTERVAL 11 MINUTE WHERE action = 'certificate_lookup_miss'")
    expect((await verify(c.json.public_id)).status).toBe(200)
  })

  it("keeps the guessed reference out of the audit log", async () => {
    await verify("GK-SECRET-GUESS-0000")
    expect(one("SELECT CONCAT(COUNT(*), '|', IFNULL(MAX(LENGTH(detail)), 0)) FROM audit_log WHERE action = 'certificate_lookup_miss'")).toBe("1|0")
  })
})
