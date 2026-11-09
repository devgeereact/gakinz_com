/**
 * Phase 7: the weekly digest and the overdue-invoice reminders remember what they sent.
 * Before, `cron.php job=all` mailed the digest and re-emailed every overdue invoice on every run, so a daily
 * cron meant a daily nag to clients. Now an invoice is reminded at most once per $CHASE_INTERVAL_DAYS (default 7),
 * counting a reminder sent by hand, and the digest goes at most once a week. A send that fails is not remembered,
 * so the next run retries. No schema change: the memory is the audit log. A fake SMTP server on 127.0.0.1 stands
 * in for the mail host, so nothing leaves the machine.
 */
import { spawn } from "node:child_process"
import fs from "node:fs"
import net from "node:net"
import path from "node:path"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { WORK_DIR } from "./env"
import { api, createClient, createInvoice, createUser, login, one, resetDb, sql } from "./helpers"

const OVERRIDES = path.join(WORK_DIR, "overrides.json")

type Mail = { rcpt: string[]; data: string }
let mails: Mail[] = []
let rejectRcpt = false
let server: net.Server
let port = 0

function startSmtp(): Promise<void> {
  server = net.createServer((sock) => {
    let buf = ""
    let inData = false
    let cur: Mail = { rcpt: [], data: "" }
    const send = (s: string) => sock.write(s + "\r\n")
    send("220 fake")
    sock.on("data", (chunk) => {
      buf += chunk.toString("utf8")
      for (;;) {
        if (inData) {
          const end = buf.indexOf("\r\n.\r\n")
          if (end < 0) return
          cur.data = buf.slice(0, end)
          buf = buf.slice(end + 5)
          inData = false
          mails.push(cur)
          cur = { rcpt: [], data: "" }
          send("250 queued")
          continue
        }
        const nl = buf.indexOf("\r\n")
        if (nl < 0) return
        const line = buf.slice(0, nl)
        buf = buf.slice(nl + 2)
        if (/^EHLO/i.test(line)) send("250 fake")
        else if (/^AUTH LOGIN/i.test(line)) send("334 VXNlcm5hbWU6")
        else if (/^MAIL FROM/i.test(line)) send("250 ok")
        else if (/^RCPT TO:<(.+)>/i.test(line)) {
          if (rejectRcpt) send("550 no")
          else {
            cur.rcpt.push(/^RCPT TO:<(.+)>/i.exec(line)![1])
            send("250 ok")
          }
        } else if (/^DATA/i.test(line)) {
          inData = true
          send("354 go")
        } else if (/^QUIT/i.test(line)) {
          send("221 bye")
          sock.end()
        } else if (/^[A-Za-z0-9+/=]+$/.test(line)) send(line.length < 12 ? "334 UGFzc3dvcmQ6" : "235 ok") // user then password
        else send("250 ok")
      }
    })
    sock.on("error", () => {})
  })
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve((port = (server.address() as net.AddressInfo).port, undefined))))
}

function configure(extra: Record<string, unknown> = {}) {
  fs.writeFileSync(
    OVERRIDES,
    JSON.stringify({ SMTP_HOST: "127.0.0.1", SMTP_PORT: port, SMTP_SECURE: "", SMTP_USER: "user", SMTP_PASS: "pass-longer-than-twelve", REPORT_RECIPIENTS: "owner@example.test", ...extra }),
  )
}

/** Runs cron.php asynchronously, so the fake SMTP server in this process can answer while it runs. */
function cron(job: string): Promise<Record<string, Record<string, unknown>>> {
  return new Promise((resolve) => {
    const p = spawn("php", [path.join(WORK_DIR, "cron.php"), `job=${job}`])
    let out = ""
    p.stdout.on("data", (d) => (out += d))
    p.on("close", () => resolve((JSON.parse(out || "{}") as { ran?: Record<string, Record<string, unknown>> }).ran ?? {}))
  })
}

