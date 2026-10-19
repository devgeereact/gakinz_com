import { describe, expect, it } from "vitest"
import { BAD_REPLY_ERROR, DOWNLOAD_NOT_READY, NETWORK_ERROR } from "@/lib/api"
import { notAvailableYet, ROLE_REFUSAL } from "@/lib/notAvailable"

// The shared rule's download cases. The JSON cases are covered where the rule
// was first used (portalRequestsModel.test.ts) and by each screen's model.
describe("notAvailableYet for downloads", () => {
  it("treats a 200 of the wrong type (the SPA shell for a missing file) as not available", () => {
    expect(notAvailableYet({ ok: false, error: DOWNLOAD_NOT_READY, status: 200 })).toBe(true)
  })

  it("keeps a JSON 404 about a record as an error, and the host's bare 404 as not available", () => {
    expect(notAvailableYet({ ok: false, error: "Client not found.", status: 404, details: { error: "Client not found." } })).toBe(false)
    expect(notAvailableYet({ ok: false, error: "Download failed (404).", status: 404 })).toBe(true)
  })

  it("never hides a network failure or a server error", () => {
    expect(notAvailableYet({ ok: false, error: NETWORK_ERROR })).toBe(false)
    expect(notAvailableYet({ ok: false, error: "Server error.", status: 500, details: { error: "Server error." } })).toBe(false)
    expect(notAvailableYet({ ok: false, error: BAD_REPLY_ERROR })).toBe(false)
  })

  it("matches the role gate's words exactly", () => {
    expect(ROLE_REFUSAL).toBe("Not allowed.")
    expect(notAvailableYet({ ok: false, error: "Not allowed here.", status: 403, details: { error: "Not allowed here." } })).toBe(false)
  })
})
