/**
 * Today attention list (server/today.php). One staff read with six sections:
 * new enquiries, follow-ups due, calls, overdue tasks, waiting client material
 * and unpaid invoices. Each section is computed on the database clock, lists
 * at most 20 items oldest or most urgent first, and is marked `unavailable`
 * (never an empty zero) when its own table or column is missing. A role that
 * cannot read a section's source endpoint gets no key for that section.
 *
 * Every row is synthetic and every date is relative to the database clock, so
 * the boundaries hold whatever day the suite runs.
 */
import fs from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createUser, login, one, q, resetDb, sql } from "./helpers"

type Item = { type: string; id: number; title: string; reason: string; at: string | null; route: string }
type Section = { status: "ok" | "unavailable"; count: number | null; items: Item[] }
type Today = { generated_at: string; sections: Record<string, Section>; error?: string }

const ALL = ["new_enquiries", "follow_ups_due", "calls", "overdue_tasks", "waiting_material", "unpaid_invoices"]

function today(token: string) {
  return api<Today>("today.php", { token })
}

function lastId(table: string): number {
  return Number(one(`SELECT MAX(id) FROM ${table}`))
}

/** An enquiry. `cols` maps further columns to raw SQL values, test data only. */
function enquiry(name: string, cols: Record<string, string> = {}): number {
  const keys = ["name", "email", "message", ...Object.keys(cols)]
  const vals = [q(name), q(`${name.toLowerCase().replace(/\W/g, "")}@example.test`), q("Synthetic enquiry"), ...Object.values(cols)]
  sql(`INSERT INTO enquiries (${keys.join(", ")}) VALUES (${vals.join(", ")})`)
  return lastId("enquiries")
}

function project(name: string, clientId: number | null = null, deleted = false): number {
  sql(`INSERT INTO projects (client_id, name, status, deleted_at) VALUES (${q(clientId)}, ${q(name)}, 'in_progress', ${deleted ? "NOW()" : "NULL"})`)
  return lastId("projects")
}

function task(projectId: number, title: string, due: string, status = "todo"): number {
  sql(`INSERT INTO tasks (project_id, title, status, due_date) VALUES (${projectId}, ${q(title)}, ${q(status)}, ${due})`)
  return lastId("tasks")
}

function asset(projectId: number, label: string, status: string, updatedAt: string, suppliedAt = "NULL"): number {
  sql(
    `INSERT INTO project_assets (project_id, label, status, supplied_at, created_at, updated_at)
     VALUES (${projectId}, ${q(label)}, ${q(status)}, ${suppliedAt}, ${updatedAt}, ${updatedAt})`,
  )
  return lastId("project_assets")
}

function booking(status: string, startsAt: string, link: { clientId?: number; enquiryId?: number } = {}, deleted = false): number {
  sql(
    `INSERT INTO bookings (enquiry_id, client_id, starts_at, timezone, status, deleted_at)
     VALUES (${q(link.enquiryId ?? null)}, ${q(link.clientId ?? null)}, ${startsAt}, 'Europe/London', ${q(status)}, ${deleted ? "NOW()" : "NULL"})`,
  )
  return lastId("bookings")
}

function invoice(clientId: number, status: string, due: string, number: string): number {
  sql(`INSERT INTO invoices (number, client_id, status, issued_at, due_at) VALUES (${q(number)}, ${clientId}, ${q(status)}, CURRENT_DATE - INTERVAL 40 DAY, ${due})`)
  return lastId("invoices")
}

const ids = (s: Section) => s.items.map((i) => i.id)

