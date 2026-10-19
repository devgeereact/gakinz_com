/**
 * Pure logic for the project brief panel (briefs.php, SQL 16;
 * docs/PRODUCT-SPEC.md 6.4 and 6.5). No React and no fetches, so it is unit
 * tested directly. The server is the authority on every rule; these only stop
 * an obviously bad form being sent, work out which fields changed, and decide
 * what the panel shows.
 */
import {
  BRIEF_FIELD_MAX,
  MEASURE_FIELD_MAX,
  MEASURE_LABEL_MAX,
  type BriefPatch,
  type BriefTextField,
  type Measurement,
  type MeasurementInput,
  type MeasurementKind,
  type MeasurementResult,
  type MeasureTextField,
  type ProjectBrief,
} from "@/lib/api"

/**
 * What the handoff does with staff text, word for word as HANDOFF_NOTE in
 * server/briefs.php, which prints it in the export. Shown as the panel's hint.
 */
export const HANDOFF_NOTE =
  "Staff-written fields are exported as typed, after removing this client's exact company, contact name, email and phone, and any email address; links lose their query string, fragment and login. Do not type personal data or secrets into the brief."

export type BriefFieldKey = BriefTextField | "completion_ack_on"

export type BriefFieldSpec = { key: BriefFieldKey; label: string; multiline: boolean; hint?: string }

/** The brief as one reusable template, in the four groups of spec 6.4. */
export const BRIEF_SECTIONS: { title: string; fields: BriefFieldSpec[] }[] = [
  {
    title: "Problem and outcome",
    fields: [
      { key: "problem", label: "Problem", multiline: true },
      { key: "intended_users", label: "Intended users", multiline: true },
      { key: "agreed_outcome", label: "Agreed outcome", multiline: true },
    ],
  },
  {
    title: "Approved scope",
    fields: [
      { key: "deliverables", label: "Deliverables", multiline: true, hint: "One per line. Lines starting with a dash stay a list in the handoff." },
      { key: "exclusions", label: "Exclusions", multiline: true },
      { key: "quote_reference", label: "Approved quote reference", multiline: false },
    ],
  },
  {
    title: "Plan and decisions",
    fields: [
      { key: "milestones_note", label: "Milestones and dates", multiline: true },
      { key: "next_action", label: "Next action", multiline: false },
      { key: "open_decisions", label: "Open decisions", multiline: true },
    ],
  },
  {
    title: "Handover",
    fields: [
      { key: "handover_checklist", label: "Handover checklist", multiline: true },
      { key: "support_boundaries", label: "Support boundaries", multiline: true },
      { key: "completion_ack_on", label: "Client acknowledged completion on", multiline: false },
      { key: "completion_ack_note", label: "How completion was acknowledged", multiline: true },
    ],
  },
]

export const BRIEF_FIELD_KEYS: BriefFieldKey[] = BRIEF_SECTIONS.flatMap((s) => s.fields.map((f) => f.key))
const ONE_LINE: BriefFieldKey[] = ["quote_reference", "next_action"]

export type BriefDraft = Record<BriefFieldKey, string>

/** The form's starting values: the stored brief, or blanks when there is none yet. */
export function draftFromBrief(brief: ProjectBrief | null): BriefDraft {
  const d = {} as BriefDraft
  for (const k of BRIEF_FIELD_KEYS) d[k] = brief?.[k] ?? ""
  return d
}

/** What the server would store for a typed value: trimmed, one-line fields joined, blank as null. */
export function storedValue(key: BriefFieldKey, text: string): string | null {
  const v = (ONE_LINE.includes(key) ? text.replace(/[\r\n]+/g, " ") : text).trim()
  return v === "" ? null : v
}

/** Only the fields whose stored value would change. Empty when nothing changed. */
export function briefPatch(brief: ProjectBrief | null, draft: BriefDraft): BriefPatch {
  const patch: BriefPatch = {}
  for (const k of BRIEF_FIELD_KEYS) {
    const next = storedValue(k, draft[k])
    if (next !== (brief?.[k] ?? null)) patch[k] = next
  }
  return patch
}

/** A real calendar date in YYYY-MM-DD form. */
export function isIsoDate(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!m) return false
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3])
}

const fieldLabel = (key: BriefFieldKey) => BRIEF_SECTIONS.flatMap((s) => s.fields).find((f) => f.key === key)?.label ?? key