function overdueInvoice(clientId: number, number: string, over: { status?: string; dueDaysAgo?: number } = {}): number {
  const id = createInvoice(clientId, [[1, 100]])
  const due = over.dueDaysAgo === undefined ? "CURRENT_DATE - INTERVAL 5 DAY" : `CURRENT_DATE - INTERVAL ${over.dueDaysAgo} DAY`
  sql(`UPDATE invoices SET status = '${over.status ?? "sent"}', number = '${number}', due_at = ${due} WHERE id = ${id}`)
  return id
}

const ageAudit = (action: string, days: number) =>
  sql(`UPDATE audit_log SET created_at = NOW() - INTERVAL ${days} DAY WHERE action = '${action}'`)

beforeAll(startSmtp)
afterAll(() => server.close())
beforeEach(() => {
  resetDb()
  mails = []
  rejectRcpt = false
  configure()
})
afterEach(() => fs.rmSync(OVERRIDES, { force: true }))

describe("overdue invoice reminders", () => {
  it("emails an overdue invoice once, and the next run the same day sends nothing", async () => {
    const c = createClient("Slow Payer Ltd", "slow@example.test")
    overdueInvoice(c, "INV-T1")
    expect((await cron("chase")).chase).toEqual({ sent: 1, skipped: 0, already_reminded: 0 })
    expect(mails).toHaveLength(1)
    expect(mails[0].rcpt).toEqual(["slow@example.test"])
    expect(mails[0].data).toContain("To: slow@example.test")
    expect((await cron("chase")).chase).toEqual({ sent: 0, skipped: 0, already_reminded: 1 })
    expect(mails).toHaveLength(1)
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'cron_chase'")).toBe("1")
  })

  it("reminds again once the interval has passed, and not before", async () => {
    const c = createClient("Slow Payer Ltd", "slow@example.test")
    overdueInvoice(c, "INV-T1")
    await cron("chase")
    ageAudit("cron_chase", 6)
    expect((await cron("chase")).chase).toMatchObject({ sent: 0, already_reminded: 1 })
    ageAudit("cron_chase", 8)
    expect((await cron("chase")).chase).toMatchObject({ sent: 1, already_reminded: 0 })
    expect(mails).toHaveLength(2)
  })

  it("uses $CHASE_INTERVAL_DAYS when it is set", async () => {
    configure({ CHASE_INTERVAL_DAYS: 3 })
    const c = createClient("Slow Payer Ltd", "slow@example.test")
    overdueInvoice(c, "INV-T1")
    await cron("chase")
    ageAudit("cron_chase", 2)
    expect((await cron("chase")).chase).toMatchObject({ sent: 0, already_reminded: 1 })
    ageAudit("cron_chase", 4)
    expect((await cron("chase")).chase).toMatchObject({ sent: 1 })
  })

  it("counts a reminder sent by hand", async () => {
    createUser({ email: "admin@example.test", role: "admin" })
    const admin = await login("admin@example.test")
    const c = createClient("Slow Payer Ltd", "slow@example.test")
    const id = overdueInvoice(c, "INV-T1")
    const manual = await api("invoices.php?action=chase", { token: admin, body: { id } })
    expect(manual.status).toBe(200)
    expect(mails).toHaveLength(1)
    expect((await cron("chase")).chase).toEqual({ sent: 0, skipped: 0, already_reminded: 1 })
    expect(mails).toHaveLength(1)
  })

  it("keeps a separate memory for each invoice, even for the same client", async () => {
    const c = createClient("Slow Payer Ltd", "slow@example.test")
    overdueInvoice(c, "INV-T1")
    await cron("chase")
    overdueInvoice(c, "INV-T2")
    expect((await cron("chase")).chase).toEqual({ sent: 1, skipped: 0, already_reminded: 1 })
    expect(mails).toHaveLength(2)
  })

  it("does not remember a send that failed, so the next run retries", async () => {
    const c = createClient("Slow Payer Ltd", "slow@example.test")
    overdueInvoice(c, "INV-T1")
    rejectRcpt = true
    expect((await cron("chase")).chase).toEqual({ sent: 0, skipped: 1, already_reminded: 0 })
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'cron_chase'")).toBe("0")
    rejectRcpt = false
    expect((await cron("chase")).chase).toMatchObject({ sent: 1 })
  })

  it("leaves alone invoices that are not overdue, not sent, or whose client has no email", async () => {
    const c = createClient("Fine Ltd", "fine@example.test")
    overdueInvoice(c, "INV-PAID", { status: "paid" })
    overdueInvoice(c, "INV-DRAFT", { status: "draft" })
    const future = createInvoice(c, [[1, 100]])
    sql(`UPDATE invoices SET status = 'sent', due_at = CURRENT_DATE + INTERVAL 5 DAY WHERE id = ${future}`)
    const noEmail = sql("INSERT INTO clients (company) VALUES ('No Email Ltd'); SELECT LAST_INSERT_ID();")
    overdueInvoice(Number(noEmail[0][0]), "INV-NOMAIL")
    expect((await cron("chase")).chase).toEqual({ sent: 0, skipped: 1, already_reminded: 0 })
    expect(mails).toHaveLength(0)
  })

  it("skips while another run holds the lock", async () => {
    const c = createClient("Slow Payer Ltd", "slow@example.test")
    overdueInvoice(c, "INV-T1")
    const holder = spawn("mysql", [...(await import("./helpers")).mysqlArgs(), "-N", "-e", "SELECT GET_LOCK('gk_cron_chase', 0); SELECT SLEEP(5);"])
    await new Promise((r) => setTimeout(r, 800))
    try {
      expect((await cron("chase")).chase).toEqual({ skipped: "another chase run is in progress" })
      expect(mails).toHaveLength(0)
    } finally {
      holder.kill()
      // Killing the client does not stop the server-side SLEEP, so wait until the lock is really free.
      for (let i = 0; i < 80 && one("SELECT IS_FREE_LOCK('gk_cron_chase')") !== "1"; i++) await new Promise((r) => setTimeout(r, 100))
    }
  })

  it("does nothing without a mail host, as before", async () => {
    configure({ SMTP_HOST: "" })
    const c = createClient("Slow Payer Ltd", "slow@example.test")
    overdueInvoice(c, "INV-T1")
    expect((await cron("chase")).chase).toEqual({ skipped: "no smtp" })
  })
})

