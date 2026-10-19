/**
 * client_access.php: client sign-in by work reference and email
 * (docs/PRODUCT-SPEC.md 6.1, qa/TEST-PLAN.md J03 and J02).
 *
 * Switched off unless $REFERENCE_SIGNIN_ENABLED is strictly true. When on:
 * one neutral answer for every request outcome, a link only for an active
 * client-role user of the client that owns the reference, never for staff or
 * past two-factor, 15 minutes, single use under concurrency, throttled, and
 * the token never in the audit log.
 *
 * Mail goes to a fake SMTP server started here (the endpoint's real
 * _smtp.php transport, pointed at 127.0.0.1 through overrides.json), so the
 * test reads the link from the message exactly as a client would.
 */
import { spawn } from "node:child_process"
import fs from "node:fs"
import net from "node:net"
import path from "node:path"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { DB_NAME, WORK_DIR } from "./env"
import { api, createClient, createUser, mysqlArgs, one, PASSWORD, q, resetDb, sql, tokenHash } from "./helpers"

const OVERRIDES = path.join(WORK_DIR, "overrides.json")
const setOverrides = (values: Record<string, unknown>) => fs.writeFileSync(OVERRIDES, JSON.stringify(values))
const clearOverrides = () => fs.rmSync(OVERRIDES, { force: true })

// ── Fake SMTP server ─────────────────────────────────────────────────────────
type Mail = { to: string[]; data: string }
const mails: Mail[] = []
let smtp: net.Server
let smtpPort = 0

function startSmtp(): Promise<void> {
  smtp = net.createServer((sock) => {
    let buf = ""
    let inData = false
    let auth = 0
    let to: string[] = []
    sock.write("220 fake.test ESMTP\r\n")
    sock.on("data", (chunk) => {
      buf += chunk.toString("utf8")
      for (;;) {
        if (inData) {
          const end = buf.indexOf("\r\n.\r\n")
          if (end < 0) break
          mails.push({ to, data: buf.slice(0, end) })
          buf = buf.slice(end + 5)
          inData = false
          to = []
          sock.write("250 queued\r\n")
          continue
        }
        const i = buf.indexOf("\r\n")
        if (i < 0) break
        const line = buf.slice(0, i)
        buf = buf.slice(i + 2)
        const cmd = line.toUpperCase()
        if (auth === 1) { auth = 2; sock.write("334 UGFzc3dvcmQ6\r\n") }
        else if (auth === 2) { auth = 0; sock.write("235 ok\r\n") }
        else if (cmd.startsWith("EHLO")) sock.write("250 fake.test\r\n")
        else if (cmd === "AUTH LOGIN") { auth = 1; sock.write("334 VXNlcm5hbWU6\r\n") }
        else if (cmd.startsWith("RCPT TO:")) { to.push(line.slice(8).replace(/[<>]/g, "")); sock.write("250 ok\r\n") }
        else if (cmd === "DATA") { inData = true; sock.write("354 go\r\n") }
        else if (cmd === "QUIT") { sock.end("221 bye\r\n"); return }
        else sock.write("250 ok\r\n")
      }
    })
    sock.on("error", () => { /* the client closed first */ })
  })
  return new Promise((resolve) => smtp.listen(0, "127.0.0.1", () => {
    smtpPort = (smtp.address() as net.AddressInfo).port
    resolve()
  }))
}

const ENABLED = () => ({ REFERENCE_SIGNIN_ENABLED: true, SMTP_HOST: "127.0.0.1", SMTP_PORT: smtpPort, SMTP_SECURE: "" })

// ── Fixtures ─────────────────────────────────────────────────────────────────
type Fx = { clientA: number; clientB: number; userA: number; refA: string; refB: string; enqRefA: string }

function fixtures(): Fx {
  sql(`INSERT INTO enquiries (name, email, message, reference) VALUES ('Ada', 'ada@example.test', 'A site please', 'GK-E-2026-0001')`)
  const enquiryA = Number(one("SELECT MAX(id) FROM enquiries"))
  const clientA = createClient("Alpha Ltd", "office@alpha.example.test")
  sql(`UPDATE clients SET source_lead_id = ${enquiryA} WHERE id = ${clientA}`)
  const clientB = createClient("Beta Ltd", "office@beta.example.test")
  sql(`INSERT INTO projects (client_id, name, reference) VALUES (${clientA}, 'Alpha site', 'GK-P-2026-0001')`)
  sql(`INSERT INTO projects (client_id, name, reference) VALUES (${clientB}, 'Beta site', 'GK-P-2026-0002')`)
  const userA = createUser({ email: "ada@alpha.example.test", role: "client", clientId: clientA })
  createUser({ email: "bob@beta.example.test", role: "client", clientId: clientB })
  return { clientA, clientB, userA, refA: "GK-P-2026-0001", refB: "GK-P-2026-0002", enqRefA: "GK-E-2026-0001" }
}

