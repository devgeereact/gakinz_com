import { describe, expect, it } from "vitest"
import { isoDate } from "./blog"

describe("isoDate", () => {
  it("turns MySQL time from the CMS into an ISO date", () => {
    expect(isoDate("2026-05-12 10:00:00")).toBe("2026-05-12")
  })
  it("keeps an ISO date or timestamp", () => {
    expect(isoDate("2026-05-12")).toBe("2026-05-12")
    expect(isoDate("2026-05-12T10:00:00Z")).toBe("2026-05-12")
  })
  it("drops anything else", () => {
    expect(isoDate(null)).toBe("")
    expect(isoDate("12/05/2026")).toBe("")
  })
})