describe("today.php attention list", () => {
  let owner: string

  beforeEach(async () => {
    resetDb()
    createUser({ email: "owner@example.test", role: "super_admin" })
    owner = await login("owner@example.test")
  })

  it("lists only new, unreplied enquiries, oldest first", async () => {
    const newer = enquiry("Newer Person", { company: q("Newer Ltd"), created_at: "NOW() - INTERVAL 1 HOUR" })
    const older = enquiry("Older Person", { created_at: "NOW() - INTERVAL 2 DAY" })
    enquiry("Replied Person", { status: q("contacted") })
    enquiry("Won Person", { status: q("won") })
    enquiry("Deleted Person", { deleted_at: "NOW()" })

    const r = await today(owner)
    expect(r.status).toBe(200)
    const s = r.json.sections.new_enquiries
    expect(s).toMatchObject({ status: "ok", count: 2 })
    expect(ids(s)).toEqual([older, newer])
    expect(s.items[1]).toMatchObject({ type: "enquiry", title: "Newer Person, Newer Ltd", route: `/app/leads?enquiry=${newer}` })
    expect(s.items[1].reason).toMatch(/not replied/)
    expect(s.items[1].at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
  })

  it("lists open follow-ups due today or earlier, never tomorrow or a closed enquiry", async () => {
    const dueToday = enquiry("Today Person", { status: q("contacted"), next_action_at: "CURRENT_DATE", next_action_note: q("Send the quote") })
    const lateHigh = enquiry("Late High", { status: q("proposal"), next_action_at: "CURRENT_DATE - INTERVAL 3 DAY", priority: "3" })
    const lateLow = enquiry("Late Low", { status: q("proposal"), next_action_at: "CURRENT_DATE - INTERVAL 3 DAY", priority: "1" })
    enquiry("Tomorrow Person", { status: q("contacted"), next_action_at: "CURRENT_DATE + INTERVAL 1 DAY" })
    enquiry("Won Person", { status: q("won"), next_action_at: "CURRENT_DATE - INTERVAL 1 DAY" })
    enquiry("Lost Person", { status: q("lost"), next_action_at: "CURRENT_DATE - INTERVAL 1 DAY" })
    enquiry("No Date", { status: q("contacted") })

    const s = (await today(owner)).json.sections.follow_ups_due
    expect(s).toMatchObject({ status: "ok", count: 3 })
    expect(ids(s)).toEqual([lateHigh, lateLow, dueToday])
    const todayItem = s.items[2]
    expect(todayItem.reason).toBe("Follow-up due today: Send the quote")
    expect(todayItem.route).toBe(`/app/leads?due=1&enquiry=${dueToday}`)
    expect(todayItem.at).toBe(one("SELECT DATE_FORMAT(CURRENT_DATE, '%Y-%m-%d')"))
    expect(s.items[0].reason).toBe("Follow-up overdue")
  })

  it("lists every requested call and confirmed calls in the next 7 days, earliest first", async () => {
    const client = createClient("Call Client Ltd")
    const lead = enquiry("Call Lead", { company: q("Lead Co") })
    const requestedPast = booking("requested", "UTC_TIMESTAMP() - INTERVAL 1 DAY", { clientId: client })
    const soon = booking("confirmed", "UTC_TIMESTAMP() + INTERVAL 1 HOUR", { enquiryId: lead })
    const edge = booking("confirmed", "UTC_TIMESTAMP() + INTERVAL 7 DAY - INTERVAL 10 MINUTE")
    booking("confirmed", "UTC_TIMESTAMP() + INTERVAL 7 DAY + INTERVAL 10 MINUTE") // beyond the week
    booking("confirmed", "UTC_TIMESTAMP() - INTERVAL 1 HOUR") // already started
    booking("completed", "UTC_TIMESTAMP() + INTERVAL 1 DAY")
    booking("cancelled", "UTC_TIMESTAMP() + INTERVAL 1 DAY")
    booking("requested", "UTC_TIMESTAMP() + INTERVAL 1 DAY", {}, true) // deleted
    // As bookings.php lists them: a call whose enquiry or client was deleted
    // still shows, without the deleted party's name.
    const goneLead = enquiry("Gone Lead", { company: q("Gone Lead Co"), deleted_at: "NOW()" })
    const goneClient = createClient("Gone Client Ltd")
    sql(`UPDATE clients SET deleted_at = NOW() WHERE id = ${goneClient}`)
    const onGoneLead = booking("confirmed", "UTC_TIMESTAMP() + INTERVAL 2 DAY", { enquiryId: goneLead })
    const onGoneClient = booking("requested", "UTC_TIMESTAMP() + INTERVAL 3 DAY", { clientId: goneClient })

    const r = await today(owner)
    const s = r.json.sections.calls
    expect(s).toMatchObject({ status: "ok", count: 5 })
    expect(ids(s)).toEqual([requestedPast, soon, onGoneLead, onGoneClient, edge])
    expect(s.items[2].title).toBe("Call")
    expect(s.items[3].title).toBe("Call")
    expect(JSON.stringify(r.json)).not.toMatch(/Gone (Lead|Client)/)
    expect(s.items[0]).toMatchObject({ type: "booking", title: "Call Client Ltd", route: `/app/leads?view=calls&call=${requestedPast}` })
    expect(s.items[0].reason).toMatch(/requested/)
    expect(s.items[1]).toMatchObject({ title: "Call Lead, Lead Co", reason: "Confirmed call" })
    expect(s.items[4].title).toBe("Call")
    // starts_at is stored in UTC; it comes back as an ISO time marked Z.
    expect(s.items[1].at).toBe(one(`SELECT DATE_FORMAT(starts_at, '%Y-%m-%dT%H:%i:%sZ') FROM bookings WHERE id = ${soon}`))
  })

  it("lists tasks past due and not done, never due today, done, deleted or on a deleted project", async () => {
    const live = project("Live build")
    const gone = project("Deleted build", null, true)
    const late = task(live, "Write the copy", "CURRENT_DATE - INTERVAL 5 DAY", "doing")
    const lateReview = task(live, "Check the forms", "CURRENT_DATE - INTERVAL 1 DAY", "review")
    task(live, "Due today", "CURRENT_DATE")
    task(live, "Finished late", "CURRENT_DATE - INTERVAL 2 DAY", "done")
    task(live, "No date", "NULL")
    task(gone, "Orphan", "CURRENT_DATE - INTERVAL 2 DAY")
    const removed = task(live, "Removed task", "CURRENT_DATE - INTERVAL 3 DAY")
    sql(`UPDATE tasks SET deleted_at = NOW() WHERE id = ${removed}`)

    const s = (await today(owner)).json.sections.overdue_tasks
    expect(s).toMatchObject({ status: "ok", count: 2 })
    expect(ids(s)).toEqual([late, lateReview])
    expect(s.items[0]).toMatchObject({ type: "task", title: "Write the copy", reason: "Overdue task on Live build", route: `/app/projects?project=${live}&task=${late}` })
    expect(s.items[0].at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("lists material requested over 3 days ago and material supplied but not accepted", async () => {
    const live = project("Asset build")
    const gone = project("Gone build", null, true)
    const stale = asset(live, "Logo", "requested", "NOW() - INTERVAL 3 DAY - INTERVAL 1 HOUR")
    asset(live, "Photos", "requested", "NOW() - INTERVAL 3 DAY + INTERVAL 1 HOUR") // not yet 3 days
    const supplied = asset(live, "Copy", "supplied", "NOW() - INTERVAL 1 HOUR", "NOW() - INTERVAL 1 HOUR")
    asset(live, "Brand guide", "accepted", "NOW() - INTERVAL 9 DAY")
    asset(gone, "Orphan logo", "requested", "NOW() - INTERVAL 9 DAY")
    const removed = asset(live, "Removed logo", "requested", "NOW() - INTERVAL 9 DAY")
    sql(`UPDATE project_assets SET deleted_at = NOW(), updated_at = updated_at WHERE id = ${removed}`)

    const s = (await today(owner)).json.sections.waiting_material
    expect(s).toMatchObject({ status: "ok", count: 2 })
    expect(ids(s)).toEqual([stale, supplied])
    expect(s.items[0]).toMatchObject({ type: "asset", title: "Logo", route: `/app/projects?project=${live}&asset=${stale}` })
    expect(s.items[0].reason).toMatch(/^Requested from the client over 3 days ago, on Asset build$/)
    expect(s.items[1].reason).toMatch(/^Supplied by the client, waiting for you to accept/)
  })

  it("lists sent invoices past due, never due today, paid, draft, undated or deleted", async () => {
    const client = createClient("Owes Ltd")
    const oldest = invoice(client, "sent", "CURRENT_DATE - INTERVAL 20 DAY", "GK-INV-0001")
    const recent = invoice(client, "sent", "CURRENT_DATE - INTERVAL 1 DAY", "GK-INV-0002")
    invoice(client, "sent", "CURRENT_DATE", "GK-INV-0003")
    invoice(client, "paid", "CURRENT_DATE - INTERVAL 10 DAY", "GK-INV-0004")
    invoice(client, "draft", "CURRENT_DATE - INTERVAL 10 DAY", "GK-INV-0005")
    invoice(client, "sent", "NULL", "GK-INV-0006")
    const removed = invoice(client, "sent", "CURRENT_DATE - INTERVAL 30 DAY", "GK-INV-0007")
    sql(`UPDATE invoices SET deleted_at = NOW() WHERE id = ${removed}`)

    const s = (await today(owner)).json.sections.unpaid_invoices
    expect(s).toMatchObject({ status: "ok", count: 2 })
    expect(ids(s)).toEqual([oldest, recent])
    expect(s.items[0]).toMatchObject({ type: "invoice", title: "GK-INV-0001, Owes Ltd", route: `/app/invoicing?invoice=${oldest}` })
  })

  it("caps each section at 20 items but counts them all, and stamps generated_at in UTC", async () => {
    for (let i = 0; i < 23; i++) enquiry(`Bulk ${i}`, { created_at: `NOW() - INTERVAL ${30 - i} MINUTE` })
    const r = await today(owner)
    const s = r.json.sections.new_enquiries
    expect(s.count).toBe(23)
    expect(s.items).toHaveLength(20)
    expect(s.items[0].title).toBe("Bulk 0")
    // An empty source is ok with a real zero.
    expect(r.json.sections.unpaid_invoices).toEqual({ status: "ok", count: 0, items: [] })
    expect(r.json.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    expect(Math.abs(Date.parse(r.json.generated_at) - Date.now())).toBeLessThan(5 * 60_000)
  })

  it("omits the sections a role cannot read, and refuses non-staff", async () => {
    createUser({ email: "editor@example.test", role: "editor" })
    createUser({ email: "employee@example.test", role: "employee" })
    createUser({ email: "manager@example.test", role: "manager" })
    createUser({ email: "trainer@example.test", role: "trainer" })
    const c = createClient("Portal Client Ltd")
    createUser({ email: "client@example.test", role: "client", clientId: c })
    invoice(c, "sent", "CURRENT_DATE - INTERVAL 3 DAY", "GK-INV-0100")

    expect(Object.keys((await today(owner)).json.sections)).toEqual(ALL)
    expect(Object.keys((await today(await login("manager@example.test"))).json.sections)).toEqual(ALL)

    const editor = await today(await login("editor@example.test"))
    expect(editor.status).toBe(200)
    expect(Object.keys(editor.json.sections)).toEqual(ALL.filter((k) => k !== "unpaid_invoices"))
    expect(JSON.stringify(editor.json)).not.toContain("GK-INV-0100")

    const employee = await today(await login("employee@example.test"))
    expect(Object.keys(employee.json.sections)).toEqual(["overdue_tasks", "waiting_material"])

    expect((await today(await login("trainer@example.test"))).status).toBe(403)
    const client = await today(await login("client@example.test"))
    expect(client.status).toBe(403)
    expect(JSON.stringify(client.json)).not.toContain("GK-INV-0100")
    expect((await api("today.php")).status).toBe(401)
    expect((await api("today.php", { token: owner, body: {} })).status).toBe(405)
  })
})

describe("today.php when a source is missing", () => {
  const schema = fs.readFileSync(path.resolve(__dirname, "../../server/schema.sql"), "utf8")
  const assetsTable = schema.match(/CREATE TABLE IF NOT EXISTS project_assets \([\s\S]*?\) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;/)![0]
  // The 2026-10-10 follow-up ALTER recorded at the foot of schema.sql, uncommented.
  const followUps = schema
    .match(/-- {3}ALTER TABLE enquiries\n[\s\S]*?ADD COLUMN priority[^;]*;/)![0]
    .replace(/^--\s{3}/gm, "")

  let owner: string
  beforeEach(async () => {
    resetDb()
    createUser({ email: "owner@example.test", role: "super_admin" })
    owner = await login("owner@example.test")
  })

  it("marks only the section whose table is gone unavailable, with no count", async () => {
    const p = project("Assets build")
    asset(p, "Logo", "supplied", "NOW()", "NOW()")
    task(p, "Late task", "CURRENT_DATE - INTERVAL 1 DAY")
    // Only ever the local *_test database (tests/server/env.ts refuses anything else).
    sql("DROP TABLE project_assets")
    try {
      const r = await today(owner)
      expect(r.status).toBe(200)
      expect(r.json.sections.waiting_material).toEqual({ status: "unavailable", count: null, items: [] })
      expect(r.json.sections.overdue_tasks).toMatchObject({ status: "ok", count: 1 })
      for (const k of ALL.filter((x) => x !== "waiting_material")) expect(r.json.sections[k].status).toBe("ok")
    } finally {
      sql(assetsTable)
    }
  })

  it("marks follow-ups unavailable before the 2026-10-10 columns exist, and still lists new enquiries", async () => {
    enquiry("Still New")
    sql("ALTER TABLE enquiries DROP COLUMN next_action_at, DROP COLUMN next_action_note, DROP COLUMN priority")
    try {
      const r = await today(owner)
      expect(r.status).toBe(200)
      expect(r.json.sections.follow_ups_due).toEqual({ status: "unavailable", count: null, items: [] })
      expect(r.json.sections.new_enquiries).toMatchObject({ status: "ok", count: 1 })
    } finally {
      sql(followUps)
    }
  })
})