const request = (reference: unknown, email: unknown) =>
  api<{ ok?: boolean; message?: string; error?: string }>("client_access.php?action=request", { body: { reference, email } })
const redeem = (token: unknown) =>
  api<{ token?: string; error?: string; user?: { role: string; client_id: number } }>("client_access.php?action=redeem", { body: { token } })

const links = () => Number(one("SELECT COUNT(*) FROM magic_links"))
const sessions = (uid: number) => Number(one(`SELECT COUNT(*) FROM auth_tokens WHERE user_id = ${uid}`))

/** The token in the last message sent to `to`. */
function tokenFromMail(to: string): string {
  const mail = [...mails].reverse().find((m) => m.to.includes(to))
  expect(mail, `no mail to ${to}`).toBeDefined()
  const m = mail!.data.match(/\/login#access=([0-9a-f]{64})/)
  expect(m, "no link in the mail").not.toBeNull()
  return m![1]
}

/** A link written straight into the table, hashed as the endpoint writes it. */
function plantLink(userId: number, minutes = 15): string {
  const token = [...Array(64)].map(() => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")
  sql(`INSERT INTO magic_links (user_id, token, expires_at) VALUES (${userId}, ${q(tokenHash(token))}, NOW() + INTERVAL ${minutes} MINUTE)`)
  return token
}

beforeAll(startSmtp)
afterAll(() => { clearOverrides(); smtp.close() })

// ── Switched off ─────────────────────────────────────────────────────────────
describe("switched off", () => {
  let fx: Fx
  beforeEach(() => { resetDb(); fx = fixtures(); mails.length = 0 })
  afterEach(clearOverrides)

  const routes: Array<[string, string, unknown]> = [
    ["status", "GET", undefined],
    ["request", "POST", { reference: "GK-P-2026-0001", email: "ada@alpha.example.test" }],
    ["redeem", "POST", { token: "a".repeat(64) }],
    ["", "GET", undefined],
    ["nonsense", "POST", {}],
  ]

  it.each([
    ["absent from config", null],
    ["false", false],
    ["the number 1", 1],
    ["the string 'true'", "true"],
    ["the string '1'", "1"],
  ])("answers 404 on every route when the switch is %s", async (_label, value) => {
    // Mail is configured either way, so only the switch can be what stops it.
    const mail = { SMTP_HOST: "127.0.0.1", SMTP_PORT: smtpPort, SMTP_SECURE: "" }
    setOverrides(value === null ? mail : { ...mail, REFERENCE_SIGNIN_ENABLED: value })
    for (const [action, method, body] of routes) {
      const r = await api(`client_access.php?action=${action}`, { method, body })
      expect(r.status, `${method} ${action}`).toBe(404)
      expect(r.json).toEqual({ error: "Not found." })
    }
    // A planted link for a real client cannot be redeemed here either.
    expect((await redeem(plantLink(fx.userA))).status).toBe(404)
    expect(sessions(fx.userA)).toBe(0)
    expect(mails).toHaveLength(0)
    expect(one("SELECT COUNT(*) FROM audit_log")).toBe("0")
  })

  it("adds nothing to the sign-in page: the status probe the page reads is a 404", async () => {
    const r = await api("client_access.php?action=status")
    expect(r.status).toBe(404)
  })
})

// ── Switched on ──────────────────────────────────────────────────────────────
describe("switched on", () => {
  let fx: Fx
  beforeEach(() => { resetDb(); fx = fixtures(); mails.length = 0; setOverrides(ENABLED()) })
  afterEach(clearOverrides)

  it("reports itself enabled, with no caching or indexing", async () => {
    const r = await api("client_access.php?action=status")
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ enabled: true })
    expect(r.headers.get("cache-control")).toBe("no-store")
    expect(r.headers.get("x-robots-tag")).toMatch(/noindex/)
    expect(r.headers.get("referrer-policy")).toBe("no-referrer")
  })

  it("emails a working one-time link for a matching project reference, and the session is the client's", async () => {
    const r = await request(fx.refA, "ada@alpha.example.test")
    expect(r.status).toBe(200)
    expect(mails).toHaveLength(1)
    expect(mails[0].to).toEqual(["ada@alpha.example.test"])
    const token = tokenFromMail("ada@alpha.example.test")
    // Stored hashed only, expiring in 15 minutes by the database clock.
    expect(one(`SELECT COUNT(*) FROM magic_links WHERE token = ${q(token)}`)).toBe("0")
    expect(one(`SELECT COUNT(*) FROM magic_links WHERE token = ${q(tokenHash(token))}`)).toBe("1")
    const ttl = Number(one("SELECT TIMESTAMPDIFF(SECOND, NOW(), expires_at) FROM magic_links"))
    expect(ttl).toBeGreaterThan(14 * 60 - 5)
    expect(ttl).toBeLessThanOrEqual(15 * 60)

    const s = await redeem(token)
    expect(s.status).toBe(200)
    expect(s.json.token).toMatch(/^[0-9a-f]{64}$/)
    expect(s.json.user).toMatchObject({ role: "client", client_id: fx.clientA })
    const me = await api<{ user: { role: string; client_id: number } }>("auth.php?action=me", { token: s.json.token })
    expect(me.status).toBe(200)
    expect(me.json.user).toMatchObject({ role: "client", client_id: fx.clientA })
  })

  it("matches the enquiry reference of the enquiry the client was converted from, and ignores case", async () => {
    expect((await request(fx.enqRefA.toLowerCase(), "ADA@Alpha.Example.TEST")).status).toBe(200)
    expect(mails).toHaveLength(1)
    expect(mails[0].to).toEqual(["ada@alpha.example.test"])
  })

  it("answers identically, in similar time, for a match, a wrong pair, an unknown reference and a staff address", async () => {
    createUser({ email: "owner@example.test", role: "super_admin" })
    const cases: Array<[string, string, string]> = [
      ["match", fx.refA, "ada@alpha.example.test"],
      ["another client's reference", fx.refB, "ada@alpha.example.test"],
      ["unknown reference", "GK-P-2026-0999", "ada@alpha.example.test"],
      ["unknown address", fx.refA, "nobody@example.test"],
      ["staff address", fx.refA, "owner@example.test"],
    ]
    const seen: Array<{ label: string; status: number; body: string; ms: number }> = []
    for (const [label, ref, email] of cases) {
      const t0 = performance.now()
      const r = await request(ref, email)
      seen.push({ label, status: r.status, body: JSON.stringify(r.json), ms: performance.now() - t0 })
    }
    for (const s of seen) {
      expect(s.status, s.label).toBe(200)
      expect(s.body, s.label).toBe(seen[0].body)
      expect(s.ms, s.label).toBeGreaterThanOrEqual(990) // CA_MIN_MS floor on this server
    }
    const times = seen.map((s) => s.ms)
    expect(Math.max(...times) - Math.min(...times)).toBeLessThan(250)
    // Only the true match produced a link.
    expect(mails).toHaveLength(1)
    expect(links()).toBe(1)
  })

  it("sends nothing for another client's reference with this client's email", async () => {
    await request(fx.refB, "ada@alpha.example.test")
    await request(fx.refA, "bob@beta.example.test")
    expect(mails).toHaveLength(0)
    expect(links()).toBe(0)
  })

  it("never accepts a reference alone or an email alone", async () => {
    for (const [ref, email] of [[fx.refA, ""], ["", "ada@alpha.example.test"], [fx.refA, undefined], [undefined, "ada@alpha.example.test"], [["GK-P-2026-0001"], "ada@alpha.example.test"]]) {
      const r = await request(ref, email)
      expect(r.status).toBe(400)
    }
    expect((await request("Alpha Ltd", "ada@alpha.example.test")).status).toBe(400)
    expect(mails).toHaveLength(0)
    expect(links()).toBe(0)
  })

  it.each(["super_admin", "admin", "manager", "trainer", "editor", "employee"])(
    "never sends a %s a link, even with that role linked to the client and a matching reference",
    async (role) => {
      createUser({ email: `${role}@alpha.example.test`, role, clientId: fx.clientA })
      expect((await request(fx.refA, `${role}@alpha.example.test`)).status).toBe(200)
      expect(mails).toHaveLength(0)
      expect(links()).toBe(0)
    },
  )

  it.each(["super_admin", "admin", "manager", "trainer", "editor", "employee"])(
    "never creates a session for a %s, even from a valid link",
    async (role) => {
      const staff = createUser({ email: `${role}@example.test`, role, clientId: fx.clientA })
      const r = await redeem(plantLink(staff))
      expect(r.status).toBe(403)
      expect(r.json.token).toBeUndefined()
      expect(sessions(staff)).toBe(0)
      expect(one(`SELECT detail FROM audit_log WHERE action = 'client_access_refused' AND user_id = ${staff}`)).toBe(`role ${role}`)
    },
  )

  it("does not skip two-factor: no link is sent and a planted link is refused", async () => {
    const guarded = createUser({ email: "guarded@alpha.example.test", role: "client", clientId: fx.clientA, totpSecret: "JBSWY3DPEHPK3PXP" })
    expect((await request(fx.refA, "guarded@alpha.example.test")).status).toBe(200)
    expect(mails).toHaveLength(0)
    const r = await redeem(plantLink(guarded))
    expect(r.status).toBe(403)
    expect(sessions(guarded)).toBe(0)
  })

  it("sends nothing to a suspended client, or for a deleted project", async () => {
    sql(`UPDATE users SET status = 'suspended' WHERE id = ${fx.userA}`)
    await request(fx.refA, "ada@alpha.example.test")
    sql(`UPDATE users SET status = 'active' WHERE id = ${fx.userA}`)
    sql(`UPDATE projects SET deleted_at = NOW() WHERE reference = ${q(fx.refA)}`)
    await request(fx.refA, "ada@alpha.example.test")
    expect(mails).toHaveLength(0)
    expect(links()).toBe(0)
  })

  it("refuses an expired link", async () => {
    await request(fx.refA, "ada@alpha.example.test")
    const token = tokenFromMail("ada@alpha.example.test")
    sql("UPDATE magic_links SET expires_at = NOW() - INTERVAL 1 SECOND")
    const r = await redeem(token)
    expect(r.status).toBe(400)
    expect(sessions(fx.userA)).toBe(0)
  })

  it("works once: a second use fails here and through the magic-link route", async () => {
    await request(fx.refA, "ada@alpha.example.test")
    const token = tokenFromMail("ada@alpha.example.test")
    expect((await redeem(token)).status).toBe(200)
    const again = await redeem(token)
    expect(again.status).toBe(400)
    expect(again.json.error).toBe("This sign-in link is invalid or has expired.")
    expect((await api("auth.php?action=magic_consume", { body: { token } })).status).toBe(400)
    expect(sessions(fx.userA)).toBe(1)
  })

  it("allows exactly one redemption out of five concurrent requests", async () => {
    await request(fx.refA, "ada@alpha.example.test")
    const token = tokenFromMail("ada@alpha.example.test")
    const results = await Promise.all(Array.from({ length: 5 }, () => redeem(token)))
    expect(results.filter((r) => r.status === 200)).toHaveLength(1)
    expect(results.filter((r) => r.status === 400)).toHaveLength(4)
    expect(sessions(fx.userA)).toBe(1)
  })

  it("allows exactly one redemption when five requests are forced to race on the claim", async () => {
    // Plain concurrent requests rarely overlap inside the few microseconds
    // between the lookup and the claim. Here a second connection holds the
    // link's row lock, so all five requests pass the lookup and queue on the
    // claim's UPDATE; only the guarded UPDATE keeps it to one.
    await request(fx.refA, "ada@alpha.example.test")
    const token = tokenFromMail("ada@alpha.example.test")
    const holder = spawn("mysql", mysqlArgs(DB_NAME), { stdio: ["pipe", "ignore", "ignore"] })
    const closed = new Promise((r) => holder.on("close", r))
    holder.stdin.write("BEGIN; SELECT id FROM magic_links FOR UPDATE;\n")
    await new Promise((r) => setTimeout(r, 500))
    const pending = Promise.all(Array.from({ length: 5 }, () => redeem(token)))
    await new Promise((r) => setTimeout(r, 1500))
    // Nothing has been claimed while the lock is held.
    expect(one("SELECT COUNT(*) FROM magic_links WHERE used_at IS NOT NULL")).toBe("0")
    holder.stdin.end("COMMIT;\n")
    const results = await pending
    await closed
    expect(results.filter((r) => r.status === 200)).toHaveLength(1)
    expect(sessions(fx.userA)).toBe(1)
  })

  it("is not a password reset: the token does nothing at auth.php reset and the password stays", async () => {
    await request(fx.refA, "ada@alpha.example.test")
    const token = tokenFromMail("ada@alpha.example.test")
    const before = one(`SELECT password_hash FROM users WHERE id = ${fx.userA}`)
    const r = await api("auth.php?action=reset", { body: { token, password: "A-new-password-123" } })
    expect(r.status).toBe(400)
    expect(one(`SELECT password_hash FROM users WHERE id = ${fx.userA}`)).toBe(before)
    // The old password still signs in.
    const login = await api<{ token?: string }>("auth.php?action=login", { body: { email: "ada@alpha.example.test", password: PASSWORD } })
    expect(login.status).toBe(200)
  })

  it("refuses a malformed, unknown or stored-hash token with one answer", async () => {
    await request(fx.refA, "ada@alpha.example.test")
    const token = tokenFromMail("ada@alpha.example.test")
    const bodies = new Set<string>()
    for (const t of ["", "xyz", "f".repeat(64), tokenHash(token), token.toUpperCase(), 12345]) {
      const r = await redeem(t)
      expect(r.status).toBe(400)
      bodies.add(JSON.stringify(r.json))
    }
    expect(bodies.size).toBe(1)
    expect(sessions(fx.userA)).toBe(0)
  })

  it("keeps the token, its hash, the reference and the address out of the audit log", async () => {
    await request(fx.refA, "ada@alpha.example.test")
    const token = tokenFromMail("ada@alpha.example.test")
    await redeem(token)
    await redeem(token)
    const rows = sql("SELECT action, COALESCE(detail, '') FROM audit_log")
    expect(rows.map((r) => r[0])).toEqual(expect.arrayContaining(["client_access_request", "client_access_link", "login_client_access", "client_access_redeem_failed"]))
    const all = rows.map((r) => r.join(" ")).join("\n")
    for (const secret of [token, tokenHash(token), fx.refA, "ada@alpha.example.test"]) expect(all).not.toContain(secret)
  })

  it("throttles one address after five requests, whether or not it matches", async () => {
    for (let i = 0; i < 5; i++) expect((await request(fx.refA, "ada@alpha.example.test")).status).toBe(200)
    const blocked = await request(fx.refA, "ada@alpha.example.test")
    expect(blocked.status).toBe(429)
    // Three links at most per user per 15 minutes, shared with magic links.
    expect(links()).toBe(3)
    expect(mails).toHaveLength(3)
  })

  it("throttles one IP after twenty requests, with the same 429 for a real and a made-up address", async () => {
    for (let i = 0; i < 19; i++) {
      sql(`INSERT INTO audit_log (action, detail, ip) VALUES ('client_access_request', ${q(`e:seed${i}`)}, '127.0.0.1')`)
    }
    expect((await request(fx.refA, "nobody@example.test")).status).toBe(200)
    const real = await request(fx.refA, "ada@alpha.example.test")
    const fake = await request("GK-P-2026-0999", "nobody2@example.test")
    expect(real.status).toBe(429)
    expect(fake.status).toBe(429)
    expect(JSON.stringify(real.json)).toBe(JSON.stringify(fake.json))
    expect(mails).toHaveLength(0)
  })

  it("throttles failed redemptions from one IP, then refuses even a good link", async () => {
    await request(fx.refA, "ada@alpha.example.test")
    const token = tokenFromMail("ada@alpha.example.test")
    for (let i = 0; i < 20; i++) sql("INSERT INTO audit_log (action, detail, ip) VALUES ('client_access_redeem_failed', '', '127.0.0.1')")
    const r = await redeem(token)
    expect(r.status).toBe(429)
    expect(sessions(fx.userA)).toBe(0)
  })

  it("sends nothing without an SMTP host, and still answers the neutral 200", async () => {
    setOverrides({ ...ENABLED(), SMTP_HOST: "" })
    const r = await request(fx.refA, "ada@alpha.example.test")
    expect(r.status).toBe(200)
    expect(links()).toBe(0)
    expect(mails).toHaveLength(0)
  })

  it("matches nothing before SQL 19, with the same neutral answer", async () => {
    sql("ALTER TABLE projects DROP INDEX uq_project_reference, DROP COLUMN reference")
    try {
      const r = await request(fx.refA, "ada@alpha.example.test")
      expect(r.status).toBe(200)
      expect(r.json.message).toMatch(/If the reference and email match/)
      expect(links()).toBe(0)
    } finally {
      sql("ALTER TABLE projects ADD COLUMN reference VARCHAR(20) NULL DEFAULT NULL AFTER due_date, ADD UNIQUE KEY uq_project_reference (reference)")
    }
  })
})
