/**
 * IT support time from tickets (SQL 17, support.php?action=log_time).
 * Staff log time from a ticket. The entry goes onto the client's standing
 * "IT support" project (projects.kind = 'it_support'), which the first log
 * creates exactly once, even under parallel first logs, and later logs reuse.
 * The ticket detail shows the logged time to staff; a client never sees time,
 * and the portal lists the standing project as "IT support" with no tasks.
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createUser, login, one, q, resetDb, sql } from "./helpers"

type Row = Record<string, unknown>
type LogReply = { id?: number; project_id?: number; project_created?: boolean; error?: string }
type TimeBlock = { total_minutes: number; entries: Array<Row & { id: number; minutes: number }> }

let owner: string
let ownerId: number
let clientId: number
let ticketId: number

function createTicket(client: number | null, subject = "Printer offline"): number {
  sql(`INSERT INTO tickets (client_id, subject, body) VALUES (${q(client)}, ${q(subject)}, 'Synthetic body')`)
  return Number(one("SELECT MAX(id) FROM tickets"))
}

function logTime(body: Row, token = owner) {
  return api<LogReply>("support.php?action=log_time", { body, token })
}

/** Today in PHP's own time zone, as the server's default entry_date uses. */
function phpToday(): string {
  const r = spawnSync("php", ["-r", "echo (new DateTime())->format('Y-m-d');"], { encoding: "utf8" })
  if (r.status !== 0) throw new Error(r.stderr)
  return r.stdout
}

const count = (from: string) => Number(one(`SELECT COUNT(*) FROM ${from}`))
const standing = (client: number) => count(`projects WHERE client_id = ${client} AND kind = 'it_support'`)
const auditCount = (action: string) => count(`audit_log WHERE action = '${action}'`)

beforeEach(async () => {
  resetDb()
  ownerId = createUser({ email: "owner@example.test", role: "super_admin" })
  owner = await login("owner@example.test")
  clientId = createClient("Helpdesk Ltd")
  ticketId = createTicket(clientId)
})

