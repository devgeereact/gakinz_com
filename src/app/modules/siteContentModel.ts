import type { SiteContent, SiteDrafts, SiteSection, WorkAdminRow, WorkInput } from "@/lib/api"
import { SITE_SECTIONS } from "@/lib/api"
import { DEFAULT_COPY } from "@/marketing/data/content"

// Pure helpers behind the Site content module and the hero controls in Work.
// Kept free of React so they can be unit tested (siteContentModel.test.ts).

/** Limits mirrored from server/site.php. The server stays the authority. */
export const SITE_MAX_ROWS = 12
const SHORT = 300
const LONG = 1200

/** The hero holds at most this many projects (server/work.php HERO_MAX). */
export const HERO_MAX = 5

/** Seconds per project: server/site.php takes a whole number from 4 to 10. */
export function normaliseSecs(v: unknown): number {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : 6
  return Math.min(10, Math.max(4, n))
}

/** The public site's built-in copy, in the shapes site.php stores. */
export function defaultSiteContent(): SiteContent {
  const d = DEFAULT_COPY
  return {
    hero: { status: d.hero.status, lead: d.hero.lead, cta1: d.hero.cta1, cta2: d.hero.cta2, secs: normaliseSecs(d.hero.secs) },
    services: d.services.map((s) => ({ title: s.title, summary: s.summary })),
    process: d.process.map((s) => ({ title: s.title, detail: s.detail })),
    packages: d.packages.map((p) => ({ name: p.name, price: p.price, best: p.best, featured: p.featured })),
    addons: d.addons.map((a) => ({ name: a.name, price: a.price })),
    terms: d.terms.map((t) => ({ stage: t.stage, share: t.share })),
    faqs: d.faqs.map((f) => ({ q: f.q, a: f.a })),
    contact: { email: d.contact.email, reply: d.contact.reply, footer: d.contact.footer },
  }
}

/** What the editor shows for each section: the draft, else the published copy, else the default. */
export function effectiveContent(drafts: SiteDrafts | null | undefined): SiteContent {
  const out = defaultSiteContent()
  if (!drafts) return out
  const put = <S extends SiteSection>(s: S) => {
    const st = drafts[s]
    const v = st?.draft ?? st?.published
    if (v != null) out[s] = v as SiteContent[S]
  }
  for (const s of SITE_SECTIONS) put(s)
  out.hero = { ...out.hero, secs: normaliseSecs(out.hero.secs) }
  return out
}

export const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** Sections whose edited value differs from the baseline loaded from the server. */
export function dirtySections(values: SiteContent, baseline: SiteContent): SiteSection[] {
  return SITE_SECTIONS.filter((s) => !sameJson(values[s], baseline[s]))
}

/** Sections with a saved draft that the website does not show yet. */
export function unpublishedSections(drafts: SiteDrafts | null | undefined): SiteSection[] {
  if (!drafts) return []
  return SITE_SECTIONS.filter((s) => drafts[s]?.draft != null && !sameJson(drafts[s].draft, drafts[s].published))
}

/** The most recent publish across sections, for the "Last published" line. */
export function lastPublished(drafts: SiteDrafts | null | undefined): { at: string; by: string | null } | null {
  if (!drafts) return null
  let best: { at: string; by: string | null } | null = null
  for (const s of SITE_SECTIONS) {
    const at = drafts[s]?.published_at
    if (at && (!best || at > best.at)) best = { at, by: drafts[s].published_by_name }
  }
  return best
}

// ── List editor helpers ─────────────────────────────────────────────────────

