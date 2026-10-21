import { describe, expect, it } from "vitest"
import type { Booking, BookingEvent } from "@/lib/api"
import {
  BOOKING_NEXT,
  BOOKING_STATUS,
  callWith,
  canReschedule,
  describeEvent,
  EMPTY_FEEDBACK,
  failedNotice,
  feedbackPayload,
  feedbackReady,
  formatCallTime,
  isOverdueCall,
  isWebLink,
  noticeText,
  sortCalls,
  validLocal,
  zoneOptions,
} from "./bookingModel"

const ev = (over: Partial<BookingEvent>): BookingEvent => ({
  id: 1,
  kind: "created",
  from_status: null,
  to_status: "requested",
  from_starts_at: null,
  from_timezone: null,
  to_starts_at: null,
  to_timezone: null,
  notify_status: null,
  notify_to: null,
  notify_attempts: 0,
  notify_error: null,
  notified_at: null,
  by: null,
  created_at: "2026-10-16 10:00:00",
  ...over,
})

const call = (over: Partial<Booking>): Booking => ({
  id: 1,
  enquiry_id: 1,
  client_id: null,
  enquiry_name: "Tia",
  enquiry_company: null,
  client_company: null,
  starts_at: "2026-11-03T14:00:00Z",
  start_local: "2026-11-03T14:00",
  timezone: "Europe/London",
  duration_min: 30,
  location: null,
  status: "requested",
  notes: null,
  outcome: null,
  created_at: "",
  updated_at: "",
  history: [],
  ...over,
})

describe("booking status", () => {
  it("never labels a request as confirmed", () => {
    expect(BOOKING_STATUS.requested.label).toBe("Requested, not confirmed")
    expect(BOOKING_STATUS.requested.label).not.toMatch(/^Confirmed/)
  })

  it("mirrors the server's allowed changes", () => {
    expect(BOOKING_NEXT.requested).toEqual(["confirmed", "cancelled"])
    expect(BOOKING_NEXT.confirmed).toEqual(["completed", "cancelled"])
    expect(BOOKING_NEXT.completed).toEqual([])
    expect(BOOKING_NEXT.cancelled).toEqual([])
    expect(canReschedule("confirmed")).toBe(true)
    expect(canReschedule("cancelled")).toBe(false)
  })
})

describe("formatCallTime", () => {
  it("shows the agreed zone, across the clock change", () => {
    expect(formatCallTime("2026-07-01T08:30:00Z", "Europe/London").agreed).toBe("Wed, 1 Jul 2026, 09:30 Europe/London")
    expect(formatCallTime("2026-11-03T14:00:00Z", "Europe/London").agreed).toBe("Tue, 3 Nov 2026, 14:00 Europe/London")
  })

  it("adds the viewer's own time only when it reads differently", () => {
    const t = formatCallTime("2026-07-01T13:30:00Z", "America/New_York", "Europe/London")
    expect(t.agreed).toBe("Wed, 1 Jul 2026, 09:30 America/New_York")
    expect(t.yours).toBe("Wed, 1 Jul 2026, 14:30 your time")
    expect(formatCallTime("2026-07-01T13:30:00Z", "Europe/London", "Europe/London").yours).toBeNull()
    // Same clock in winter, different names: no second line.
    expect(formatCallTime("2026-12-01T10:00:00Z", "UTC", "Europe/London").yours).toBeNull()
  })
})

