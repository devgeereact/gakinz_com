import { describe, expect, it } from "vitest"
import type { ClientThread, PortalCallRequest } from "@/lib/api"
import {
  callFormProblem,
  callPayload,
  emptyCallForm,
  isUpdateRequest,
  openCallRequests,
  openUpdateRequests,
  requestsLoadState,
  todayIn,
} from "./portalRequestsModel"

const thread = (id: number, subject: string, status: ClientThread["status"]): ClientThread => ({
  id,
  subject,
  status,
  body: null,
  created_at: "2026-10-18 10:00:00",
  last_activity: "2026-10-18 10:00:00",
  replies: [],
})

const call = (id: number, status: PortalCallRequest["status"], startsAt: string): PortalCallRequest => ({
  id,
  status,
  starts_at: startsAt,
  start_local: startsAt.slice(0, 16),
  timezone: "UTC",
  duration_min: 30,
  created_at: "2026-10-18 10:00:00",
})

describe("open requests", () => {
  it("keeps update requests that are not resolved, and no other messages", () => {
    const list = [
      thread(1, "Update request: Brochure site", "open"),
      thread(2, "Update request: Logo", "resolved"),
      thread(3, "A general question", "open"),
      thread(4, "Update request: Shop", "in_progress"),
      thread(5, "update request: lower case is not ours", "open"),
    ]
    expect(openUpdateRequests(list).map((t) => t.id)).toEqual([1, 4])
    expect(isUpdateRequest("Re: Update request: x")).toBe(false)
  })

  it("keeps calls still waiting, and confirmed calls still to come", () => {
    const now = Date.parse("2026-10-18T12:00:00Z")
    const list = [
      call(1, "requested", "2026-10-01T10:00:00Z"), // waiting on the owner, even if the first choice has passed
      call(2, "confirmed", "2026-10-20T10:00:00Z"),
      call(3, "confirmed", "2026-10-17T10:00:00Z"),
      call(4, "cancelled", "2026-10-25T10:00:00Z"),
      call(5, "completed", "2026-10-10T10:00:00Z"),
    ]
    expect(openCallRequests(list, now).map((c) => c.id)).toEqual([1, 2])
  })
})

describe("the call request form", () => {
  const ready = { topic: "Plan phase two", zone: "Europe/London", slots: [{ date: "2026-11-03", time: "14:00" }] }

  it("is ready with a topic, a zone and one complete time", () => {
    expect(callFormProblem(ready)).toBeNull()
  })

  it("names what is missing", () => {
    expect(callFormProblem(emptyCallForm("Europe/London"))).toMatch(/what the call is about/)
    expect(callFormProblem({ ...ready, topic: "   " })).toMatch(/what the call is about/)
    expect(callFormProblem({ ...ready, topic: "x".repeat(201) })).toMatch(/under 200/)
    expect(callFormProblem({ ...ready, zone: "" })).toMatch(/time zone/)
    expect(callFormProblem({ ...ready, slots: [{ date: "", time: "" }] })).toMatch(/at least one/)
    expect(callFormProblem({ ...ready, slots: [{ date: "2026-11-03", time: "" }] })).toBe("Time 1 needs both a date and a time.")
    expect(callFormProblem({ ...ready, slots: [...ready.slots, ...ready.slots] })).toMatch(/must be different/)
    const four = ["01", "02", "03", "04"].map((d) => ({ date: `2026-12-${d}`, time: "10:00" }))
    expect(callFormProblem({ ...ready, slots: four })).toMatch(/up to 3/)
  })

  it("sends a trimmed topic and only the filled slots", () => {
    const form = {
      topic: "  Plan phase two ",
      zone: "America/New_York",
      slots: [{ date: "", time: "" }, { date: "2026-11-03", time: "14:00" }, { date: "", time: "" }],
    }
    expect(callFormProblem(form)).toBeNull()
    expect(callPayload(form)).toEqual({ topic: "Plan phase two", timezone: "America/New_York", slots: [{ date: "2026-11-03", time: "14:00" }] })
  })

  it("gives today's date in the client's own zone", () => {
    const lateLondon = new Date("2026-10-18T23:30:00Z")
    expect(todayIn("Europe/London", lateLondon)).toBe("2026-10-19") // BST, UTC+1
    expect(todayIn("America/Los_Angeles", lateLondon)).toBe("2026-10-18")
    expect(todayIn("Not/AZone", lateLondon)).toBe("2026-10-18")
  })
})

describe("the requests panel state", () => {
  it("shows the error whenever a load failed, even when the other list arrived", () => {
    expect(requestsLoadState([], null, "Server error")).toBe("error") // messages loaded, calls failed
    expect(requestsLoadState(null, [], "Server error")).toBe("error")
    expect(requestsLoadState([], [], "Server error")).toBe("error")
  })

  it("loads until both lists arrive, then is ready", () => {
    expect(requestsLoadState(null, null, null)).toBe("loading")
    expect(requestsLoadState([], null, null)).toBe("loading")
    expect(requestsLoadState([], [], null)).toBe("ready")
  })
})
