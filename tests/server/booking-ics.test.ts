/**
 * Calendar file for a confirmed call (docs/PRODUCT-SPEC.md section 7):
 * bookings.php?action=ics for staff, ?action=mine_ics for a client's own
 * portal call. The file is formatted by server/_ics.php and checked here
 * through the real endpoint: RFC 5545 line endings, folding and escaping, UTC
 * times from a call agreed in another zone, a stable UID and a SEQUENCE that
 * follows reschedules. Owner notes and outcome never appear, a client's file
 * carries no location, and a client can only fetch their own confirmed call.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { BASE } from "./env"
import { api, createClient, createUser, login, one, q, resetDb, sql } from "./helpers"

type Ics = { status: number; text: string; headers: Headers }

async function getIcs(path: string, token?: string): Promise<Ics> {
  const res = await fetch(`${BASE}/${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  return { status: res.status, text: await res.text(), headers: res.headers }
}

/** Undo RFC 5545 folding: a CRLF followed by one space joins the lines. */
const unfold = (body: string) => body.replace(/\r\n /g, "")

/** The value of one property in an unfolded file, or undefined. */
function prop(body: string, name: string): string | undefined {
  const line = unfold(body).split("\r\n").find((l) => l.startsWith(`${name}:`))
  return line?.slice(name.length + 1)
}

const nextYear = new Date().getUTCFullYear() + 1
const NOTE = "PRIVATE-OWNER-NOTE: the client is difficult about money"
const OUTCOME = "PRIVATE-OUTCOME: likely to sign"