describe("log_time", () => {
  it("creates the client's IT support project on the first log and puts the entry on it", async () => {
    const r = await logTime({ id: ticketId, minutes: 45, description: "  Reset the router  ", billable: true, entry_date: "2026-10-01" })
    expect(r.status).toBe(201)
    expect(r.json.project_created).toBe(true)

    const [project] = sql(`SELECT id, name, kind, client_id, status, stage FROM projects`)
    expect(project).toEqual([String(r.json.project_id), "IT support", "it_support", String(clientId), "in_progress", "support"])

    const [entry] = sql(
      `SELECT project_id, ticket_id, user_id, description, minutes, billable, status, entry_date FROM time_entries WHERE id = ${r.json.id}`,
    )
    expect(entry).toEqual([String(r.json.project_id), String(ticketId), String(ownerId), "Reset the router", "45", "1", "draft", "2026-10-01"])
    expect(auditCount("project_create")).toBe(1)
    expect(auditCount("ticket_time_log")).toBe(1)
  })

  it("reuses the standing project for later logs, on the same ticket or another of the client's", async () => {
    const first = await logTime({ id: ticketId, minutes: 30 })
    const otherTicket = createTicket(clientId, "Email bouncing")
    const second = await logTime({ id: otherTicket, minutes: 15 })
    const third = await logTime({ id: ticketId, minutes: 10 })

    expect(second.status).toBe(201)
    expect(second.json.project_created).toBe(false)
    expect(third.json.project_created).toBe(false)
    expect(second.json.project_id).toBe(first.json.project_id)
    expect(third.json.project_id).toBe(first.json.project_id)
    expect(standing(clientId)).toBe(1)
    expect(count(`time_entries WHERE project_id = ${first.json.project_id}`)).toBe(3)
    expect(auditCount("project_create")).toBe(1)
  })

  it("creates exactly one project when several first logs arrive at once", async () => {
    const tickets = [ticketId, createTicket(clientId, "Second"), createTicket(clientId, "Third"), createTicket(clientId, "Fourth")]
    const replies = await Promise.all(tickets.map((id, i) => logTime({ id, minutes: 5 + i })))

    expect(replies.map((r) => r.status)).toEqual([201, 201, 201, 201])
    expect(standing(clientId)).toBe(1)
    expect(new Set(replies.map((r) => r.json.project_id)).size).toBe(1)
    expect(replies.filter((r) => r.json.project_created).length).toBe(1)
    expect(count("time_entries")).toBe(4)
  })

  it("keeps each client's standing project separate", async () => {
    const otherClient = createClient("Other Ltd")
    const a = await logTime({ id: ticketId, minutes: 20 })
    const b = await logTime({ id: createTicket(otherClient), minutes: 20 })
    expect(a.json.project_id).not.toBe(b.json.project_id)
    expect(standing(clientId)).toBe(1)
    expect(standing(otherClient)).toBe(1)
  })

  it("does not reuse a deleted standing project or an ordinary project of the client", async () => {
    sql(`INSERT INTO projects (client_id, name) VALUES (${clientId}, 'Website rebuild')`)
    sql(`INSERT INTO projects (client_id, name, kind, deleted_at) VALUES (${clientId}, 'IT support', 'it_support', NOW())`)
    const r = await logTime({ id: ticketId, minutes: 20 })
    expect(r.json.project_created).toBe(true)
    expect(one(`SELECT kind FROM projects WHERE id = ${r.json.project_id}`)).toBe("it_support")
    expect(one(`SELECT deleted_at FROM projects WHERE id = ${r.json.project_id}`)).toBe("NULL")
  })

  it("applies the time.php rules: minutes above zero, description cut to 300, billable off and today by default", async () => {
    for (const minutes of [0, -5, "abc", undefined]) {
      const bad = await logTime({ id: ticketId, minutes })
      expect(bad.status).toBe(400)
      expect(bad.json.error).toBe("Logged time must be more than zero.")
    }
    expect(count("time_entries")).toBe(0)
    expect(count("projects")).toBe(0) // a refused log creates no project either

    // "Today" is PHP's date, not the database's (their zones can differ), read
    // either side of the request so a run across midnight still passes.
    const before = phpToday()
    const r = await logTime({ id: ticketId, minutes: "25", description: "x".repeat(400) })
    const after = phpToday()
    expect(r.status).toBe(201)
    const [row] = sql(`SELECT minutes, CHAR_LENGTH(description), billable, entry_date FROM time_entries WHERE id = ${r.json.id}`)
    expect(row.slice(0, 3)).toEqual(["25", "300", "0"])
    expect([before, after]).toContain(row[3])

    const empty = await logTime({ id: ticketId, minutes: 5, description: "   " })
    expect(one(`SELECT IFNULL(description, 'NULL') FROM time_entries WHERE id = ${empty.json.id}`)).toBe("NULL")
  })

  it("needs a real, live ticket", async () => {
    expect((await logTime({ minutes: 10 })).status).toBe(400)
    expect((await logTime({ id: 999999, minutes: 10 })).status).toBe(404)
    sql(`UPDATE tickets SET deleted_at = NOW() WHERE id = ${ticketId}`)
    expect((await logTime({ id: ticketId, minutes: 10 })).status).toBe(404)
    expect(count("time_entries")).toBe(0)
  })

  it("refuses a ticket whose client has been removed, like a missing ticket", async () => {
    sql(`UPDATE clients SET deleted_at = NOW() WHERE id = ${clientId}`)
    const r = await logTime({ id: ticketId, minutes: 30 })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe("Ticket not found.")
    expect(count("projects")).toBe(0)
    expect(count("time_entries")).toBe(0)
  })

  it("writes its audit rows inside the transaction: a failed audit leaves no entry, project or audit row", async () => {
    // Only the last write fails, after the project, the entry and the
    // project_create audit row are already in the transaction.
    // A compound trigger body holds semicolons, so the mysql client needs another delimiter.
    sql(
      `DELIMITER //\nCREATE TRIGGER gk_test_fail_time_audit BEFORE INSERT ON audit_log FOR EACH ROW ` +
        `BEGIN IF NEW.action = 'ticket_time_log' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'synthetic failure'; END IF; END//\nDELIMITER ;`,
    )
    try {
      const r = await logTime({ id: ticketId, minutes: 30 })
      expect(r.status).toBe(500)
      expect(r.json.error).toBe("Could not log the time.")
    } finally {
      sql(`DROP TRIGGER IF EXISTS gk_test_fail_time_audit`)
    }
    expect(count("projects")).toBe(0)
    expect(count("time_entries")).toBe(0)
    expect(auditCount("project_create")).toBe(0)
    expect(auditCount("ticket_time_log")).toBe(0)
    // Nothing was half saved, so the next log starts cleanly.
    const retry = await logTime({ id: ticketId, minutes: 30 })
    expect(retry.status).toBe(201)
    expect(retry.json.project_created).toBe(true)
  })

  it("refuses a ticket with no client, in plain words, and creates nothing", async () => {
    const orphan = createTicket(null, "Internal: rotate backups")
    const r = await logTime({ id: orphan, minutes: 30 })
    expect(r.status).toBe(400)
    expect(r.json.error).toBe("This ticket has no client, so the time has nobody to bill. Link it to a client first.")
    expect(count("projects")).toBe(0)
    expect(count("time_entries")).toBe(0)
  })

  it("is for support staff only: client, trainer and signed-out callers are refused", async () => {
    createUser({ email: "client@example.test", role: "client", clientId })
    const client = await login("client@example.test")
    const asClient = await logTime({ id: ticketId, minutes: 10 }, client) // even on the client's own ticket
    expect(asClient.status).toBe(403)

    createUser({ email: "trainer@example.test", role: "trainer" })
    const trainer = await login("trainer@example.test")
    expect((await logTime({ id: ticketId, minutes: 10 }, trainer)).status).toBe(403)

    const anon = await api("support.php?action=log_time", { body: { id: ticketId, minutes: 10 } })
    expect(anon.status).toBe(401)
    expect(count("time_entries")).toBe(0)
    expect(count("projects")).toBe(0)

    const employeeId = createUser({ email: "employee@example.test", role: "employee" })
    const employee = await login("employee@example.test")
    const ok = await logTime({ id: ticketId, minutes: 10 }, employee)
    expect(ok.status).toBe(201)
    expect(one(`SELECT user_id FROM time_entries WHERE id = ${ok.json.id}`)).toBe(String(employeeId))
  })
})

