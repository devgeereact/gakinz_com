/**
 * Private delivery feedback (docs/PRODUCT-SPEC.md section 6.3) and the client
 * timeline (section 5.5, Clients). Feedback is never returned to any client,
 * not even its author; a client's submission is bound to the client in its
 * token; publication permission is a separate opt-in that defaults to no.
 */
import fs from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createUser, login, one, q, resetDb, sql } from "./helpers"

type Feedback = {
  id: number
  client_id: number
  project_id: number | null
  source: string
  rating: number | null
  went_well: string | null
  could_improve: string | null
  follow_up_ok: boolean
  may_publish: boolean
  attribution: string | null
  follow_up: string
  owner_note: string | null
}

function createProject(clientId: number, name: string): number {
  sql(`INSERT INTO projects (client_id, name) VALUES (${clientId}, ${q(name)})`)
  return Number(one(`SELECT MAX(id) FROM projects`))
}

describe("feedback.php", () => {
  let clientA: number
  let clientB: number
  let projectA: number
  let projectB: number
  let tokenA: string
  let tokenB: string
  let owner: string

  beforeEach(async () => {
    resetDb()
    clientA = createClient("Synthetic A Ltd")
    clientB = createClient("Synthetic B Ltd")
    projectA = createProject(clientA, "A website")
    projectB = createProject(clientB, "B secret project")
    createUser({ email: "owner@example.test", role: "super_admin" })
    createUser({ email: "a@example.test", role: "client", clientId: clientA })
    createUser({ email: "b@example.test", role: "client", clientId: clientB })
    owner = await login("owner@example.test")
    tokenA = await login("a@example.test")
    tokenB = await login("b@example.test")
  })

  const send = (token: string, body: Record<string, unknown>) => api<Record<string, unknown>>("feedback.php?action=create", { token, body })

  it("lets a client send private feedback and tells them only that it arrived", async () => {
    const r = await send(tokenA, { project_id: projectA, rating: 5, went_well: "Clear updates", could_improve: "Faster invoices", follow_up_ok: true })
    expect(r.status).toBe(201)
    expect(r.json).toEqual({ ok: true })
    const row = sql(`SELECT client_id, project_id, source, rating, may_publish, follow_up FROM client_feedback`)[0]
    expect(row).toEqual([String(clientA), String(projectA), "portal", "5", "0", "new"])
    expect(one(`SELECT COUNT(*) FROM audit_log WHERE action = 'feedback_create'`)).toBe("1")
  })

  it("never shows feedback to a client, not even their own", async () => {
    await send(tokenA, { rating: 4, went_well: "A's private words" })
    for (const path of ["feedback.php", `feedback.php?client_id=${clientA}`, `feedback.php?client_id=${clientB}`]) {
      const r = await api(path, { token: tokenA })
      expect(r.status).toBe(403)
      expect(JSON.stringify(r.json)).not.toContain("private words")
    }
    // Nor does the portal carry it.
    const portal = await api(`portal.php`, { token: tokenA })
    expect(portal.status).toBe(200)
    expect(JSON.stringify(portal.json)).not.toContain("private words")
    // And a client cannot change the owner's fields.
    const id = Number(one(`SELECT id FROM client_feedback`))
    expect((await api("feedback.php?action=update", { token: tokenA, body: { id, follow_up: "closed" } })).status).toBe(403)
  })

  it("binds a client's feedback to the client in the token, ignoring a client_id sent", async () => {
    const r = await send(tokenA, { client_id: clientB, went_well: "Spoofed?" })
    expect(r.status).toBe(201)
    expect(one(`SELECT client_id FROM client_feedback`)).toBe(String(clientA))
  })

  it("answers 404 for another client's project, exactly as for a missing one", async () => {
    const other = await send(tokenA, { project_id: projectB, went_well: "x" })
    const missing = await send(tokenA, { project_id: 99999, went_well: "x" })
    expect(other.status).toBe(404)
    expect(missing.status).toBe(404)
    expect(other.json).toEqual(missing.json)
    expect(one(`SELECT COUNT(*) FROM client_feedback`)).toBe("0")
  })

  it("keeps publication permission separate and off by default", async () => {
    const testimonialsBefore = one(`SELECT COUNT(*) FROM testimonials`)
    await send(tokenA, { went_well: "No permission given", attribution: "Should be dropped" })
    await send(tokenB, { went_well: "Quote me", may_publish: true, attribution: "Bea, B Ltd" })
    const rows = sql(`SELECT went_well, may_publish, IFNULL(attribution, 'NULL') FROM client_feedback ORDER BY id`)
    expect(rows).toEqual([
      ["No permission given", "0", "NULL"],
      ["Quote me", "1", "Bea, B Ltd"],
    ])
    // Feedback never becomes a testimonial by itself.
    expect(one(`SELECT COUNT(*) FROM testimonials`)).toBe(testimonialsBefore)
  })

  it("validates the rating, needs some content and refuses non-boolean choices", async () => {
    expect((await send(tokenA, {})).status).toBe(400)
    expect((await send(tokenA, { rating: 6 })).status).toBe(400)
    expect((await send(tokenA, { rating: 0 })).status).toBe(400)
    expect((await send(tokenA, { went_well: "x", may_publish: "yes" })).status).toBe(400)
    expect((await send(tokenA, { rating: 3 })).status).toBe(201)
  })

  it("does not duplicate a retried submission", async () => {
    const body = { project_id: projectA, rating: 4, went_well: "Same words" }
    const [x, y] = [await send(tokenA, body), await send(tokenA, body)]
    expect(x.status).toBe(201)
    expect(y.status).toBe(200)
    expect(y.json).toEqual({ ok: true, duplicate: true })
    expect(one(`SELECT COUNT(*) FROM client_feedback`)).toBe("1")
  })

  it("lets staff list one client's feedback and manage follow-up and permission", async () => {
    await send(tokenA, { rating: 2, could_improve: "Slow replies", follow_up_ok: true, may_publish: true, attribution: "Al" })
    await send(tokenB, { rating: 5, went_well: "B only" })
    const list = await api<Feedback[]>(`feedback.php?client_id=${clientA}`, { token: owner })
    expect(list.status).toBe(200)
    expect(list.json).toHaveLength(1)
    expect(list.json[0]).toMatchObject({ client_id: clientA, rating: 2, follow_up_ok: true, may_publish: true, source: "portal", follow_up: "new" })
    expect(JSON.stringify(list.json)).not.toContain("B only")

    const id = list.json[0].id
    const upd = await api<Feedback>("feedback.php?action=update", {
      token: owner,
      body: { id, follow_up: "following_up", owner_note: "Call on Friday", may_publish: false },
    })
    expect(upd.status).toBe(200)
    expect(upd.json).toMatchObject({ follow_up: "following_up", owner_note: "Call on Friday", may_publish: false, attribution: null })
    expect(one(`SELECT detail FROM audit_log WHERE action = 'feedback_update'`)).toContain("permission withdrawn")
    expect((await api("feedback.php?action=update", { token: owner, body: { id, follow_up: "done" } })).status).toBe(400)
  })

  it("lets the owner record feedback received another way, for a named client", async () => {
    const r = await api<{ id: number }>("feedback.php?action=create", { token: owner, body: { client_id: clientB, project_id: projectB, went_well: "Said on the phone" } })
    expect(r.status).toBe(201)
    expect(one(`SELECT source FROM client_feedback WHERE id = ${r.json.id}`)).toBe("owner")
    // The project must still belong to that client.
    const wrong = await api("feedback.php?action=create", { token: owner, body: { client_id: clientB, project_id: projectA, went_well: "x" } })
    expect(wrong.status).toBe(404)
    expect((await api("feedback.php?action=create", { token: owner, body: { went_well: "no client" } })).status).toBe(400)
  })

  it("refuses roles outside the client list and staff list", async () => {
    createUser({ email: "emp@example.test", role: "employee" })
    const emp = await login("emp@example.test")
    expect((await api("feedback.php", { token: emp })).status).toBe(403)
    expect((await send(emp, { client_id: clientA, went_well: "x" })).status).toBe(403)
    expect((await api("feedback.php")).status).toBe(401)
  })
})