/** A MySQL DATETIME ("2026-10-12 14:03:00") as "12 Oct 2026", read as local time. */
export function formatPublishedDate(at: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(at)
  if (!m) return at
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/** Swap a row with its neighbour. Out-of-range moves return the list unchanged. */
export function moveRow<T>(rows: T[], index: number, delta: number): T[] {
  const to = index + delta
  if (index < 0 || index >= rows.length || to < 0 || to >= rows.length) return rows
  const next = [...rows]
  ;[next[index], next[to]] = [next[to], next[index]]
  return next
}

/** Remove a row, but always keep at least one. */
export function removeRow<T>(rows: T[], index: number): T[] {
  if (rows.length <= 1 || index < 0 || index >= rows.length) return rows
  return rows.filter((_, i) => i !== index)
}

/** Append a blank row shaped like the first one: text fields empty, flags false. */
export function addRow<T extends Record<string, unknown>>(rows: T[], blank: T): T[] {
  if (rows.length >= SITE_MAX_ROWS) return rows
  return [...rows, { ...blank }]
}

/** Which button should take focus after a move, so keyboard users stay on the row they moved. */
export function focusAfterMove(len: number, index: number, delta: number): { index: number; delta: number } {
  const to = index + delta
  const sameDirEnabled = delta < 0 ? to > 0 : to < len - 1
  return { index: to, delta: sameDirEnabled ? delta : -delta }
}

// ── Client-side checks, mirroring site.php so obvious slips never round-trip ─

type FieldRule = { key: string; label: string; max: number; email?: boolean }
const RULES: Record<Exclude<SiteSection, "hero">, FieldRule[]> = {
  services: [
    { key: "title", label: "Service name", max: SHORT },
    { key: "summary", label: "Summary", max: LONG },
  ],
  process: [
    { key: "title", label: "Stage", max: SHORT },
    { key: "detail", label: "What happens", max: LONG },
  ],
  packages: [
    { key: "name", label: "Name", max: SHORT },
    { key: "price", label: "Price from", max: SHORT },
    { key: "best", label: "Best for", max: LONG },
  ],
  addons: [
    { key: "name", label: "Add-on", max: SHORT },
    { key: "price", label: "Price", max: SHORT },
  ],
  terms: [
    { key: "stage", label: "When", max: SHORT },
    { key: "share", label: "Share", max: SHORT },
  ],
  faqs: [
    { key: "q", label: "Question", max: SHORT },
    { key: "a", label: "Answer", max: LONG },
  ],
  contact: [
    { key: "email", label: "Enquiry email", max: 200, email: true },
    { key: "reply", label: "Reply promise", max: SHORT },
    { key: "footer", label: "Footer line", max: LONG },
  ],
}
const HERO_RULES: FieldRule[] = [
  { key: "status", label: "Status line", max: SHORT },
  { key: "lead", label: "Headline lead-in", max: LONG },
  { key: "cta1", label: "Main button", max: SHORT },
  { key: "cta2", label: "Second button", max: SHORT },
]

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function checkRecord(rec: Record<string, unknown>, rules: FieldRule[], where: string): string | null {
  for (const r of rules) {
    const v = typeof rec[r.key] === "string" ? (rec[r.key] as string).trim() : ""
    if (!v) return `${where}${r.label} cannot be empty.`
    if (v.length > r.max) return `${where}${r.label} must be ${r.max} characters or fewer.`
    if (r.email && !EMAIL.test(v)) return `${where}${r.label} must be a valid email address.`
  }
  return null
}

/** The first problem in a section, worded for the editor, or null when it looks valid. */
export function validateSection<S extends SiteSection>(section: S, data: SiteContent[S]): string | null {
  if (section === "hero") {
    const h = data as SiteContent["hero"]
    const bad = checkRecord(h as unknown as Record<string, unknown>, HERO_RULES, "")
    if (bad) return bad
    if (!Number.isInteger(h.secs) || h.secs < 4 || h.secs > 10) return "Seconds per project must be a whole number from 4 to 10."
    return null
  }
  if (section === "contact") return checkRecord(data as unknown as Record<string, unknown>, RULES.contact, "")
  const rows = data as unknown as Record<string, unknown>[]
  if (rows.length < 1) return "Keep at least one row."
  if (rows.length > SITE_MAX_ROWS) return `Up to ${SITE_MAX_ROWS} rows.`
  const rules = RULES[section as Exclude<SiteSection, "hero" | "contact">]
  for (let i = 0; i < rows.length; i++) {
    const bad = checkRecord(rows[i], rules, `Row ${i + 1}: `)
    if (bad) return bad
  }
  return null
}

/** The Site content tab each section is edited on. */
export type SiteTab = "hero" | "services" | "process" | "pricing" | "faqs" | "contact"
export const SECTION_TAB: Record<SiteSection, SiteTab> = {
  hero: "hero",
  services: "services",
  process: "process",
  packages: "pricing",
  addons: "pricing",
  terms: "pricing",
  faqs: "faqs",
  contact: "contact",
}

// ── Work hero helpers ───────────────────────────────────────────────────────

/** Ids of the records in the hero, in the order they sit in the Work list. */
export function heroIdsInListOrder(rows: Pick<WorkAdminRow, "id" | "hero_order">[]): number[] {
  return rows.filter((r) => r.hero_order != null).map((r) => r.id)
}

/** Ids of the records in the hero, in their stored hero order. */
export function heroIdsInHeroOrder(rows: Pick<WorkAdminRow, "id" | "hero_order">[]): number[] {
  return rows
    .filter((r) => r.hero_order != null)
    .sort((a, b) => (a.hero_order as number) - (b.hero_order as number))
    .map((r) => r.id)
}

/** Text colour that reads on a brand colour: near-black on light colours, white on dark ones. */
export function textOn(hex: string | null | undefined): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "")
  if (!m) return "#FFFFFF"
  const n = parseInt(m[1], 16)
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  // White whenever it reaches 4.5:1, as brand colours usually expect; otherwise
  // whichever of the two gives the higher contrast ratio.
  const onWhite = 1.05 / (L + 0.05)
  const onDark = (L + 0.05) / 0.0105
  return onWhite >= 4.5 || onWhite >= onDark ? "#FFFFFF" : "#1A1206"
}

