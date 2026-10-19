import { describe, expect, it } from "vitest"
import type { Measurement, ProjectBrief } from "@/lib/api"
import {
  BRIEF_FIELD_KEYS,
  briefPatch,
  briefProblem,
  briefProgress,
  draftFromBrief,
  handoffFileName,
  HANDOFF_NOTE,
  isIsoDate,
  measureDraft,
  measureInput,
  measureProblem,
  measurementSummary,
  RESULT_BADGE,
} from "./projectBriefModel"

const brief = (over: Partial<ProjectBrief> = {}): ProjectBrief => ({
  problem: null,
  intended_users: null,
  agreed_outcome: null,
  deliverables: null,
  exclusions: null,
  quote_reference: null,
  milestones_note: null,
  next_action: null,
  open_decisions: null,
  handover_checklist: null,
  support_boundaries: null,
  completion_ack_on: null,
  completion_ack_note: null,
  updated_at: "2026-10-19 09:00:00",
  ...over,
})

const measurement = (over: Partial<Measurement> = {}): Measurement => ({
  id: 1,
  project_id: 7,
  label: "Checkout works",
  target: null,
  baseline: null,
  actual: null,
  result: "NOT TESTED",
  measured_on: null,
  environment: null,
  method: null,
  evidence_location: null,
  kind: "technical",
  observation_window: null,
  created_at: "2026-10-19 09:00:00",
  updated_at: "2026-10-19 09:00:00",
  ...over,
})

describe("briefPatch", () => {
  it("sends nothing when the form matches what is stored", () => {
    const b = brief({ problem: "Orders by phone only", quote_reference: "Q-0042" })
    expect(briefPatch(b, draftFromBrief(b))).toEqual({})
    expect(briefPatch(null, draftFromBrief(null))).toEqual({})
  })

  it("sends only the changed fields, trimmed, with a cleared field as null", () => {
    const b = brief({ problem: "Orders by phone only", exclusions: "No stock sync" })
    const d = { ...draftFromBrief(b), problem: "  Orders by phone only  ", exclusions: "   ", deliverables: " Catalogue " }
    expect(briefPatch(b, d)).toEqual({ exclusions: null, deliverables: "Catalogue" })
  })

  it("joins the lines of a one-line field the way the server does, so it is not resent", () => {
    const b = brief({ next_action: "Send the draft" })
    expect(briefPatch(b, { ...draftFromBrief(b), next_action: "Send\nthe draft" })).toEqual({})
    expect(briefPatch(b, { ...draftFromBrief(b), deliverables: "a\nb" })).toEqual({ deliverables: "a\nb" })
  })
})

describe("briefProblem", () => {
  it("accepts an empty brief, because no field is required", () => {
    expect(briefProblem(draftFromBrief(null))).toBeNull()
  })

  it("names the field that is too long, at the server's cap", () => {
    const d = draftFromBrief(null)
    expect(briefProblem({ ...d, deliverables: "x".repeat(4000) })).toBeNull()
    expect(briefProblem({ ...d, deliverables: "x".repeat(4001) })).toBe("Keep deliverables to 4000 characters or fewer.")
    expect(briefProblem({ ...d, quote_reference: "Q".repeat(121) })).toBe("Keep approved quote reference to 120 characters or fewer.")
  })

  it("refuses an acknowledgement date that does not exist", () => {
    const d = draftFromBrief(null)
    expect(briefProblem({ ...d, completion_ack_on: "2026-02-30" })).toBe("Give the acknowledgement date as a real date.")
    expect(briefProblem({ ...d, completion_ack_on: "2026-10-19" })).toBeNull()
  })
})

describe("isIsoDate", () => {
  it("knows leap years and rejects other shapes", () => {
    expect(isIsoDate("2028-02-29")).toBe(true)
    expect(isIsoDate("2026-02-29")).toBe(false)
    expect(isIsoDate("19/10/2026")).toBe(false)
    expect(isIsoDate("2026-1-9")).toBe(false)
  })
})