describe("client timeline (clients.php?id=N)", () => {
  it("brings the enquiry, calls, quotes, projects, invoices, tickets, conversations and feedback together, for one client only", async () => {
    resetDb()
    createUser({ email: "owner@example.test", role: "super_admin" })
    const owner = await login("owner@example.test")
    sql(`INSERT INTO enquiries (name, email, message, project_type, created_at) VALUES ('Tia', 'tia@example.test', 'Hi', 'Website', '2026-01-01 09:00:00')`)
    const lead = Number(one(`SELECT MAX(id) FROM enquiries`))
    const a = createClient("Timeline A")
    const b = createClient("Timeline B")
    sql(`UPDATE clients SET source_lead_id = ${lead} WHERE id = ${a}`)
    sql(`INSERT INTO proposals (client_id, title, status, created_at) VALUES (${a}, 'A quote', 'sent', '2026-01-03 09:00:00'), (${b}, 'B quote', 'sent', '2026-01-03 09:00:00')`)
    sql(`INSERT INTO projects (client_id, name, created_at) VALUES (${a}, 'A build', '2026-01-04 09:00:00')`)
    sql(`INSERT INTO tickets (client_id, subject, status, created_at) VALUES (${a}, 'A question', 'open', '2026-01-05 09:00:00')`)
    sql(`INSERT INTO comm_threads (client_id, subject, status, created_at) VALUES (${a}, 'A kickoff notes', 'open', '2026-01-06 09:00:00')`)
    // A call on the enquiry before conversion, and one booked against the client.
    sql(`INSERT INTO bookings (enquiry_id, starts_at, timezone, duration_min, status) VALUES (${lead}, '2026-01-02 10:00:00', 'Europe/London', 30, 'completed')`)
    sql(`INSERT INTO bookings (client_id, starts_at, timezone, duration_min, status) VALUES (${a}, '2026-07-01 08:30:00', 'Europe/London', 45, 'confirmed')`)
    sql(`INSERT INTO bookings (client_id, starts_at, timezone, duration_min, status) VALUES (${b}, '2026-07-01 08:30:00', 'Europe/London', 45, 'confirmed')`)
    sql(`INSERT INTO client_feedback (client_id, source, rating, went_well, created_at) VALUES (${a}, 'portal', 4, 'Private words', '2026-08-01 09:00:00')`)

    const r = await api<{ timeline: Array<{ type: string; label: string; status: string }>; unavailable: string[] }>(`clients.php?id=${a}`, { token: owner })
    expect(r.status).toBe(200)
    expect(r.json.unavailable).toEqual([])
    expect(r.json.timeline.map((t) => t.type)).toEqual(["feedback", "call", "conversation", "ticket", "project", "proposal", "call", "enquiry"])
    expect(r.json.timeline.find((t) => t.type === "call")?.label).toBe("Call, 45 min, 1 Jul 2026 09:30 Europe/London")
    expect(r.json.timeline[0].label).toBe("Feedback, rated 4 of 5")
    const raw = JSON.stringify(r.json)
    expect(raw).not.toContain("B quote")
    // The timeline names feedback; its words stay in the feedback record.
    expect(raw).not.toContain("Private words")
  })
})

