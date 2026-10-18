import { describe, expect, it } from "vitest"
import type { AcceptanceEvidence } from "@/lib/api"
import { ACCEPTANCE_METHODS, acceptanceMethodLabel, evidenceLine, evidenceProblem, referenceHint, shortFingerprint } from "./acceptanceModel"

const quote = { created_at: "2026-01-05 10:00:00" }
const ok: AcceptanceEvidence = { method: "email", reference: "Re: Website quote, jo@client.example", received_on: "2026-01-12" }
const today = "2026-02-01"

describe("evidenceProblem", () => {
  it("passes complete evidence, including a date on the day the quote was created or today", () => {
    expect(evidenceProblem(ok, quote, today)).toBeNull()
    expect(evidenceProblem({ ...ok, received_on: "2026-01-05" }, quote, today)).toBeNull()
    expect(evidenceProblem({ ...ok, received_on: today }, quote, today)).toBeNull()
  })
  it("asks for a reference of 3 to 200 characters, ignoring surrounding spaces", () => {
    expect(evidenceProblem({ ...ok, reference: "  ab  " }, quote, today)).toMatch(/at least 3/)
    expect(evidenceProblem({ ...ok, reference: "abc" }, quote, today)).toBeNull()
    expect(evidenceProblem({ ...ok, reference: "x".repeat(201) }, quote, today)).toMatch(/200 characters/)
  })
  it("refuses a missing, future or too early date", () => {
    expect(evidenceProblem({ ...ok, received_on: "" }, quote, today)).toMatch(/Enter the date/)
    expect(evidenceProblem({ ...ok, received_on: "2026-02-02" }, quote, today)).toMatch(/future/)
    expect(evidenceProblem({ ...ok, received_on: "2026-01-04" }, quote, today)).toMatch(/before the quote was created/)
  })
})

describe("display helpers", () => {
  it("labels every method the server accepts and hints at a fitting reference", () => {
    expect(ACCEPTANCE_METHODS.map((m) => m.value)).toEqual(["email", "letter", "in_person", "phone", "other"])
    expect(acceptanceMethodLabel("in_person")).toBe("In person")
    expect(referenceHint("email")).toMatch(/subject and sender/)
    expect(referenceHint("phone")).toMatch(/spoke to/)
  })
  it("shortens a fingerprint to 12 hex characters", () => {
    expect(shortFingerprint("0123456789abcdef".repeat(4))).toBe("0123456789ab")
    expect(shortFingerprint(null)).toBeNull()
  })
  it("describes recorded evidence, or nothing when none was recorded", () => {
    expect(evidenceLine({ acceptance_method: "email", acceptance_received_on: "2026-01-12" })).toBe("Email, received 12 Jan 2026")
    expect(evidenceLine({ acceptance_method: "phone", acceptance_received_on: null })).toBe("Phone")
    expect(evidenceLine({ acceptance_method: null, acceptance_received_on: null })).toBeNull()
  })
})