describe("sortCalls and overdue", () => {
  const now = Date.parse("2026-11-01T12:00:00Z")
  it("puts open calls to come first, soonest first, then the rest newest first", () => {
    const list = [
      call({ id: 1, starts_at: "2026-10-01T10:00:00Z", status: "completed" }),
      call({ id: 2, starts_at: "2026-11-10T10:00:00Z", status: "confirmed" }),
      call({ id: 3, starts_at: "2026-11-05T10:00:00Z" }),
      call({ id: 4, starts_at: "2026-11-20T10:00:00Z", status: "cancelled" }),
      call({ id: 5, starts_at: "2026-10-20T10:00:00Z" }),
    ]
    expect(sortCalls(list, now).map((b) => b.id)).toEqual([3, 2, 4, 5, 1])
  })

  it("marks an open call whose time has passed", () => {
    expect(isOverdueCall(call({ starts_at: "2026-10-20T10:00:00Z" }), now)).toBe(true)
    expect(isOverdueCall(call({ starts_at: "2026-10-20T10:00:00Z", status: "completed" }), now)).toBe(false)
    expect(isOverdueCall(call({ starts_at: "2026-11-01T11:45:00Z", duration_min: 30 }), now)).toBe(false)
  })
})

describe("notices and history", () => {
  it("offers a retry only for the latest email, and only when it failed", () => {
    const failed = ev({ id: 7, kind: "status", to_status: "cancelled", notify_status: "failed", notify_error: "No valid email" })
    expect(failedNotice(call({ history: [failed, ev({})] }))?.id).toBe(7)
    expect(failedNotice(call({ history: [ev({ id: 8, notify_status: "sent" }), failed] }))).toBeNull()
    expect(failedNotice(call({ history: [ev({})] }))).toBeNull()
  })

  it("describes events and notices in plain words", () => {
    expect(describeEvent(ev({}))).toBe("Recorded as requested, not confirmed")
    expect(describeEvent(ev({ kind: "status", to_status: "confirmed" }))).toBe("Marked confirmed")
    expect(describeEvent(ev({ kind: "rescheduled", from_starts_at: "2026-10-20T09:00:00Z", from_timezone: "Europe/London" }))).toBe(
      "Moved from Tue, 20 Oct 2026, 10:00 Europe/London",
    )
    expect(noticeText(ev({ notify_status: "sent", notify_to: "a@example.test" }))).toBe("Customer emailed at a@example.test")
    expect(noticeText(ev({ notify_status: "failed", notify_error: "No address" }))).toBe("Email to the customer failed: No address")
    expect(noticeText(ev({}))).toBeNull()
  })
})

describe("small helpers", () => {
  it("links web addresses only", () => {
    expect(isWebLink("https://meet.example.test/x")).toBe(true)
    expect(isWebLink("javascript:alert(1)")).toBe(false)
    expect(isWebLink("Phone 01234 567890")).toBe(false)
  })

  it("checks the local time input and builds the zone list", () => {
    expect(validLocal("2026-11-03T14:00")).toBe(true)
    expect(validLocal("2026-11-03")).toBe(false)
    expect(zoneOptions("Asia/Tokyo", "America/Denver").slice(0, 3)).toEqual(["Europe/London", "America/Denver", "Asia/Tokyo"])
    expect(new Set(zoneOptions("Europe/London")).size).toBe(zoneOptions("Europe/London").length)
  })

  it("names who the call is with", () => {
    expect(callWith(call({ client_company: "Acme" }))).toBe("Acme")
    expect(callWith(call({ enquiry_company: "Beta", enquiry_name: "Bo" }))).toBe("Beta")
    expect(callWith(call({}))).toBe("Tia")
  })

  it("sends an attribution only with permission to quote, and blanks as null", () => {
    const base = { ...EMPTY_FEEDBACK, went_well: "  Clear  ", could_improve: " ", attribution: "Sam" }
    expect(feedbackPayload(base)).toEqual({
      project_id: null,
      rating: null,
      went_well: "Clear",
      could_improve: null,
      follow_up_ok: false,
      may_publish: false,
      attribution: null,
    })
    expect(feedbackPayload({ ...base, may_publish: true }).attribution).toBe("Sam")
  })

  it("needs a rating or some words before feedback is sent", () => {
    expect(feedbackReady({ rating: null, went_well: " ", could_improve: "" })).toBe(false)
    expect(feedbackReady({ rating: 4, went_well: "", could_improve: "" })).toBe(true)
    expect(feedbackReady({ rating: null, went_well: "", could_improve: "Faster" })).toBe(true)
  })
})
