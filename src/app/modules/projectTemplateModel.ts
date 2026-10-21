/**
 * Pure logic for "Start from template" in the New project dialog
 * (projects.php?action=templates and the `template` key on create;
 * server/_templates.php). No React and no fetches, so it is unit tested
 * directly. The server is the authority: it holds the templates and decides
 * what is created; these decide whether the picker shows, what the preview
 * lists and what the toast says afterwards.
 */
import type { ProjectCreated, ProjectTemplate, ProjectTemplateKey } from "@/lib/api"

const KEYS: readonly ProjectTemplateKey[] = ["business_website", "ecommerce", "website_care", "it_support", "it_consultancy"]

const isText = (v: unknown): v is string => typeof v === "string"
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)

function isTemplate(v: unknown): v is ProjectTemplate {
  if (!isObj(v) || !isText(v.key) || !KEYS.includes(v.key as ProjectTemplateKey) || !isText(v.name) || !isText(v.summary)) return false
  if (!Array.isArray(v.tasks) || !v.tasks.every((t) => isObj(t) && isText(t.title) && Number.isInteger(t.offset_days))) return false
  if (!Array.isArray(v.assets) || !v.assets.every((a) => isObj(a) && isText(a.label) && isText(a.note))) return false
  const b = v.brief
  if (!isObj(b) || !Array.isArray(b.measurements)) return false
  return b.measurements.every((m) => isObj(m) && isText(m.label) && isText(m.target) && isText(m.method))
}

/**
 * The templates from projects.php?action=templates, or null when the reply is
 * not a template list. An older projects.php ignores the action and answers
 * with the project list, so null means "the server is not updated yet" and the
 * picker stays hidden; a bare project can still be created.
 */
export function parseTemplates(data: unknown): ProjectTemplate[] | null {
  if (!Array.isArray(data) || data.length === 0) return null
  return data.every(isTemplate) ? data : null
}

/** The date a starter task falls due: `offset` days after `from`, as YYYY-MM-DD in local time. */
export function dueOn(from: Date, offset: number): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export type TemplatePreview = {
  counts: string
  tasks: { title: string; due: string; day: string }[]
  assets: string[]
  measurements: string[]
  note: string
}

/** The checkbox label: checklist items show in the client's portal as soon as they exist. */
export const CHECKLIST_OPTION = "Add the client checklist (the client sees it in their portal straight away)"

/**
 * What the dialog lists before Create. Task dates are worked out from `today`
 * in the browser's time zone; the server stores them from its own date, so
 * near midnight the two can differ by a day. `assets` is empty unless the
 * client checklist is ticked, because without it none is created.
 */
export function templatePreview(t: ProjectTemplate, today: Date, withChecklist: boolean): TemplatePreview {
  const parts = [plural(t.tasks.length, "task")]
  if (withChecklist) parts.push(plural(t.assets.length, "checklist item"))
  parts.push(plural(t.brief.measurements.length, "measurement"))
  return {
    counts: parts.join(", "),
    tasks: t.tasks.map((x) => ({ title: x.title, due: dueOn(today, x.offset_days), day: x.offset_days === 0 ? "Today" : `Day ${x.offset_days}` })),
    assets: withChecklist ? t.assets.map((a) => a.label) : [],
    measurements: t.brief.measurements.map((m) => m.label),
    note: "Measurements start as NOT TESTED. Deliverables and exclusions stay empty for you to agree with the client.",
  }
}

/**
 * The create body: the template key, and the checklist choice, only when a
 * template is chosen, so a bare project is sent exactly as before.
 */
export function createPayload(form: { name: string; client_id: string; due_date: string; template: string; include_checklist: boolean }) {
  const template = KEYS.find((k) => k === form.template)
  return {
    name: form.name,
    client_id: form.client_id ? Number(form.client_id) : null,
    due_date: form.due_date || undefined,
    ...(template ? { template, include_client_checklist: form.include_checklist === true } : {}),
  }
}

export type CreateOutcome = { message: string; warnings: string[] }

/**
 * The toast after a successful create. A template that was asked for but not
 * applied (an older projects.php ignores the key and creates a bare project)
 * is a warning, and each table the server skipped (SQL 15 or 16 not run) adds
 * the server's own note.
 */
export function createOutcome(chosen: ProjectTemplate | null, reply: ProjectCreated): CreateOutcome {
  if (!chosen) return { message: "Project created.", warnings: [] }
  if (!reply.created || reply.template !== chosen.key) {
    return {
      message: "Project created.",
      warnings: ["The template was not applied, because the server is not updated yet. Add the tasks by hand or try again later."],
    }
  }
  const c = reply.created
  return {
    message:
      `Project created from ${chosen.name}: ${plural(c.tasks, "task")}, ` +
      (reply.include_client_checklist ? `${plural(c.assets, "checklist item")}, ` : "") +
      `${plural(c.measurements, "measurement")}.`,
    warnings: (reply.skipped ?? []).map((s) => s.note),
  }
}