describe("reading ticket time", () => {
  it("returns the ticket's logged time and total to staff, without deleted entries or other tickets' time", async () => {
    await logTime({ id: ticketId, minutes: 30, description: "Remote session", billable: true, entry_date: "2026-10-02" })
    const second = await logTime({ id: ticketId, minutes: 15, entry_date: "2026-10-03" })
    const gone = await logTime({ id: ticketId, minutes: 999 })
    sql(`UPDATE time_entries SET deleted_at = NOW() WHERE id = ${gone.json.id}`)
    const refused = await logTime({ id: ticketId, minutes: 100, entry_date: "2026-10-01" })
    sql(`UPDATE time_entries SET status = 'rejected' WHERE id = ${refused.json.id}`)
    await logTime({ id: createTicket(clientId, "Another"), minutes: 60 })

    const r = await api<{ time: TimeBlock }>(`support.php?id=${ticketId}`, { token: owner })
    expect(r.status).toBe(200)
    expect(r.json.time.total_minutes).toBe(45) // rejected time is listed but not counted
    expect(r.json.time.entries).toHaveLength(3)
    expect(r.json.time.entries[0]).toMatchObject({ id: second.json.id, minutes: 15, billable: false, status: "draft", user_name: "owner" })
    expect(r.json.time.entries[1]).toMatchObject({ minutes: 30, description: "Remote session", billable: true, entry_date: "2026-10-02" })
    expect(r.json.time.entries[2]).toMatchObject({ id: refused.json.id, status: "rejected" })
  })

  it("lists ticket_id in time.php for ticket time and null for ordinary time", async () => {
    const t = await logTime({ id: ticketId, minutes: 30 })
    sql(`INSERT INTO projects (client_id, name) VALUES (${clientId}, 'Website rebuild')`)
    const ordinary = await api<{ id: number }>("time.php?action=create", {
      body: { project_id: Number(one("SELECT MAX(id) FROM projects")), minutes: 20 },
      token: owner,
    })
    expect(ordinary.status).toBe(201)

    const list = await api<Row[]>("time.php", { token: owner })
    expect(list.json.find((e) => e.id === t.json.id)).toMatchObject({ ticket_id: ticketId, project_name: "IT support" })
    expect(list.json.find((e) => e.id === ordinary.json.id)).toMatchObject({ ticket_id: null })
  })

  it("keeps the time when its ticket is removed, and clears the link", async () => {
    const t = await logTime({ id: ticketId, minutes: 30 })
    sql(`DELETE FROM tickets WHERE id = ${ticketId}`)
    expect(one(`SELECT IFNULL(ticket_id, 'NULL') FROM time_entries WHERE id = ${t.json.id}`)).toBe("NULL")
  })

  it("never shows a client time, and the portal lists the standing project as IT support with no tasks", async () => {
    const t = await logTime({ id: ticketId, minutes: 30, description: "Internal note about the fix" })
    const pid = t.json.project_id!
    // Even if someone renames it or adds tasks, a client sees only the label.
    sql(`UPDATE projects SET name = 'Helpdesk internal bucket' WHERE id = ${pid}`)
    sql(`INSERT INTO tasks (project_id, title, status) VALUES (${pid}, 'Secret internal task', 'done'), (${pid}, 'Another', 'todo')`)
    sql(`INSERT INTO projects (client_id, name) VALUES (${clientId}, 'Website rebuild')`)
    const site = Number(one("SELECT MAX(id) FROM projects"))
    sql(`INSERT INTO tasks (project_id, title, status) VALUES (${site}, 'Homepage', 'done'), (${site}, 'Contact', 'todo')`)

    createUser({ email: "client@example.test", role: "client", clientId })
    const client = await login("client@example.test")

    const own = await api<Row>(`support.php?id=${ticketId}`, { token: client })
    expect(own.status).toBe(200)
    expect(own.json).not.toHaveProperty("time")
    const list = await api<Row[]>("support.php", { token: client })
    expect(JSON.stringify(list.json)).not.toMatch(/minutes|Internal note/)
    expect((await api("time.php", { token: client })).status).toBe(403)

    const portal = await api<{ projects: Row[] }>("portal.php", { token: client })
    expect(portal.status).toBe(200)
    expect(JSON.stringify(portal.json)).not.toMatch(/Helpdesk internal bucket|Secret internal task|Internal note|minutes/)
    expect(portal.json.projects.find((p) => p.id === pid)).toEqual({
      id: pid, name: "IT support", status: "in_progress", due_date: null, kind: "it_support", task_count: 0, done_count: 0,
    })
    expect(portal.json.projects.find((p) => p.id === site)).toMatchObject({ name: "Website rebuild", kind: null, task_count: 2, done_count: 1 })

    // An update request about the standing project names it "IT support" too.
    const req = await api<{ id: number; subject: string }>("support.php?action=update_request", {
      body: { question: "Is the printer fixed?", project_id: pid },
      token: client,
    })
    expect(req.status).toBe(201)
    expect(req.json.subject).toBe("Update request: IT support")
    const [[subject, body]] = sql(`SELECT subject, body FROM tickets WHERE id = ${req.json.id}`)
    expect(subject).toBe("Update request: IT support")
    expect(body).toContain(`Project: IT support (#${pid})`)
    expect(body).not.toContain("Helpdesk internal bucket")
  })
})