describe("weekly digest", () => {
  it("sends once, then not again for six days, then again", async () => {
    expect((await cron("digest")).digest).toEqual({ sent_to: "owner@example.test" })
    expect(mails).toHaveLength(1)
    expect(mails[0].rcpt).toEqual(["owner@example.test"])
    expect((await cron("digest")).digest).toEqual({ skipped: "already sent this week" })
    ageAudit("cron_digest", 5)
    expect((await cron("digest")).digest).toEqual({ skipped: "already sent this week" })
    expect(mails).toHaveLength(1)
    ageAudit("cron_digest", 7)
    expect((await cron("digest")).digest).toEqual({ sent_to: "owner@example.test" })
    expect(mails).toHaveLength(2)
  })

  it("does not remember a failed send", async () => {
    rejectRcpt = true
    expect((await cron("digest")).digest).toHaveProperty("error")
    rejectRcpt = false
    expect((await cron("digest")).digest).toEqual({ sent_to: "owner@example.test" })
  })

  it("is quiet without recipients, as before", async () => {
    configure({ REPORT_RECIPIENTS: "" })
    expect((await cron("digest")).digest).toEqual({ skipped: "no recipients/smtp" })
  })

  it("job=all runs both jobs, and a second run the same day mails nobody", async () => {
    const c = createClient("Slow Payer Ltd", "slow@example.test")
    overdueInvoice(c, "INV-T1")
    const first = await cron("all")
    expect(first.chase).toMatchObject({ sent: 1 })
    expect(first.digest).toEqual({ sent_to: "owner@example.test" })
    expect(mails).toHaveLength(2)
    const second = await cron("all")
    expect(second.chase).toMatchObject({ sent: 0, already_reminded: 1 })
    expect(second.digest).toEqual({ skipped: "already sent this week" })
    expect(mails).toHaveLength(2)
  })
})