/** The hero fields as the Work form edits them. */
export type HeroForm = {
  brand_colour: string
  hero_word: string
  desktop_file_id: number | null
  desktop_alt: string
  mobile_file_id: number | null
  mobile_alt: string
}

export const blankHero: HeroForm = {
  brand_colour: "",
  hero_word: "",
  desktop_file_id: null,
  desktop_alt: "",
  mobile_file_id: null,
  mobile_alt: "",
}

export function heroFormFromRow(row: Pick<WorkAdminRow, "brand_colour" | "hero_word" | "hero_desktop" | "hero_mobile">): HeroForm {
  return {
    brand_colour: row.brand_colour ?? "",
    hero_word: row.hero_word ?? "",
    desktop_file_id: row.hero_desktop?.file_id ?? null,
    desktop_alt: row.hero_desktop?.alt ?? "",
    mobile_file_id: row.hero_mobile?.file_id ?? null,
    mobile_alt: row.hero_mobile?.alt ?? "",
  }
}

/**
 * Only the hero keys that changed, so saving an unrelated edit never touches
 * the stored hero. A screenshot is sent with its alt text, as work.php requires.
 */
export function heroChanges(initial: HeroForm, now: HeroForm): Partial<WorkInput> {
  const out: Partial<WorkInput> = {}
  if (now.brand_colour.trim() !== initial.brand_colour.trim()) out.brand_colour = now.brand_colour.trim() || null
  if (now.hero_word.trim() !== initial.hero_word.trim()) out.hero_word = now.hero_word.trim() || null
  if (now.desktop_file_id !== initial.desktop_file_id || now.desktop_alt.trim() !== initial.desktop_alt.trim()) {
    out.hero_desktop_file_id = now.desktop_file_id
    out.hero_desktop_alt = now.desktop_file_id ? now.desktop_alt.trim() : null
  }
  if (now.mobile_file_id !== initial.mobile_file_id || now.mobile_alt.trim() !== initial.mobile_alt.trim()) {
    out.hero_mobile_file_id = now.mobile_file_id
    out.hero_mobile_alt = now.mobile_file_id ? now.mobile_alt.trim() : null
  }
  return out
}

/** Problems with the hero fields, keyed for the form, before anything is sent. */
export function validateHero(h: HeroForm): Record<string, string> {
  const e: Record<string, string> = {}
  const c = h.brand_colour.trim()
  if (c && !/^#[0-9A-Fa-f]{6}$/.test(c)) e.brand_colour = "Use a colour such as #1A2B3C."
  const w = h.hero_word.trim().replace(/\s+/g, " ")
  if (w.length > 40) e.hero_word = "Keep the hero word to 40 characters or fewer."
  else if (w && w.split(" ").length > 2) e.hero_word = "Keep the hero word to one or two words."
  if (h.desktop_file_id && !h.desktop_alt.trim()) e.desktop_alt = "Describe the desktop screenshot for screen readers."
  if (h.mobile_file_id && !h.mobile_alt.trim()) e.mobile_alt = "Describe the phone screenshot for screen readers."
  return e
}
