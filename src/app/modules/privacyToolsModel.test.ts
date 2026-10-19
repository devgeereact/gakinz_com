import { describe, expect, it } from "vitest"
import { BAD_REPLY_ERROR, DOWNLOAD_NOT_READY, NETWORK_ERROR, type RetentionReport } from "@/lib/api"
import { exportOutcome, retentionState } from "./privacyToolsModel"

const report = { rules: [] } as unknown as RetentionReport

describe("retentionState", () => {
  it("keeps a good report", () => {
    expect(retentionState({ ok: true, data: report })).toEqual({ kind: "ready", report })
  })

  it("is quietly not on the server for the SPA shell's HTML 200, a bare 404 and the old role gate", () => {
    expect(retentionState({ ok: false, error: BAD_REPLY_ERROR, status: 200 })).toEqual({ kind: "not_on_server" })
    expect(retentionState({ ok: false, error: "Request failed (404).", status: 404 })).toEqual({ kind: "not_on_server" })
    expect(retentionState({ ok: false, error: "Not allowed.", status: 403, details: { error: "Not allowed." } })).toEqual({ kind: "not_on_server" })
  })

  it("shows a real failure as an error", () => {
    expect(retentionState({ ok: false, error: "Server error.", status: 500, details: { error: "Server error." } })).toEqual({
      kind: "error",
      error: "Server error.",
    })
    expect(retentionState({ ok: false, error: NETWORK_ERROR })).toEqual({ kind: "error", error: NETWORK_ERROR })
  })
})

describe("exportOutcome", () => {
  it("saves a JSON export", () => {
    const file = new Blob(["{}"], { type: "application/json" })
    expect(exportOutcome({ ok: true, data: file })).toEqual({ kind: "saved", file })
  })

  it("is quietly not on the server when the missing file is answered with the SPA shell", () => {
    expect(exportOutcome({ ok: false, error: DOWNLOAD_NOT_READY, status: 200 })).toEqual({ kind: "not_on_server" })
  })

  it("keeps a refusal about the record, such as an unknown email, as an error", () => {
    const res = { ok: false as const, error: "No enquiry uses that email address.", status: 404, details: { error: "No enquiry uses that email address." } }
    expect(exportOutcome(res)).toEqual({ kind: "error", error: "No enquiry uses that email address." })
    const role = { ok: false as const, error: "Your role cannot export.", status: 403, details: { error: "Your role cannot export." } }
    expect(exportOutcome(role).kind).toBe("error")
  })
})
