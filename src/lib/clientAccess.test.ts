import { describe, expect, it } from "vitest"
import { isReferenceShape, normaliseReference, readAccessToken, referenceSignInEnabled } from "./clientAccess"

const TOKEN = "0123456789abcdef".repeat(4)

describe("referenceSignInEnabled", () => {
  it("is on only for a 200 that says enabled: true", () => {
    expect(referenceSignInEnabled({ ok: true, data: { enabled: true } })).toBe(true)
  })
  it("stays off for the switched-off 404, an error, or anything truthy that is not true", () => {
    expect(referenceSignInEnabled({ ok: false, error: "Not found.", status: 404 })).toBe(false)
    expect(referenceSignInEnabled({ ok: false, error: "Network error" })).toBe(false)
    for (const enabled of [1, "true", "yes", {}, null, undefined, false]) {
      expect(referenceSignInEnabled({ ok: true, data: { enabled } })).toBe(false)
    }
  })
})

describe("readAccessToken", () => {
  it("reads a 64-character hex token from the fragment", () => {
    expect(readAccessToken(`#access=${TOKEN}`)).toBe(TOKEN)
    expect(readAccessToken(`access=${TOKEN}&x=1`)).toBe(TOKEN)
  })
  it("ignores other fragments and malformed tokens", () => {
    expect(readAccessToken("")).toBeNull()
    expect(readAccessToken(`#magic=${TOKEN}`)).toBeNull()
    expect(readAccessToken(`#access=${TOKEN.toUpperCase()}`)).toBeNull()
    expect(readAccessToken(`#access=${TOKEN.slice(0, 62)}`)).toBeNull()
    expect(readAccessToken(`#access=${TOKEN}0`)).toBeNull()
  })
})

describe("references", () => {
  it("tidies what was typed", () => {
    expect(normaliseReference(" gk-p-2026-0001 ")).toBe("GK-P-2026-0001")
    expect(normaliseReference("GK-E-2026- 0042")).toBe("GK-E-2026-0042")
  })
  it("accepts the two issued shapes only", () => {
    expect(isReferenceShape("GK-P-2026-0001")).toBe(true)
    expect(isReferenceShape("GK-E-2026-12345")).toBe(true)
    for (const v of ["", "GK-X-2026-0001", "GK-P-26-0001", "GK-P-2026-001", "Alpha Ltd", "gk-p-2026-0001"]) {
      expect(isReferenceShape(v)).toBe(false)
    }
  })
})