describe("before SQL 17 has run", () => {
  // The ALTERs recorded at the foot of server/schema.sql, uncommented.
  const migrate = fs.readFileSync(path.resolve(__dirname, "../../server/schema.sql"), "utf8")
    .match(/-- 2026-10-19 · SQL 17 ·[\s\S]*?(-- {3}ALTER TABLE time_entries\n[\s\S]*?ADD COLUMN kind[^;]*;)/)![1]
    .replace(/^-- {3}/gm, "")

  it("answers 503 for log_time and keeps tickets, time and the portal working", async () => {
    sql("INSERT INTO projects (client_id, name) VALUES (" + clientId + ", 'Website rebuild')")
    const projectId = Number(one("SELECT MAX(id) FROM projects"))
    sql("ALTER TABLE time_entries DROP FOREIGN KEY fk_time_ticket")
    sql("ALTER TABLE time_entries DROP KEY idx_time_ticket, DROP COLUMN ticket_id")
    sql("ALTER TABLE projects DROP COLUMN kind")
    try {
      const r = await logTime({ id: ticketId, minutes: 30 })
      expect(r.status).toBe(503)
      expect(r.json.error).toMatch(/SQL 17/)
      expect(count("projects")).toBe(1)

      const detail = await api<Row>(`support.php?id=${ticketId}`, { token: owner })
      expect(detail.status).toBe(200)
      expect(detail.json.time).toBeNull()

      const created = await api<{ id: number }>("time.php?action=create", { body: { project_id: projectId, minutes: 20 }, token: owner })
      expect(created.status).toBe(201)
      const list = await api<Row[]>("time.php", { token: owner })
      expect(list.status).toBe(200)
      expect(list.json[0]).toMatchObject({ id: created.json.id, ticket_id: null })

      const portal = await api<{ projects: Row[] }>(`portal.php?client_id=${clientId}`, { token: owner })
      expect(portal.status).toBe(200)
      expect(portal.json.projects[0]).toMatchObject({ id: projectId, name: "Website rebuild", kind: null })
    } finally {
      sql(migrate)
    }
  })
})