/** The first reason the brief form cannot be saved, or null. */
export function briefProblem(draft: BriefDraft): string | null {
  for (const k of BRIEF_FIELD_KEYS) {
    const v = storedValue(k, draft[k])
    if (v === null) continue
    if (k === "completion_ack_on") {
      if (!isIsoDate(v)) return "Give the acknowledgement date as a real date."
      continue
    }
    const max = BRIEF_FIELD_MAX[k]
    if (v.length > max) return `Keep ${fieldLabel(k).toLowerCase()} to ${max} characters or fewer.`
  }
  return null
}

/** How much of the brief is filled in, for the panel header. */
export function briefProgress(brief: ProjectBrief | null): { recorded: number; total: number; text: string } {
  const total = BRIEF_FIELD_KEYS.length
  const recorded = brief ? BRIEF_FIELD_KEYS.filter((k) => (brief[k] ?? "") !== "").length : 0
  const text = recorded === 0 ? "Not started" : recorded === total ? "Every field recorded" : `${recorded} of ${total} fields recorded`
  return { recorded, total, text }
}

/** Badge variant (components/ui/badge) and words for each result. */
export const RESULT_BADGE: Record<MeasurementResult, { variant: "ok" | "bad" | "warn" | "outline"; label: string }> = {
  PASS: { variant: "ok", label: "PASS" },
  FAIL: { variant: "bad", label: "FAIL" },
  PARTIAL: { variant: "warn", label: "PARTIAL" },
  "NOT TESTED": { variant: "outline", label: "NOT TESTED" },
}

/** One line for the measurement list header, e.g. "1 PASS, 1 FAIL, 2 not tested". */
export function measurementSummary(items: { result: MeasurementResult }[]): string {
  if (items.length === 0) return "None agreed yet"
  const n = (r: MeasurementResult) => items.filter((i) => i.result === r).length
  const parts: string[] = []
  for (const r of ["PASS", "FAIL", "PARTIAL"] as const) if (n(r) > 0) parts.push(`${n(r)} ${r}`)
  if (n("NOT TESTED") > 0) parts.push(`${n("NOT TESTED")} not tested`)
  return parts.join(", ")
}

export type MeasureDraft = Record<MeasureTextField | "measured_on" | "label", string> & {
  result: MeasurementResult
  kind: MeasurementKind
}

const MEASURE_TEXT_KEYS = Object.keys(MEASURE_FIELD_MAX) as MeasureTextField[]

export function measureDraft(m: Measurement | null): MeasureDraft {
  const d = { label: m?.label ?? "", result: m?.result ?? "NOT TESTED", kind: m?.kind ?? "technical", measured_on: m?.measured_on ?? "" } as MeasureDraft
  for (const k of MEASURE_TEXT_KEYS) d[k] = m?.[k] ?? ""
  return d
}

/**
 * The body for a create or update. Every field is sent, blank as null, and a
 * technical check never sends an observation window (briefs.php refuses one).
 */
export function measureInput(d: MeasureDraft): MeasurementInput {
  const blank = (v: string) => (v.trim() === "" ? null : v.trim())
  const input: MeasurementInput = { label: d.label.trim(), result: d.result, kind: d.kind, measured_on: blank(d.measured_on) }
  for (const k of MEASURE_TEXT_KEYS) input[k] = blank(d[k])
  if (d.kind === "technical") input.observation_window = null
  return input
}

/** The first reason the measurement form cannot be saved, or null. */
export function measureProblem(d: MeasureDraft): string | null {
  const label = d.label.trim()
  if (label === "") return "Say what is measured."
  if (label.length > MEASURE_LABEL_MAX) return `Keep the label to ${MEASURE_LABEL_MAX} characters or fewer.`
  if (d.measured_on.trim() !== "" && !isIsoDate(d.measured_on.trim())) return "Give the date as a real date."
  for (const k of MEASURE_TEXT_KEYS) {
    if (k === "observation_window" && d.kind === "technical") continue
    const max = MEASURE_FIELD_MAX[k]
    if (d[k].trim().length > max) return `Keep the ${k.replace(/_/g, " ")} to ${max} characters or fewer.`
  }
  return null
}

/** The saved file's name, matching the server's Content-Disposition. */
export const handoffFileName = (projectId: number) => `gakinz-handoff-project-${projectId}.md`
