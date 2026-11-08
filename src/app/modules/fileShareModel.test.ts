import { describe, expect, it } from "vitest"
import { shareNotice } from "./fileShareModel"

describe("shareNotice: what the Files screen tells the owner after sharing (K-128)", () => {
  it("says how long an expiring link is valid", () => {
    expect(shareNotice({ copied: true, expiresAt: "2026-11-15 10:00:00", days: 7 })).toBe("Share link copied (valid 7 days).")
    expect(shareNotice({ copied: false, expiresAt: "2026-11-15 10:00:00", days: 7 })).toBe("Share link created (valid 7 days).")
  })

  it("says plainly when the link does not expire, and why", () => {
    const text = shareNotice({ copied: true, expiresAt: null, days: 7 })
    expect(text).toBe("Share link copied. It does not expire: this file is shown on a public page.")
    expect(text).not.toMatch(/7 days/)
  })

  it("uses 'day' for one day", () => {
    expect(shareNotice({ copied: true, expiresAt: "2026-11-09 10:00:00", days: 1 })).toBe("Share link copied (valid 1 day).")
  })
})