describe("before the 2026-10-16 SQL has run", () => {
  // Recreate exactly what schema.sql declares, so later files see the normal tables.
  const schema = fs.readFileSync(path.resolve(__dirname, "../../server/schema.sql"), "utf8")
  const createOf = (table: string) => {
    const m = schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\([\\s\\S]*?\\) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`))
    if (!m) throw new Error(`No CREATE TABLE for ${table}`)
    return m[0]
  }

  it("answers 503 from both endpoints and leaves calls and feedback out of the timeline", async () => {
    resetDb()
    createUser({ email: "owner@example.test", role: "super_admin" })
    const owner = await login("owner@example.test")
    const a = createClient("Unmigrated Ltd")
    // Only ever the local *_test database (tests/server/env.ts refuses anything else).
    sql(`DROP TABLE booking_events; DROP TABLE bookings; DROP TABLE client_feedback;`)
    try {
      const b = await api<{ error: string }>("bookings.php", { token: owner })
      expect(b.status).toBe(503)
      expect(b.json.error).toMatch(/database update/)
      const c = await api("bookings.php?action=create", { token: owner, body: { client_id: a, start_local: "2026-11-03T14:00", timezone: "Europe/London" } })
      expect(c.status).toBe(503)
      expect((await api("feedback.php", { token: owner })).status).toBe(503)
      const t = await api<{ unavailable: string[] }>(`clients.php?id=${a}`, { token: owner })
      expect(t.status).toBe(200)
      expect(t.json.unavailable).toEqual(["calls", "feedback"])
    } finally {
      sql(`${createOf("bookings")} ${createOf("booking_events")} ${createOf("client_feedback")}`)
    }
  })
})