describe("briefProgress", () => {
  it("counts recorded fields across the whole template", () => {
    expect(briefProgress(null)).toMatchObject({ recorded: 0, text: "Not started" })
    expect(briefProgress(brief({ problem: "x", completion_ack_on: "2026-10-19" }))).toEqual({
      recorded: 2,
      total: BRIEF_FIELD_KEYS.length,
      text: `2 of ${BRIEF_FIELD_KEYS.length} fields recorded`,
    })
    const full = brief(Object.fromEntries(BRIEF_FIELD_KEYS.map((k) => [k, k === "completion_ack_on" ? "2026-10-19" : "x"])))
    expect(briefProgress(full).text).toBe("Every field recorded")
  })
})

describe("measurements", () => {
  it("summarises results with the untested ones last", () => {
    expect(measurementSummary([])).toBe("None agreed yet")
    const list = [measurement({ result: "NOT TESTED" }), measurement({ result: "PASS" }), measurement({ result: "FAIL" }), measurement({ result: "PASS" })]
    expect(measurementSummary(list)).toBe("2 PASS, 1 FAIL, 1 not tested")
  })

  it("gives every result a badge tone, with failure as bad and an untested check neutral", () => {
    expect(RESULT_BADGE.PASS.variant).toBe("ok")
    expect(RESULT_BADGE.FAIL.variant).toBe("bad")
    expect(RESULT_BADGE.PARTIAL.variant).toBe("warn")
    expect(RESULT_BADGE["NOT TESTED"].variant).toBe("outline")
  })

  it("builds a body with blanks as null and no observation window for a technical check", () => {
    const d = { ...measureDraft(null), label: "  Form sends  ", target: " Three tests ", observation_window: "left over" }
    expect(measureInput(d)).toMatchObject({ label: "Form sends", target: "Three tests", baseline: null, result: "NOT TESTED", kind: "technical", observation_window: null, measured_on: null })
    const biz = measureInput({ ...d, kind: "business", observation_window: " November " })
    expect(biz.observation_window).toBe("November")
  })

  it("round-trips a stored measurement through the form unchanged", () => {
    const m = measurement({ label: "Orders", kind: "business", observation_window: "November", result: "PARTIAL", measured_on: "2026-11-30", evidence_location: "Files: orders.csv" })
    expect(measureInput(measureDraft(m))).toMatchObject({ label: "Orders", kind: "business", observation_window: "November", result: "PARTIAL", measured_on: "2026-11-30", evidence_location: "Files: orders.csv" })
  })

  it("stops a form without a label, with a bad date or with an over-long field", () => {
    const d = measureDraft(null)
    expect(measureProblem(d)).toBe("Say what is measured.")
    const ok = { ...d, label: "Form sends" }
    expect(measureProblem(ok)).toBeNull()
    expect(measureProblem({ ...ok, label: "L".repeat(201) })).toBe("Keep the label to 200 characters or fewer.")
    expect(measureProblem({ ...ok, measured_on: "2026-13-01" })).toBe("Give the date as a real date.")
    expect(measureProblem({ ...ok, method: "m".repeat(1001) })).toBe("Keep the method to 1000 characters or fewer.")
    // A window is not sent for a technical check, so its length does not block saving.
    expect(measureProblem({ ...ok, observation_window: "w".repeat(201) })).toBeNull()
    expect(measureProblem({ ...ok, kind: "business", observation_window: "w".repeat(201) })).toBe("Keep the observation window to 200 characters or fewer.")
  })
})

it("names the download as the server does", () => {
  expect(handoffFileName(12)).toBe("gakinz-handoff-project-12.md")
})

it("keeps the panel hint word for word with the note briefs.php prints in the export", () => {
  // tests/server/project-briefs.test.ts asserts the same sentence in a real export.
  expect(HANDOFF_NOTE).toBe(
    "Staff-written fields are exported as typed, after removing this client's exact company, contact name, email and phone, and any email address; links lose their query string, fragment and login. Do not type personal data or secrets into the brief.",
  )
})
