/**
 * Call bookings inside Enquiries (docs/PRODUCT-SPEC.md section 5.5, journey
 * "Discovery call" in section 5.4): staff only, a request is never confirmed
 * by itself, local time and daylight saving survive the round trip, a
 * reschedule keeps its history, and a failed customer email can be retried
 * without ever sending twice.
 *
 * PHP mail() points at /usr/bin/true in the test server, so a "sent" email
 * goes nowhere.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createUser, login, one, q, resetDb, sql } from "./helpers"

type Event = {
  id: number
  kind: string
  from_status: string | null
  to_status: string | null
  from_starts_at: string | null
  to_starts_at: string | null
  notify_status: string | null
  notify_to: string | null
  notify_attempts: number
  notify_error: string | null
}
type Booking = {
  id: number
  enquiry_id: number | null
  client_id: number | null
  starts_at: string
  start_local: string
  timezone: string
  duration_min: number
  location: string | null
  status: string
  notes: string | null
  outcome: string | null
  history: Event[]
  error?: string
}
type Changed = { booking: Booking; notice: { status: string; error: string | null; to: string | null } | null; error?: string }

function createEnquiry(name: string, email = `${name.toLowerCase()}@example.test`): number {
  sql(`INSERT INTO enquiries (name, email, message) VALUES (${q(name)}, ${q(email)}, 'Synthetic enquiry')`)
  return Number(one(`SELECT MAX(id) FROM enquiries`))
}

describe("bookings.php", () => {
  let owner: string
  let editor: string
  let enquiry: number

  beforeEach(async () => {
    resetDb()
    createUser({ email: "owner@example.test", role: "super_admin" })
    createUser({ email: "editor@example.test", role: "editor" })
    owner = await login("owner@example.test")
    editor = await login("editor@example.test")
    enquiry = createEnquiry("Synthia")
  })

  const create = (body: Record<string, unknown>, token = owner) =>
    api<Booking>("bookings.php?action=create", { token, body })

  it("records a requested call against an enquiry, in local time and UTC", async () => {
    const r = await create({ enquiry_id: enquiry, start_local: "2026-11-03T14:00", timezone: "Europe/London", location: "Phone" })
    expect(r.status).toBe(201)
    expect(r.json.status).toBe("requested")
    expect(r.json.starts_at).toBe("2026-11-03T14:00:00Z") // GMT in November
    expect(r.json.start_local).toBe("2026-11-03T14:00")
    expect(r.json.duration_min).toBe(30)
    expect(r.json.history.map((e) => e.kind)).toEqual(["created"])
    expect(one(`SELECT COUNT(*) FROM audit_log WHERE action = 'booking_create'`)).toBe("1")

    const list = await api<Booking[]>(`bookings.php?enquiry_id=${enquiry}`, { token: editor })
    expect(list.status).toBe(200)
    expect(list.json.map((b) => b.id)).toEqual([r.json.id])
  })

  it("converts summer time and other zones correctly", async () => {
    const bst = await create({ enquiry_id: enquiry, start_local: "2026-07-01T09:30", timezone: "Europe/London" })
    expect(bst.json.starts_at).toBe("2026-07-01T08:30:00Z")
    const ny = await create({ enquiry_id: enquiry, start_local: "2026-07-01T09:30", timezone: "America/New_York" })
    expect(ny.json.starts_at).toBe("2026-07-01T13:30:00Z")
    expect(ny.json.start_local).toBe("2026-07-01T09:30")
  })

  it("refuses a local time that does not exist when the clocks go forward", async () => {
    const r = await create({ enquiry_id: enquiry, start_local: "2026-03-29T01:30", timezone: "Europe/London" })
    expect(r.status).toBe(400)
    expect(r.json.error).toMatch(/clocks change/)
    expect(one(`SELECT COUNT(*) FROM bookings`)).toBe("0")
  })

  it("validates links, zone, time, duration and starting status", async () => {
    const base = { enquiry_id: enquiry, start_local: "2026-11-03T14:00", timezone: "Europe/London" }
    expect((await create({ ...base, enquiry_id: undefined })).status).toBe(400)
    expect((await create({ ...base, enquiry_id: 9999 })).status).toBe(404)
    expect((await create({ ...base, client_id: 9999 })).status).toBe(404)
    expect((await create({ ...base, timezone: "Mars/Olympus" })).status).toBe(400)
    expect((await create({ ...base, start_local: "2026-02-30T10:00" })).status).toBe(400)
    expect((await create({ ...base, start_local: "tomorrow" })).status).toBe(400)
    expect((await create({ ...base, duration_min: 2 })).status).toBe(400)
    expect((await create({ ...base, status: "completed" })).status).toBe(400)
    expect(one(`SELECT COUNT(*) FROM bookings`)).toBe("0")
    // The owner can record a call already agreed by phone, with no enquiry.
    const client = createClient("Phone Booked Ltd")
    const phone = await create({ client_id: client, start_local: "2026-11-03T14:00", timezone: "Europe/London", status: "confirmed" })
    expect(phone.status).toBe(201)
    expect(phone.json.status).toBe("confirmed")
  })

  it("is staff only, on reads as well as writes", async () => {
    const b = await create({ enquiry_id: enquiry, start_local: "2026-11-03T14:00", timezone: "Europe/London" })
    const clientId = createClient("Client Co")
    createUser({ email: "client@example.test", role: "client", clientId })
    createUser({ email: "staff@example.test", role: "employee" })
    const client = await login("client@example.test")
    const employee = await login("staff@example.test")
    for (const token of [client, employee]) {
      expect((await api("bookings.php", { token })).status).toBe(403)
      expect((await api(`bookings.php?client_id=${clientId}`, { token })).status).toBe(403)
      expect((await create({ client_id: clientId, start_local: "2026-11-03T14:00", timezone: "Europe/London" }, token)).status).toBe(403)
      expect((await api("bookings.php?action=status", { token, body: { id: b.json.id, status: "confirmed" } })).status).toBe(403)
    }
    expect((await api("bookings.php")).status).toBe(401)
    expect(one(`SELECT status FROM bookings WHERE id = ${b.json.id}`)).toBe("requested")
  })

  it("only moves along allowed status changes, and a cancellation is final", async () => {
    const b = await create({ enquiry_id: enquiry, start_local: "2026-11-03T14:00", timezone: "Europe/London" })
    const id = b.json.id
    const status = (s: string, extra: Record<string, unknown> = {}) =>
      api<Changed>("bookings.php?action=status", { token: owner, body: { id, status: s, ...extra } })
    expect((await status("completed")).status).toBe(409) // a request cannot be completed
    expect((await status("confirmed")).json.booking.status).toBe("confirmed")
    const done = await status("completed", { outcome: "Agreed a quote for a five-page site" })
    expect(done.json.booking.status).toBe("completed")
    expect(done.json.booking.outcome).toBe("Agreed a quote for a five-page site")
    expect((await status("cancelled")).status).toBe(409)
    expect(done.json.booking.history.map((e) => `${e.kind}:${e.from_status ?? ""}>${e.to_status ?? ""}`)).toEqual([
      "status:confirmed>completed",
      "status:requested>confirmed",
      "created:>requested",
    ])
  })

  it("lets only one of two concurrent status changes win", async () => {
    const b = await create({ enquiry_id: enquiry, start_local: "2026-11-03T14:00", timezone: "Europe/London" })
    const [x, y] = await Promise.all([
      api<Changed>("bookings.php?action=status", { token: owner, body: { id: b.json.id, status: "confirmed" } }),
      api<Changed>("bookings.php?action=status", { token: editor, body: { id: b.json.id, status: "confirmed" } }),
    ])
    expect([x.status, y.status].sort()).toEqual([200, 409])
    expect(one(`SELECT COUNT(*) FROM booking_events WHERE booking_id = ${b.json.id} AND kind = 'status'`)).toBe("1")
  })

  it("reschedules the same record and keeps the old time in its history", async () => {
    const b = await create({ enquiry_id: enquiry, start_local: "2026-10-20T10:00", timezone: "Europe/London" })
    expect(b.json.starts_at).toBe("2026-10-20T09:00:00Z") // still BST on 20 October
    const r = await api<Changed>("bookings.php?action=reschedule", {
      token: owner,
      body: { id: b.json.id, start_local: "2026-10-27T10:00", timezone: "Europe/London", duration_min: 45 },
    })
    expect(r.status).toBe(200)
    expect(r.json.booking.id).toBe(b.json.id)
    expect(r.json.booking.starts_at).toBe("2026-10-27T10:00:00Z") // GMT after the clocks go back
    expect(r.json.booking.duration_min).toBe(45)
    expect(r.json.notice).toBeNull()
    const ev = r.json.booking.history[0]
    expect(ev.kind).toBe("rescheduled")
    expect(ev.from_starts_at).toBe("2026-10-20T09:00:00Z")
    expect(ev.to_starts_at).toBe("2026-10-27T10:00:00Z")
    expect(ev.notify_status).toBeNull()
    expect(one(`SELECT COUNT(*) FROM bookings`)).toBe("1")

    // The same time again is refused, and a cancelled call cannot move.
    const same = await api("bookings.php?action=reschedule", {
      token: owner,
      body: { id: b.json.id, start_local: "2026-10-27T10:00", timezone: "Europe/London", duration_min: 45 },
    })
    expect(same.status).toBe(400)
    await api("bookings.php?action=status", { token: owner, body: { id: b.json.id, status: "cancelled" } })
    const late = await api("bookings.php?action=reschedule", {
      token: owner,
      body: { id: b.json.id, start_local: "2026-11-27T10:00", timezone: "Europe/London" },
    })
    expect(late.status).toBe(409)
  })

  it("emails the customer about a reschedule only when asked, and records the outcome", async () => {
    const b = await create({ enquiry_id: enquiry, start_local: "2026-11-03T14:00", timezone: "Europe/London" })
    const r = await api<Changed>("bookings.php?action=reschedule", {
      token: owner,
      body: { id: b.json.id, start_local: "2026-11-04T14:00", timezone: "Europe/London", notify: true },
    })
    expect(r.json.notice).toEqual({ status: "sent", error: null, to: "synthia@example.test" })
    expect(r.json.booking.history[0].notify_status).toBe("sent")
    expect(r.json.booking.history[0].notify_attempts).toBe(1)

    // A sent email cannot be "retried" into a second send.
    const again = await api("bookings.php?action=notify", { token: owner, body: { event_id: r.json.booking.history[0].id } })
    expect(again.status).toBe(409)
    expect(one(`SELECT notify_attempts FROM booking_events WHERE id = ${r.json.booking.history[0].id}`)).toBe("1")
  })

  it("shows a failed cancellation email to the owner and retries it once the address is fixed", async () => {
    const noEmail = createEnquiry("Nomail", "")
    const b = await create({ enquiry_id: noEmail, start_local: "2026-11-03T14:00", timezone: "Europe/London" })
    const r = await api<Changed>("bookings.php?action=status", {
      token: owner,
      body: { id: b.json.id, status: "cancelled", notify: true },
    })
    expect(r.status).toBe(200)
    expect(r.json.booking.status).toBe("cancelled") // the cancellation stands even though the email failed
    expect(r.json.notice?.status).toBe("failed")
    expect(r.json.notice?.error).toMatch(/No valid email/)
    const eventId = r.json.booking.history[0].id

    sql(`UPDATE enquiries SET email = 'fixed@example.test' WHERE id = ${noEmail}`)
    const [x, y] = await Promise.all([
      api<{ notice: { status: string; to: string } }>("bookings.php?action=notify", { token: owner, body: { event_id: eventId } }),
      api<{ notice: { status: string; to: string } }>("bookings.php?action=notify", { token: owner, body: { event_id: eventId } }),
    ])
    expect([x.status, y.status].sort()).toEqual([200, 409])
    const win = x.status === 200 ? x : y
    expect(win.json.notice).toMatchObject({ status: "sent", to: "fixed@example.test" })
    expect(one(`SELECT notify_attempts FROM booking_events WHERE id = ${eventId}`)).toBe("2")
    expect(one(`SELECT COUNT(*) FROM audit_log WHERE action = 'booking_notify_retry'`)).toBe("1")
  })

  it("lists a client's calls, including those on the enquiry it came from", async () => {
    const clientId = createClient("Converted Ltd")
    sql(`UPDATE clients SET source_lead_id = ${enquiry} WHERE id = ${clientId}`)
    const other = createEnquiry("Other")
    const a = await create({ enquiry_id: enquiry, start_local: "2026-11-03T14:00", timezone: "Europe/London" })
    const c = await create({ client_id: clientId, start_local: "2026-12-03T14:00", timezone: "Europe/London" })
    await create({ enquiry_id: other, start_local: "2026-11-05T14:00", timezone: "Europe/London" })
    const r = await api<Booking[]>(`bookings.php?client_id=${clientId}`, { token: owner })
    expect(r.json.map((b) => b.id)).toEqual([c.json.id, a.json.id])
  })

  it("edits notes, location and outcome, and audits it", async () => {
    const b = await create({ enquiry_id: enquiry, start_local: "2026-11-03T14:00", timezone: "Europe/London" })
    const r = await api<Booking>("bookings.php?action=update", {
      token: owner,
      body: { id: b.json.id, location: "https://meet.example.test/abc", notes: "Owner only" },
    })
    expect(r.status).toBe(200)
    expect(r.json.location).toBe("https://meet.example.test/abc")
    expect(r.json.notes).toBe("Owner only")
    expect(one(`SELECT COUNT(*) FROM audit_log WHERE action = 'booking_update'`)).toBe("1")
    expect((await api("bookings.php?action=update", { token: owner, body: { id: 9999, notes: "x" } })).status).toBe(404)
  })
})
