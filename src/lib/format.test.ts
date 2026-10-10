import { describe, expect, it } from "vitest"
import { followUpState, formatYmd, localIsoDate } from "./format"

// Enquiry follow-ups: "due" means a next action on or before today on an
// enquiry that is still open.
describe("followUpState", () => {
  const today = "2026-10-10"
  it.each([
    ["2026-10-09", "overdue"],
    ["2026-10-10", "today"],
    ["2026-10-11", "upcoming"],
  ])("reads %s as %s", (at, state) => {
    expect(followUpState({ status: "contacted", next_action_at: at }, today)).toBe(state)
  })

  it.each(["won", "lost"])("ignores a %s enquiry", (status) => {
    expect(followUpState({ status, next_action_at: "2026-10-01" }, today)).toBeNull()
  })

  it("is null without a next action, including on an un-migrated server", () => {
    expect(followUpState({ status: "new", next_action_at: null }, today)).toBeNull()
    expect(followUpState({ status: "new" }, today)).toBeNull()
  })
})

describe("local dates", () => {
  it("formats the local calendar day, not the UTC one", () => {
    expect(localIsoDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05")
    expect(formatYmd("2026-10-12")).toBe("12 Oct")
  })
})