describe("booking calendar file", () => {
  let owner: string
  let editor: string
  let clientA: number
  let clientB: number
  let tokenA: string
  let tokenB: string

  beforeEach(async () => {
    resetDb()
    clientA = createClient("Synthetic A Ltd")
    clientB = createClient("Synthetic B Ltd")
    createUser({ email: "owner@example.test", role: "super_admin" })
    createUser({ email: "editor@example.test", role: "editor" })
    createUser({ email: "client-a@example.test", role: "client", clientId: clientA })
    createUser({ email: "client-b@example.test", role: "client", clientId: clientB })
    owner = await login("owner@example.test")
    editor = await login("editor@example.test")
    tokenA = await login("client-a@example.test")
    tokenB = await login("client-b@example.test")
  })

  /** Record a call as staff and return its id. */
  async function record(body: Record<string, unknown>): Promise<number> {
    const r = await api<{ id: number; error?: string }>("bookings.php?action=create", { token: owner, body })
    expect(r.status, r.json.error).toBe(201)
    return r.json.id
  }

  describe("staff file", () => {
    it("sends a calendar download with private, uncached headers and CRLF lines", async () => {
      const id = await record({ client_id: clientA, start_local: "2027-07-14T14:00", timezone: "Europe/London", duration_min: 45, status: "confirmed" })
      const audited = one(`SELECT COUNT(*) FROM audit_log`)
      const r = await getIcs(`bookings.php?action=ics&id=${id}`, editor)
      expect(r.status).toBe(200)
      expect(r.headers.get("content-type")).toBe("text/calendar; charset=utf-8")
      expect(r.headers.get("content-disposition")).toBe(`attachment; filename="gakinz-call-${id}.ics"`)
      expect(r.headers.get("cache-control")).toBe("private, no-store")
      expect(r.headers.get("x-content-type-options")).toBe("nosniff")

      // Every line ends in CRLF: no bare LF or CR anywhere, and the file ends with CRLF.
      expect(r.text.endsWith("\r\n")).toBe(true)
      expect(r.text.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/)
      const lines = r.text.split("\r\n").slice(0, -1)
      expect(lines[0]).toBe("BEGIN:VCALENDAR")
      expect(lines.at(-1)).toBe("END:VCALENDAR")
      expect(lines).toContain("VERSION:2.0")
      expect(lines).toContain("BEGIN:VEVENT")
      expect(lines).toContain("STATUS:CONFIRMED")

      expect(prop(r.text, "UID")).toBe(`booking-${id}@gakinz.com`)
      expect(prop(r.text, "SEQUENCE")).toBe("0")
      // 14:00 in London in July is 13:00 UTC (British Summer Time); 45 minutes long.
      expect(prop(r.text, "DTSTART")).toBe("20270714T130000Z")
      expect(prop(r.text, "DTEND")).toBe("20270714T134500Z")
      const stamp = prop(r.text, "DTSTAMP") ?? ""
      expect(stamp).toMatch(/^\d{8}T\d{6}Z$/)
      const stampMs = Date.UTC(+stamp.slice(0, 4), +stamp.slice(4, 6) - 1, +stamp.slice(6, 8), +stamp.slice(9, 11), +stamp.slice(11, 13), +stamp.slice(13, 15))
      expect(Math.abs(stampMs - Date.now())).toBeLessThan(5 * 60_000)
      expect(prop(r.text, "SUMMARY")).toBe("GAkinz call with Synthetic A Ltd")
      // Reading the file is not a change, so nothing is audited.
      expect(one(`SELECT COUNT(*) FROM audit_log`)).toBe(audited)
    })

    it("converts New York times to UTC in winter and in summer", async () => {
      const winter = await record({ client_id: clientA, start_local: "2027-01-15T09:30", timezone: "America/New_York", status: "confirmed" })
      const summer = await record({ client_id: clientA, start_local: "2027-07-01T09:30", timezone: "America/New_York", duration_min: 60, status: "confirmed" })
      const w = await getIcs(`bookings.php?action=ics&id=${winter}`, owner)
      const s = await getIcs(`bookings.php?action=ics&id=${summer}`, owner)
      expect(prop(w.text, "DTSTART")).toBe("20270115T143000Z") // EST, UTC-5
      expect(prop(w.text, "DTEND")).toBe("20270115T150000Z")
      expect(prop(s.text, "DTSTART")).toBe("20270701T133000Z") // EDT, UTC-4
      expect(prop(s.text, "DTEND")).toBe("20270701T143000Z")
      expect(prop(w.text, "UID")).toBe(`booking-${winter}@gakinz.com`)
      expect(prop(s.text, "DTSTAMP")).not.toContain("+")
    })

    it("escapes commas, semicolons, backslashes and new lines, and folds long lines at 75 octets", async () => {
      const company = "Smith, Jones; Partners \\ Café Ünïcode Ltd"
      sql(`UPDATE clients SET company = ${q(company)} WHERE id = ${clientA}`)
      const link = `https://meet.example.test/room/${"x".repeat(90)}?topic=plan,launch`
      const id = await record({ client_id: clientA, start_local: "2027-03-02T10:00", timezone: "Europe/London", status: "confirmed", location: link })
      const r = await getIcs(`bookings.php?action=ics&id=${id}`, owner)
      expect(r.status).toBe(200)

      // Folding: no physical line is longer than 75 octets, continuations start
      // with one space, and folding never splits a multi-byte character.
      const physical = r.text.split("\r\n").slice(0, -1)
      for (const l of physical) expect(Buffer.byteLength(l, "utf8")).toBeLessThanOrEqual(75)
      expect(physical.some((l) => l.startsWith(" "))).toBe(true)
      expect(r.text).not.toContain("�")

      expect(prop(r.text, "SUMMARY")).toBe("GAkinz call with Smith\\, Jones\\; Partners \\\\ Café Ünïcode Ltd")
      const description = prop(r.text, "DESCRIPTION") ?? ""
      expect(Buffer.byteLength(`DESCRIPTION:${description}`)).toBeGreaterThan(75) // long enough to fold
      // Lines of the description are joined by the escaped \n, never a raw break.
      expect(description).toBe(
        "Call with Smith\\, Jones\\; Partners \\\\ Café Ünïcode Ltd.\\n" +
          "Agreed time: Tuesday 2 March 2027\\, 10:00 (Europe/London).\\n" +
          `Where: ${link.replace(",", "\\,")}\\n` +
          `Booking #${id} in GAkinzOS\\, Enquiries\\, Calls.`,
      )
      // LOCATION is TEXT and escaped; URL is a URI and is not.
      expect(prop(r.text, "LOCATION")).toBe(link.replace(",", "\\,"))
      expect(prop(r.text, "URL")).toBe(link)
      // 10:00 in London in March, before the clocks change, is 10:00 UTC.
      expect(prop(r.text, "DTSTART")).toBe("20270302T100000Z")
    })

    it("folds between characters, never inside a multi-byte one", async () => {
      // "SUMMARY:GAkinz call with " is 25 octets and each euro sign is 3, so a
      // fold made purely by octet count would cut the 17th sign in half.
      sql(`UPDATE clients SET company = ${q("€".repeat(40))} WHERE id = ${clientA}`)
      const id = await record({ client_id: clientA, start_local: "2027-03-02T10:00", timezone: "Europe/London", status: "confirmed" })
      const r = await getIcs(`bookings.php?action=ics&id=${id}`, owner)
      const firstLine = r.text.split("\r\n").find((l) => l.startsWith("SUMMARY:"))
      expect(firstLine).toBe(`SUMMARY:GAkinz call with ${"€".repeat(16)}`)
      expect(r.text).not.toContain("�")
      expect(prop(r.text, "SUMMARY")).toBe(`GAkinz call with ${"€".repeat(40)}`)
    })

    it("names the place but sets no URL when the location is not a web link", async () => {
      const id = await record({ client_id: clientA, start_local: "2027-03-02T10:00", timezone: "Europe/London", status: "confirmed", location: "Phone: 01632 960000" })
      const r = await getIcs(`bookings.php?action=ics&id=${id}`, owner)
      expect(prop(r.text, "LOCATION")).toBe("Phone: 01632 960000")
      expect(prop(r.text, "URL")).toBeUndefined()
    })

    it("never carries the owner's notes or outcome", async () => {
      const id = await record({ client_id: clientA, start_local: "2027-05-05T15:00", timezone: "Europe/London", status: "confirmed", notes: NOTE })
      const u = await api("bookings.php?action=update", { token: owner, body: { id, outcome: OUTCOME } })
      expect(u.status).toBe(200)
      const r = await getIcs(`bookings.php?action=ics&id=${id}`, owner)
      expect(r.status).toBe(200)
      expect(unfold(r.text)).not.toContain("PRIVATE-OWNER-NOTE")
      expect(unfold(r.text)).not.toContain("PRIVATE-OUTCOME")
    })

    it("raises SEQUENCE with each reschedule and keeps the UID", async () => {
      const id = await record({ client_id: clientA, start_local: "2027-07-14T14:00", timezone: "Europe/London", status: "confirmed" })
      const m1 = await api("bookings.php?action=reschedule", { token: owner, body: { id, start_local: "2027-07-15T09:00", timezone: "Europe/London" } })
      expect(m1.status).toBe(200)
      const m2 = await api("bookings.php?action=reschedule", { token: owner, body: { id, start_local: "2027-07-15T09:00", timezone: "America/New_York" } })
      expect(m2.status).toBe(200)
      const r = await getIcs(`bookings.php?action=ics&id=${id}`, owner)
      expect(prop(r.text, "SEQUENCE")).toBe("2")
      expect(prop(r.text, "UID")).toBe(`booking-${id}@gakinz.com`)
      expect(prop(r.text, "DTSTART")).toBe("20270715T130000Z")
    })

    it("answers 404 for a call that is not confirmed, or is deleted or missing", async () => {
      const requested = await record({ client_id: clientA, start_local: "2027-07-14T14:00", timezone: "Europe/London" })
      const completed = await record({ client_id: clientA, start_local: "2027-07-14T15:00", timezone: "Europe/London", status: "confirmed" })
      expect((await api("bookings.php?action=status", { token: owner, body: { id: completed, status: "completed" } })).status).toBe(200)
      const cancelled = await record({ client_id: clientA, start_local: "2027-07-14T16:00", timezone: "Europe/London", status: "confirmed" })
      expect((await api("bookings.php?action=status", { token: owner, body: { id: cancelled, status: "cancelled" } })).status).toBe(200)
      const deleted = await record({ client_id: clientA, start_local: "2027-07-14T17:00", timezone: "Europe/London", status: "confirmed" })
      sql(`UPDATE bookings SET deleted_at = NOW() WHERE id = ${deleted}`)

      for (const id of [requested, completed, cancelled, deleted, 999999]) {
        const r = await getIcs(`bookings.php?action=ics&id=${id}`, owner)
        expect(r.status, `booking ${id}`).toBe(404)
        expect(r.headers.get("content-type")).toContain("application/json")
        expect(r.text).not.toContain("BEGIN:VCALENDAR")
      }
      expect((await getIcs("bookings.php?action=ics&id=abc", owner)).status).toBe(400)
    })

    it("refuses a client and a caller with no session", async () => {
      const id = await record({ client_id: clientA, start_local: "2027-07-14T14:00", timezone: "Europe/London", status: "confirmed" })
      const asClient = await getIcs(`bookings.php?action=ics&id=${id}`, tokenA)
      expect(asClient.status).toBe(403)
      expect(asClient.text).not.toContain("BEGIN:VCALENDAR")
      expect((await getIcs(`bookings.php?action=ics&id=${id}`)).status).toBe(401)
    })
  })

  describe("client file", () => {
    /** A portal call request by client A, then confirmed by the owner. */
    async function confirmedRequest(token = tokenA): Promise<number> {
      const r = await api<{ id: number; error?: string }>("bookings.php?action=request", {
        token,
        body: { topic: "TOPIC-IN-NOTES: plan the relaunch", timezone: "Europe/London", slots: [{ date: `${nextYear}-07-14`, time: "14:00" }] },
      })
      expect(r.status, r.json.error).toBe(201)
      const c = await api("bookings.php?action=status", { token: owner, body: { id: r.json.id, status: "confirmed" } })
      expect(c.status).toBe(200)
      return r.json.id
    }

    it("gives a client the file for their own confirmed call, without notes or location", async () => {
      const id = await confirmedRequest()
      sql(`UPDATE bookings SET location = ${q("https://meet.example.test/owner-room")}, outcome = ${q(OUTCOME)} WHERE id = ${id}`)
      const r = await getIcs(`bookings.php?action=mine_ics&id=${id}`, tokenA)
      expect(r.status).toBe(200)
      expect(r.headers.get("content-type")).toBe("text/calendar; charset=utf-8")
      expect(r.headers.get("content-disposition")).toBe(`attachment; filename="gakinz-call-${id}.ics"`)
      expect(r.headers.get("cache-control")).toBe("private, no-store")
      expect(prop(r.text, "UID")).toBe(`booking-${id}@gakinz.com`)
      expect(prop(r.text, "SUMMARY")).toBe("Call with GAkinz")
      expect(prop(r.text, "DTSTART")).toBe(`${nextYear}0714T130000Z`)
      expect(prop(r.text, "DTEND")).toBe(`${nextYear}0714T133000Z`)
      const text = unfold(r.text)
      expect(text).not.toContain("TOPIC-IN-NOTES")
      expect(text).not.toContain("Proposed times")
      expect(text).not.toContain("PRIVATE-OUTCOME")
      expect(text).not.toContain("owner-room")
      expect(prop(r.text, "LOCATION")).toBeUndefined()
      expect(prop(r.text, "URL")).toBeUndefined()
    })

    it("answers the same 404 for another client's call, an unconfirmed one and a call recorded by hand", async () => {
      const ownCall = await confirmedRequest()
      const otherCall = await confirmedRequest(tokenB)
      const pending = await api<{ id: number }>("bookings.php?action=request", {
        token: tokenA,
        body: { topic: "A second call", timezone: "Europe/London", slots: [{ date: `${nextYear}-08-01`, time: "10:00" }] },
      })
      // The owner's own record of a call with client A stays internal, as in `mine`.
      const byHand = await record({ client_id: clientA, start_local: "2027-07-20T11:00", timezone: "Europe/London", status: "confirmed" })

      const refused = [
        await getIcs(`bookings.php?action=mine_ics&id=${otherCall}`, tokenA),
        await getIcs(`bookings.php?action=mine_ics&id=${ownCall}`, tokenB),
        await getIcs(`bookings.php?action=mine_ics&id=${pending.json.id}`, tokenA),
        await getIcs(`bookings.php?action=mine_ics&id=${byHand}`, tokenA),
        await getIcs(`bookings.php?action=mine_ics&id=999999`, tokenA),
        await getIcs(`bookings.php?action=mine_ics&id=abc`, tokenA),
      ]
      for (const r of refused) {
        expect(r.status).toBe(404)
        expect(JSON.parse(r.text)).toEqual({ error: "Call not found." })
      }
      // A client_id in the query changes nothing: the client comes from the token.
      const spoof = await getIcs(`bookings.php?action=mine_ics&id=${otherCall}&client_id=${clientB}`, tokenA)
      expect(spoof.status).toBe(404)
    })

    it("is for clients only: staff are refused the client route", async () => {
      const id = await confirmedRequest()
      expect((await getIcs(`bookings.php?action=mine_ics&id=${id}`, owner)).status).toBe(403)
      expect((await getIcs(`bookings.php?action=mine_ics&id=${id}`)).status).toBe(401)
    })
  })
})
