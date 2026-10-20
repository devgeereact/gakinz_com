import { describe, expect, it } from "vitest"
import { BAD_REPLY_ERROR, NETWORK_ERROR, type ClientAnonymisation, type ClientAnonymisePreview } from "@/lib/api"
import { anonymiseAvailable, anonymiseOutcome, changesList, companyMatches } from "./anonymiseModel"

const preview: ClientAnonymisePreview = {
  id: 7,
  company: "Acme Ltd",
  placeholder: "Former client #7",
  logins: 2,
  source_enquiry: true,
  other_enquiries: 1,
  problems: [],
  kept: ["Invoices and payments: financial records the business may have to keep for tax."],
}

describe("anonymiseAvailable", () => {
  it("shows the action only for a well-formed preview", () => {
    expect(anonymiseAvailable({ ok: true, data: preview })).toEqual(preview)
  })

  it("hides it when switched off, not uploaded, not allowed or failing", () => {
    // Switched off: privacy.php answers {"error":"Not found."} with 404.
    expect(anonymiseAvailable({ ok: false, error: "Not found.", status: 404, details: { error: "Not found." } })).toBeNull()
    // An older privacy.php that does not know the action.
    expect(anonymiseAvailable({ ok: false, error: "Unknown action.", status: 400, details: { error: "Unknown action." } })).toBeNull()
    expect(anonymiseAvailable({ ok: false, error: "Not available on this server yet.", status: 503, details: {} })).toBeNull()
    expect(anonymiseAvailable({ ok: false, error: "Not allowed.", status: 403, details: { error: "Not allowed." } })).toBeNull()
    expect(anonymiseAvailable({ ok: false, error: BAD_REPLY_ERROR, status: 200 })).toBeNull()
    expect(anonymiseAvailable({ ok: false, error: NETWORK_ERROR })).toBeNull()
  })

  it("hides it for a 200 that is not a preview, such as the app shell's JSON fallback", () => {
    expect(anonymiseAvailable({ ok: true, data: {} as ClientAnonymisePreview })).toBeNull()
    expect(anonymiseAvailable({ ok: true, data: { ...preview, problems: undefined } as unknown as ClientAnonymisePreview })).toBeNull()
  })
})

describe("companyMatches", () => {
  it("ignores case, outer spaces and runs of spaces, as the server does", () => {
    expect(companyMatches("  acme   LTD ", "Acme Ltd")).toBe(true)
  })

  it("refuses a near miss, a longer name, an empty field and a blank company", () => {
    expect(companyMatches("Acme", "Acme Ltd")).toBe(false)
    expect(companyMatches("Acme Ltd.", "Acme Ltd")).toBe(false)
    expect(companyMatches("", "Acme Ltd")).toBe(false)
    expect(companyMatches(" ", "  ")).toBe(false)
  })
})

describe("anonymiseOutcome", () => {
  const result: ClientAnonymisation = {
    anonymised: true, id: 7, logins: 2, sessions: 1, magic_links: 0, password_resets: 1, enquiry: 1, feedback: 0, booking_events: 0, audit_scrubbed: 3,
  }

  it("passes on a completed anonymisation", () => {
    expect(anonymiseOutcome({ ok: true, data: result })).toEqual({ kind: "anonymised", result })
  })

  it("shows the server's reason when it changed nothing", () => {
    const blocked = { ok: false as const, error: "This client has a project that is not launched.", status: 409, details: { reasons: ["open_projects"] } }
    expect(anonymiseOutcome(blocked)).toEqual({ kind: "refused", error: "This client has a project that is not launched." })
    expect(anonymiseOutcome({ ok: false, error: "That does not match.", status: 400, details: {} }).kind).toBe("refused")
    expect(anonymiseOutcome({ ok: false, error: "Not found.", status: 404, details: {} }).kind).toBe("refused")
  })

  it("keeps a server or network failure as an error", () => {
    expect(anonymiseOutcome({ ok: false, error: "Could not anonymise the client. Nothing was changed.", status: 500, details: {} }))
      .toEqual({ kind: "error", error: "Could not anonymise the client. Nothing was changed." })
    expect(anonymiseOutcome({ ok: false, error: NETWORK_ERROR })).toEqual({ kind: "error", error: NETWORK_ERROR })
  })
})

describe("changesList", () => {
  it("says the company name is replaced unless it is kept", () => {
    expect(changesList(preview, false)[0]).toBe("The company name becomes “Former client #7”.")
    expect(changesList(preview, true)[0]).toBe("The company name stays “Acme Ltd”.")
  })

  it("names the logins, the source enquiry and the other enquiries only when there are some", () => {
    const full = changesList(preview, false)
    expect(full.some((l) => l.startsWith("Its 2 portal logins are suspended"))).toBe(true)
    expect(full.some((l) => l.includes("IP address and company."))).toBe(true)
    expect(full.some((l) => l.startsWith("1 other enquiry uses the same address and is not changed"))).toBe(true)
    const bare = changesList({ ...preview, logins: 0, source_enquiry: false, other_enquiries: 0 }, true)
    expect(bare.some((l) => /portal login|enquiry/.test(l))).toBe(false)
    expect(changesList({ ...preview, logins: 1 }, false).some((l) => l.startsWith("Its portal login is suspended"))).toBe(true)
  })
})
