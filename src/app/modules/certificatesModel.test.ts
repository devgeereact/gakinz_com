import { describe, expect, it } from "vitest"
import { certificateState, issueError, verifyUrl, type CertificateRow } from "./certificatesModel"

const row = (over: Partial<CertificateRow> = {}): CertificateRow => ({
  id: 1, public_id: "GK-7F3A-2C9D-X4K2", recipient: "A", programme: "B", issued_at: "2026-11-01", revoked_at: null, created_at: "2026-11-01 10:00:00", ...over,
})

describe("verifyUrl", () => {
  it("points at the public verify page with the reference as the last segment", () => {
    expect(verifyUrl("GK-7F3A-2C9D-X4K2")).toBe("https://gakinz.com/verify/GK-7F3A-2C9D-X4K2")
  })
  it("keeps odd characters from breaking the link", () => {
    expect(verifyUrl("a b/c")).toBe("https://gakinz.com/verify/a%20b%2Fc")
  })
})

describe("certificateState", () => {
  it("is valid until it is revoked", () => {
    expect(certificateState(row())).toBe("valid")
    expect(certificateState(row({ revoked_at: "2026-11-05 09:00:00" }))).toBe("revoked")
  })
})

describe("issueError", () => {
  const today = "2026-11-09"
  it("accepts a name, a programme and a past or empty date", () => {
    expect(issueError({ recipient: "A", programme: "B", issued_at: "2026-11-01" }, today)).toBeNull()
    expect(issueError({ recipient: "A", programme: "B", issued_at: today }, today)).toBeNull()
    expect(issueError({ recipient: "A", programme: "B", issued_at: "" }, today)).toBeNull()
  })
  it("asks for the recipient and the programme, ignoring blank spaces", () => {
    expect(issueError({ recipient: "  ", programme: "B", issued_at: "" }, today)).toMatch(/recipient/i)
    expect(issueError({ recipient: "A", programme: "", issued_at: "" }, today)).toMatch(/programme/i)
  })
  it("refuses a date in the future", () => {
    expect(issueError({ recipient: "A", programme: "B", issued_at: "2026-11-10" }, today)).toMatch(/future/i)
  })
})
