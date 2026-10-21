import { describe, expect, it } from "vitest"
import { BAD_REPLY_ERROR, NETWORK_ERROR, type EnquiryErasure } from "@/lib/api"
import { site } from "@/marketing/data/site"
import { DELETION_NOT_AVAILABLE, confirmMatches, deletionRequestOutcome, erasePreviewState, erasureOutcome, otherEnquiriesNote } from "./erasureModel"

describe("confirmMatches", () => {
  it("accepts the address with different case and outer spaces", () => {
    expect(confirmMatches("  Jane@Example.test ", "jane@example.test")).toBe(true)
  })

  it("refuses a near miss, a longer address, an empty field and an enquiry with no address", () => {
    expect(confirmMatches("jane@example.tes", "jane@example.test")).toBe(false)
    expect(confirmMatches("xjane@example.test", "jane@example.test")).toBe(false)
    expect(confirmMatches("jane@example.test.uk", "jane@example.test")).toBe(false)
    expect(confirmMatches("", "jane@example.test")).toBe(false)
    expect(confirmMatches("", "  ")).toBe(false)
  })
})

describe("erasureOutcome", () => {
  const result: EnquiryErasure = { erased: true, id: 4, bookings: 1, booking_events: 2, audit_scrubbed: 3 }

  it("passes on a completed erasure", () => {
    expect(erasureOutcome({ ok: true, data: result })).toEqual({ kind: "erased", result })
  })

  it("shows the server's reason for a refusal that changed nothing", () => {
    const linked = { ok: false as const, error: "A client was created from this enquiry.", status: 409, details: { error: "A client was created from this enquiry.", reason: "converted" } }
    expect(erasureOutcome(linked)).toEqual({ kind: "refused", error: "A client was created from this enquiry." })
    expect(erasureOutcome({ ok: false, error: "That does not match.", status: 400, details: { error: "That does not match." } }).kind).toBe("refused")
    expect(erasureOutcome({ ok: false, error: "Enquiry not found.", status: 404, details: { error: "Enquiry not found." } }).kind).toBe("refused")
  })

  it("is quietly not on the server for an older privacy.php or a missing file", () => {
    expect(erasureOutcome({ ok: false, error: "Method not allowed.", status: 405, details: { error: "Method not allowed." } })).toEqual({ kind: "not_on_server" })
    expect(erasureOutcome({ ok: false, error: "Request failed (404).", status: 404 })).toEqual({ kind: "not_on_server" })
    expect(erasureOutcome({ ok: false, error: BAD_REPLY_ERROR, status: 200 })).toEqual({ kind: "not_on_server" })
  })

  it("keeps a server or network failure as an error", () => {
    expect(erasureOutcome({ ok: false, error: "Could not erase the enquiry. Nothing was changed.", status: 500, details: {} })).toEqual({
      kind: "error",
      error: "Could not erase the enquiry. Nothing was changed.",
    })
    expect(erasureOutcome({ ok: false, error: NETWORK_ERROR })).toEqual({ kind: "error", error: NETWORK_ERROR })
  })
})

describe("erase preview", () => {
  it("keeps a preview, and falls back to unknown on any failure so the dialog still works", () => {
    const preview = { id: 3, other_enquiries: 2, blocked: null, message: null }
    expect(erasePreviewState({ ok: true, data: preview })).toEqual({ kind: "ready", preview })
    expect(erasePreviewState({ ok: false, error: "Not available on this server yet.", status: 503, details: {} })).toEqual({ kind: "unknown" })
    expect(erasePreviewState({ ok: false, error: NETWORK_ERROR })).toEqual({ kind: "unknown" })
  })

  it("says nothing with no other enquiries, and counts them otherwise", () => {
    expect(otherEnquiriesNote(0)).toBeNull()
    expect(otherEnquiriesNote(1)).toMatch(/^1 other enquiry uses this address\. It is not erased, but .*IP addresses included, are cleared too\.$/)
    expect(otherEnquiriesNote(3)).toMatch(/^3 other enquiries use this address\. They are not erased/)
  })
})

describe("deletionRequestOutcome", () => {
  it("reports a sent request", () => {
    expect(deletionRequestOutcome({ ok: true, data: { id: 9, subject: "Data deletion request" } })).toEqual({ kind: "sent" })
  })

  it("says a request is already open on a 409", () => {
    const msg = "You already have a data deletion request open. GAkinz will reply to it."
    expect(deletionRequestOutcome({ ok: false, error: msg, status: 409, details: { error: msg } })).toEqual({ kind: "already_open", message: msg })
  })

  it("treats the older support.php role gate as not on the server, but a real refusal as an error", () => {
    expect(deletionRequestOutcome({ ok: false, error: "Not allowed.", status: 403, details: { error: "Not allowed." } })).toEqual({ kind: "not_on_server" })
    const unlinked = "Your account is not linked to a client."
    expect(deletionRequestOutcome({ ok: false, error: unlinked, status: 403, details: { error: unlinked } })).toEqual({ kind: "error", error: unlinked })
  })
})

describe("DELETION_NOT_AVAILABLE", () => {
  it("names the site's contact address, the one the public pages print", () => {
    expect(site.contact.email).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]+$/)
    expect(DELETION_NOT_AVAILABLE.endsWith(`email ${site.contact.email}.`)).toBe(true)
  })
})
