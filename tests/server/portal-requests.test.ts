/**
 * Portal requests (docs/PRODUCT-SPEC.md section 6.2): a client asks the owner
 * for an update (a support ticket, support.php?action=update_request) and
 * proposes times for a call (a requested booking, bookings.php?action=request).
 *
 * The property under test above all others is client isolation: the client
 * comes from the token, a project or record of another client answers 404 or
 * stays invisible, and a client_id in the request is ignored. No email is sent
 * by either request (PHP mail() points at /usr/bin/true in the test server
 * anyway).
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createUser, login, one, q, resetDb, sql } from "./helpers"

type CallRequest = {
  id: number
  status: string
  starts_at: string
  start_local: string
  timezone: string
  duration_min: number
  created_at: string
  error?: string
}

function createProject(clientId: number | null, name: string): number {
  sql(`INSERT INTO projects (client_id, name, status) VALUES (${q(clientId)}, ${q(name)}, 'in_progress')`)
  return Number(one(`SELECT MAX(id) FROM projects`))
}

/** YYYY-MM-DD, `days` from today in UTC. */
function day(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
}

const nextYear = new Date().getUTCFullYear() + 1

describe("portal requests", () => {
  let clientA: number
  let clientB: number
  let projectA: number
  let projectB: number
  let tokenA: string
  let tokenB: string
  let tokenOwner: string

  beforeEach(async () => {
    resetDb()
    clientA = createClient("Synthetic A Ltd")
    clientB = createClient("Synthetic B Ltd")
    projectA = createProject(clientA, "A brochure site")
    projectB = createProject(clientB, "B secret relaunch")
    createUser({ email: "owner@example.test", role: "super_admin" })
    createUser({ email: "client-a@example.test", role: "client", clientId: clientA })
    createUser({ email: "client-b@example.test", role: "client", clientId: clientB })
    tokenA = await login("client-a@example.test")
    tokenB = await login("client-b@example.test")
    tokenOwner = await login("owner@example.test")
  })

  const askUpdate = (body: unknown, token = tokenA) =>
    api<{ id?: number; subject?: string; error?: string }>("support.php?action=update_request", { token, body })
  const requestCall = (body: unknown, token = tokenA) => api<CallRequest>("bookings.php?action=request", { token, body })

  describe("request an update", () => {
    it("creates an open ticket for the caller's client, prefixed and naming the project", async () => {
      const r = await askUpdate({ question: "When will the homepage draft be ready?", project_id: projectA })
      expect(r.status).toBe(201)
      expect(r.json.subject).toBe("Update request: A brochure site")
      const row = sql(`SELECT client_id, subject, body, status, priority FROM tickets WHERE id = ${r.json.id}`)[0]
      expect(row).toEqual([
        String(clientA),
        "Update request: A brochure site",
        `Project: A brochure site (#${projectA})\\n\\nWhen will the homepage draft be ready?`,
        "open",
        "normal",
      ])
      expect(one(`SELECT COUNT(*) FROM audit_log WHERE action = 'ticket_update_request'`)).toBe("1")
    })

    it("works without a project, using the question as the subject", async () => {
      const r = await askUpdate({ question: "  Any news\non the logo?  " })
      expect(r.status).toBe(201)
      expect(r.json.subject).toBe("Update request: Any news on the logo?")
      expect(one(`SELECT body FROM tickets WHERE id = ${r.json.id}`)).toBe("Any news\\non the logo?")
    })

    it("answers 404 for a project of another client, and records nothing", async () => {
      const r = await askUpdate({ question: "What is the relaunch date?", project_id: projectB })
      expect(r.status).toBe(404)
      expect(JSON.stringify(r.json)).not.toContain("B secret relaunch")
      // A deleted own project, an unlinked one and a malformed id answer the same way.
      const deleted = createProject(clientA, "A old project")
      sql(`UPDATE projects SET deleted_at = NOW() WHERE id = ${deleted}`)
      const unlinked = createProject(null, "Internal project")
      for (const project_id of [deleted, unlinked, 999999, "abc", -1, String(projectB)]) {
        expect((await askUpdate({ question: "Status?", project_id })).status).toBe(404)
      }
      expect(one(`SELECT COUNT(*) FROM tickets`)).toBe("0")
    })

    it("ignores a client_id in the request", async () => {
      const r = await askUpdate({ question: "Planting a ticket on B?", client_id: clientB })
      expect(r.status).toBe(201)
      expect(one(`SELECT client_id FROM tickets WHERE id = ${r.json.id}`)).toBe(String(clientA))
      const bList = await api<Array<{ subject: string }>>("support.php", { token: tokenB })
      expect(bList.json).toEqual([])
    })

    it("refuses an empty or non-text question", async () => {
      for (const body of [{}, { question: "" }, { question: "   \n " }, { question: ["x"] }, { question: 42 }]) {
        const r = await askUpdate(body)
        expect(r.status).toBe(400)
      }
      expect((await askUpdate({ question: "x".repeat(5001) })).status).toBe(400)
      expect(one(`SELECT COUNT(*) FROM tickets`)).toBe("0")
    })

    it("refuses a double submit of the same question", async () => {
      const body = { question: "Is the copy signed off?", project_id: projectA }
      expect((await askUpdate(body)).status).toBe(201)
      expect((await askUpdate(body)).status).toBe(409)
      expect(one(`SELECT COUNT(*) FROM tickets`)).toBe("1")
    })

    it("is listed to its client, hidden from other clients, and seen by staff in Support", async () => {
      const r = await askUpdate({ question: "How is testing going?", project_id: projectA })
      const mine = await api<Array<{ id: number; subject: string }>>("support.php", { token: tokenA })
      expect(mine.json.map((t) => t.id)).toEqual([r.json.id])
      const theirs = await api("support.php", { token: tokenB })
      expect(JSON.stringify(theirs.json)).not.toContain("Update request")
      expect((await api(`support.php?id=${r.json.id}`, { token: tokenB })).status).toBe(404)
      const staff = await api<Array<{ id: number; subject: string; client_id: number }>>("support.php", { token: tokenOwner })
      expect(staff.json).toContainEqual(expect.objectContaining({ id: r.json.id, subject: "Update request: A brochure site", client_id: clientA }))
    })

    it("is for clients only and needs a sign-in", async () => {
      expect((await api("support.php?action=update_request", { body: { question: "Hi" } })).status).toBe(401)
      expect((await askUpdate({ question: "Hi" }, tokenOwner)).status).toBe(405)
      expect(one(`SELECT COUNT(*) FROM tickets`)).toBe("0")
    })
  })

  describe("request a call", () => {
    it("creates a requested booking for the caller's client, with every proposed time in the owner notes", async () => {
      const r = await requestCall({
        topic: "Plan the next phase",
        timezone: "America/New_York",
        slots: [
          { date: `${nextYear}-01-15`, time: "14:00" },
          { date: `${nextYear}-01-16`, time: "09:30" },
        ],
      })
      expect(r.status).toBe(201)
      expect(r.json.status).toBe("requested")
      // 14:00 in New York in January is 19:00 UTC.
      expect(r.json.starts_at).toBe(`${nextYear}-01-15T19:00:00Z`)
      expect(r.json.start_local).toBe(`${nextYear}-01-15T14:00`)
      expect(r.json.timezone).toBe("America/New_York")
      // Owner-only fields never come back to the client.
      for (const k of ["notes", "location", "outcome", "client_id", "history", "enquiry_id"]) expect(r.json).not.toHaveProperty(k)

      const [cid, eid, status, notes] = sql(`SELECT client_id, enquiry_id, status, notes FROM bookings WHERE id = ${r.json.id}`)[0]
      expect(cid).toBe(String(clientA))
      expect(eid).toBe("NULL")
      expect(status).toBe("requested")
      expect(notes).toContain("Topic: Plan the next phase")
      expect(notes).toContain("Proposed times (America/New_York)")
      const weekday = (d: number) => new Date(Date.UTC(nextYear, 0, d)).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" })
      expect(notes).toContain(`1. ${weekday(15)} 15 January ${nextYear}, 14:00`)
      expect(notes).toContain(`2. ${weekday(16)} 16 January ${nextYear}, 09:30`)
      expect(one(`SELECT COUNT(*) FROM booking_events WHERE booking_id = ${r.json.id} AND kind = 'created' AND to_status = 'requested'`)).toBe("1")
      expect(one(`SELECT COUNT(*) FROM audit_log WHERE action = 'booking_request'`)).toBe("1")
    })

    it("ignores a client_id and an enquiry_id in the request", async () => {
      sql(`INSERT INTO enquiries (name, email, message) VALUES ('Someone', 'someone@example.test', 'Synthetic')`)
      const enquiry = Number(one(`SELECT MAX(id) FROM enquiries`))
      const r = await requestCall({
        topic: "Try to book for B",
        timezone: "Europe/London",
        client_id: clientB,
        enquiry_id: enquiry,
        status: "confirmed",
        slots: [{ date: day(20), time: "10:00" }],
      })
      expect(r.status).toBe(201)
      expect(sql(`SELECT client_id, enquiry_id, status FROM bookings WHERE id = ${r.json.id}`)[0]).toEqual([String(clientA), "NULL", "requested"])
    })

    it("lists only the client's own portal requests, never another client's or the owner's own records", async () => {
      const a = await requestCall({ topic: "A call", timezone: "Europe/London", slots: [{ date: day(10), time: "11:00" }] })
      const b = await requestCall({ topic: "B call", timezone: "Europe/London", slots: [{ date: day(11), time: "12:00" }] }, tokenB)
      // A call the owner recorded by hand for client A stays internal.
      const recorded = await api<{ id: number }>("bookings.php?action=create", {
        token: tokenOwner,
        body: { client_id: clientA, start_local: `${day(12)}T15:00`, timezone: "Europe/London", notes: "Owner private note" },
      })
      expect(recorded.status).toBe(201)

      const mine = await api<CallRequest[]>("bookings.php?action=mine", { token: tokenA })
      expect(mine.status).toBe(200)
      expect(mine.json.map((x) => x.id)).toEqual([a.json.id])
      expect(JSON.stringify(mine.json)).not.toContain("A call")
      expect(JSON.stringify(mine.json)).not.toContain("Owner private note")
      const theirs = await api<CallRequest[]>("bookings.php?action=mine", { token: tokenB })
      expect(theirs.json.map((x) => x.id)).toEqual([b.json.id])
    })

    it("keeps owner notes private after the owner confirms the call", async () => {
      const r = await requestCall({ topic: "Kick-off", timezone: "Europe/London", slots: [{ date: day(15), time: "10:00" }, { date: day(16), time: "10:00" }] })
      // The owner moves it to the second choice, confirms, and adds a private note.
      const moved = await api("bookings.php?action=reschedule", { token: tokenOwner, body: { id: r.json.id, start_local: `${day(16)}T10:00`, timezone: "Europe/London" } })
      expect(moved.status).toBe(200)
      expect((await api("bookings.php?action=status", { token: tokenOwner, body: { id: r.json.id, status: "confirmed" } })).status).toBe(200)
      expect((await api("bookings.php?action=update", { token: tokenOwner, body: { id: r.json.id, notes: "Owner only: budget is tight" } })).status).toBe(200)

      const mine = await api<CallRequest[]>("bookings.php?action=mine", { token: tokenA })
      expect(mine.json).toHaveLength(1)
      expect(mine.json[0].status).toBe("confirmed")
      expect(mine.json[0].start_local).toBe(`${day(16)}T10:00`)
      expect(JSON.stringify(mine.json)).not.toContain("budget")
    })

    it("is seen by staff in the normal Calls list, linked to the client", async () => {
      const r = await requestCall({ topic: "Review", timezone: "Europe/London", slots: [{ date: day(9), time: "16:00" }] })
      const staff = await api<Array<{ id: number; client_id: number; client_company: string; status: string; notes: string }>>("bookings.php", { token: tokenOwner })
      const row = staff.json.find((x) => x.id === r.json.id)
      expect(row).toMatchObject({ client_id: clientA, client_company: "Synthetic A Ltd", status: "requested" })
      expect(row?.notes).toContain("Topic: Review")
      const forClient = await api<Array<{ id: number }>>(`bookings.php?client_id=${clientA}`, { token: tokenOwner })
      expect(forClient.json.map((x) => x.id)).toContain(r.json.id)
    })

    it("accepts at most three times", async () => {
      const slots = [1, 2, 3, 4].map((n) => ({ date: day(10 + n), time: "10:00" }))
      expect((await requestCall({ topic: "Too many", timezone: "Europe/London", slots })).status).toBe(400)
      expect((await requestCall({ topic: "Three", timezone: "Europe/London", slots: slots.slice(0, 3) })).status).toBe(201)
      expect(one(`SELECT COUNT(*) FROM bookings`)).toBe("1")
    })

    it("refuses missing, malformed, impossible and repeated times", async () => {
      const base = { topic: "Bad times", timezone: "Europe/London" }
      const cases: unknown[] = [
        { ...base },
        { ...base, slots: [] },
        { ...base, slots: "tomorrow" },
        { ...base, slots: { a: { date: day(5), time: "10:00" } } },
        { ...base, slots: [{ date: day(5) }] },
        { ...base, slots: [{ date: "05/11/2027", time: "10:00" }] },
        { ...base, slots: [{ date: `${nextYear}-02-30`, time: "10:00" }] },
        { ...base, slots: [{ date: day(5), time: "25:00" }] },
        { ...base, slots: [{ date: day(5), time: "10:00" }, { date: day(5), time: "10:00" }] },
        // The clocks go forward at 01:00 in London on the last Sunday of March: 01:30 does not exist.
        { ...base, slots: [{ date: lastSundayOfMarch(nextYear), time: "01:30" }] },
        { ...base, timezone: "Mars/Olympus", slots: [{ date: day(5), time: "10:00" }] },
        { ...base, timezone: undefined, slots: [{ date: day(5), time: "10:00" }] },
      ]
      for (const body of cases) {
        const r = await requestCall(body)
        expect(r.status, JSON.stringify(body)).toBe(400)
      }
      expect(one(`SELECT COUNT(*) FROM bookings`)).toBe("0")
    })

    it("refuses a time in the past, judged against the database clock in UTC", async () => {
      const base = { topic: "Past", timezone: "Europe/London" }
      expect((await requestCall({ ...base, slots: [{ date: day(-1), time: "10:00" }] })).status).toBe(400)
      expect((await requestCall({ ...base, slots: [{ date: "2020-01-01", time: "10:00" }] })).status).toBe(400)
      // One past time spoils the whole request, even after a good one.
      const mixed = await requestCall({ ...base, slots: [{ date: day(3), time: "10:00" }, { date: day(-2), time: "10:00" }] })
      expect(mixed.status).toBe(400)
      expect(mixed.json.error).toContain("Time 2")
      // A few minutes ago in UTC is the past, wherever the client is.
      const earlier = new Date(Date.now() - 10 * 60_000)
      const utcSlot = { date: earlier.toISOString().slice(0, 10), time: earlier.toISOString().slice(11, 16) }
      expect((await requestCall({ ...base, timezone: "UTC", slots: [utcSlot] })).status).toBe(400)
      expect(one(`SELECT COUNT(*) FROM bookings`)).toBe("0")
    })

    it("refuses an empty or over-long topic", async () => {
      const slots = [{ date: day(6), time: "10:00" }]
      for (const topic of [undefined, "", "   ", 7, "x".repeat(201)]) {
        expect((await requestCall({ topic, timezone: "Europe/London", slots })).status).toBe(400)
      }
      expect(one(`SELECT COUNT(*) FROM bookings`)).toBe("0")
    })

    it("refuses a double submit of the same request", async () => {
      const body = { topic: "Once only", timezone: "Europe/London", slots: [{ date: day(7), time: "10:00" }] }
      expect((await requestCall(body)).status).toBe(201)
      expect((await requestCall(body)).status).toBe(409)
      expect(one(`SELECT COUNT(*) FROM bookings`)).toBe("1")
    })

    it("caps a client at five open portal call requests", async () => {
      const ask = (n: number, token = tokenA) =>
        requestCall({ topic: `Call ${n}`, timezone: "Europe/London", slots: [{ date: day(20 + n), time: "10:00" }] }, token)
      const ids: number[] = []
      for (let n = 1; n <= 5; n++) {
        const r = await ask(n)
        expect(r.status).toBe(201)
        ids.push(r.json.id)
      }
      // Owner-recorded calls for the same client do not count towards the cap.
      const recorded = await api("bookings.php?action=create", {
        token: tokenOwner,
        body: { client_id: clientA, start_local: `${day(40)}T15:00`, timezone: "Europe/London" },
      })
      expect(recorded.status).toBe(201)
      const sixth = await ask(6)
      expect(sixth.status).toBe(429)
      expect(sixth.json.error).toMatch(/5 call requests waiting/)
      expect(one(`SELECT COUNT(*) FROM bookings WHERE client_id = ${clientA}`)).toBe("6")
      // Another client is unaffected.
      expect((await ask(1, tokenB)).status).toBe(201)
      // Once the owner answers one, there is room again.
      expect((await api("bookings.php?action=status", { token: tokenOwner, body: { id: ids[0], status: "confirmed" } })).status).toBe(200)
      expect((await ask(7)).status).toBe(201)
      expect((await ask(8)).status).toBe(429)
    })

    it("is for clients only: staff and the signed-out get no client routes, and clients no staff ones", async () => {
      const body = { topic: "Staff try", timezone: "Europe/London", slots: [{ date: day(8), time: "10:00" }] }
      expect((await api("bookings.php?action=request", { body })).status).toBe(401)
      expect((await api("bookings.php?action=mine")).status).toBe(401)
      expect((await requestCall(body, tokenOwner)).status).toBe(403)
      expect((await api("bookings.php?action=mine", { token: tokenOwner })).status).toBe(403)
      // The staff list and staff writes stay closed to a client.
      expect((await api("bookings.php", { token: tokenA })).status).toBe(403)
      expect((await api(`bookings.php?client_id=${clientA}`, { token: tokenA })).status).toBe(403)
      expect(one(`SELECT COUNT(*) FROM bookings`)).toBe("0")
    })

    it("refuses a client account with no client, or whose client was deleted", async () => {
      createUser({ email: "loose@example.test", role: "client", clientId: null })
      const loose = await login("loose@example.test")
      const body = { topic: "No client", timezone: "Europe/London", slots: [{ date: day(8), time: "10:00" }] }
      expect((await requestCall(body, loose)).status).toBe(403)
      expect((await askUpdate({ question: "No client" }, loose)).status).toBe(403)
      sql(`UPDATE clients SET deleted_at = NOW() WHERE id = ${clientB}`)
      expect((await requestCall(body, tokenB)).status).toBe(404)
      expect(one(`SELECT COUNT(*) FROM bookings`)).toBe("0")
    })
  })
})

function lastSundayOfMarch(year: number): string {
  const d = new Date(Date.UTC(year, 2, 31))
  d.setUTCDate(31 - d.getUTCDay())
  return d.toISOString().slice(0, 10)
}
