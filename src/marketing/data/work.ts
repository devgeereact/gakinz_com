import { useEffect, useState } from "react"
import { work as workApi, type ApiResult } from "@/lib/api"
import { resolveList, resolveOne } from "./cmsResult"

/**
 * The work ledger.
 *
 * Records come from the `work` table through server/work.php. When that
 * request fails (the endpoint is unreachable, or the table has not been
 * created on the live database yet) the page falls back to the static records
 * below. A successful answer, even an empty one, is final. That is the same
 * shape src/marketing/data/blog.ts already uses in production.
 *
 * TWO RULES GOVERN THE FALLBACK RECORDS:
 *
 * 1. Every one of them is true. Two are the owner's own work and need nobody's
 *    permission to describe: GAkinzOS, the system this site's CMS is, and this
 *    site's own rebuild. They are listed because they are real, not to pad the
 *    ledger.
 * 2. Nothing is invented. A field with no true value is `null`, and the ledger
 *    renders a labelled gap for it. No client is named, no figure is quoted and
 *    no outcome is claimed without a measurement behind it.
 *
 * Client case studies are deliberately absent. server/work.php refuses to
 * publish a named client without stored consent, and inventing one here to
 * make the page look fuller would defeat the point of that check.
 */

// ── Kinds ───────────────────────────────────────────────────────────────────

export type WorkKind = "case_study" | "product" | "experiment" | "writing"

/**
 * The three ledger row labels change with the kind of record.
 *
 * This is the mechanism that lets one table hold four kinds of work without a
 * badge doing the explaining: an experiment does not have to pretend it had a
 * client, because its rows ask a different question. From the approved design
 * direction, docs/DECISIONS.md D-023 and D-025.
 */
export const KIND_LABELS: Record<WorkKind, { name: string; rows: [string, string, string] }> = {
  case_study: { name: "Case study", rows: ["Problem", "Built", "Outcome"] },
  product: { name: "Product", rows: ["Problem", "Built", "Outcome"] },
  experiment: { name: "Experiment", rows: ["Question", "Made", "Learned"] },
  writing: { name: "Writing", rows: ["Argument", "Written", "Status"] },
}

/**
 * Which of the two chromatics a record's spine takes.
 *
 * Navy marks a record whose material is settled. Red oxide marks one still
 * waiting for real material. The convention carries meaning and must not be
 * used decoratively — see the approved direction.
 */
export type Spine = "set" | "to-come"

// ── Record shape ────────────────────────────────────────────────────────────

export type WorkImage = {
  src: string
  /** Required. An image with no alt text does not ship. */
  alt: string
  caption: string | null
}

export type WorkRecord = {
  slug: string
  kind: WorkKind
  title: string
  /** Present only where the client has given written permission to be named. */
  clientName: string | null
  sector: string | null
  year: string | null
  summary: string | null
  /** The three ledger rows, in the order KIND_LABELS gives for this kind. */
  rows: [string | null, string | null, string | null]
  liveUrl: string | null
  repoUrl: string | null
  cover: WorkImage | null
  images: WorkImage[]
  /** What is still missing, in the owner's words. Rendered as a labelled gap. */
  awaiting: string | null
  /** Position on the homepage hero, 1..5, or null when not in it. */
  heroOrder?: number | null
  /** #RRGGBB brand colour for the hero, or null. */
  brandColour?: string | null
  /** One or two words finishing "I design and build websites for …". */
  heroWord?: string | null
  /** Hero screenshots. Present only with both a public token and alt text. */
  heroDesktop?: HeroShot | null
  heroMobile?: HeroShot | null
}

export type HeroShot = { src: string; alt: string }

/** A record is settled when every one of its three rows has real content. */
export function spineFor(r: WorkRecord): Spine {
  return r.rows.every((v) => v !== null && v !== "") && r.awaiting === null ? "set" : "to-come"
}

// ── Static fallback ─────────────────────────────────────────────────────────

/**
 * Written for a buyer, not an engineer. No module or endpoint counts and no
 * repository paths: they mean nothing to a reader and go stale on every
 * release. Any outcome stated here must have a source in the project's own
 * records (docs/DECISIONS.md D-030 for the accessibility line).
 */
export const fallbackWork: WorkRecord[] = [
  {
    slug: "gakinzos",
    kind: "product",
    title: "GAkinzOS",
    clientName: null,
    sector: "My own studio",
    year: "Ongoing",
    summary:
      "The system I run the studio on. It sits behind this same domain and ships from the same build as the public site.",
    rows: [
      "Client work, invoices, files and support requests lived across separate tools that never spoke to each other, and the admin was quietly eating a day a week.",
      "One private workspace, with access set by each person's role, covering client projects, invoices, files and support requests. It shares a single build with the public site, and client data stays on the server behind it.",
      null,
    ],
    liveUrl: null,
    repoUrl: null,
    cover: null,
    images: [],
    awaiting: "A measured figure for time saved. Nothing is claimed until it is measured.",
  },
  {
    slug: "gakinz-com",
    kind: "experiment",
    title: "gakinz.com, rebuilt in the open",
    clientName: null,
    sector: "This site",
    year: "2026",
    summary: "The site you are reading, and the reason it no longer looks like the one it replaced.",
    rows: [
      "The site it replaced ran the same animated hero on all eight pages, used eight arbitrary heading sizes, and animated a claim of one hundred per cent accessibility that had never been measured.",
      "One type scale and no size outside it. Three design directions taken to finished pages and judged side by side rather than argued about. Every unevidenced claim removed, including that one.",
      "Checked before launch rather than asserted. Automated accessibility and colour contrast checks were run on a build of the site, and they turned up two problems with the visible keyboard focus that the standard checker had not reported. Both were fixed. No test with a real screen reader has been done yet, so the site makes no accessibility claim.",
    ],
    liveUrl: "https://gakinz.com",
    repoUrl: null,
    cover: null,
    images: [],
    awaiting: null,
  },
  {
    slug: "client-work",
    kind: "case_study",
    title: "Client work",
    clientName: null,
    sector: null,
    year: null,
    summary:
      "I have built sites for businesses who have not yet been asked whether they want to be named here. Until each one says yes in writing, this slot stays empty rather than being filled with a description of work you cannot check.",
    rows: [null, null, null],
    liveUrl: null,
    repoUrl: null,
    cover: null,
    images: [],
    awaiting: "Written permission from each client before their name, their site or their numbers appear.",
  },
]

// ── Hooks ───────────────────────────────────────────────────────────────────

type ApiWork = {
  slug: string
  kind: string
  title: string
  client_name?: string | null
  sector?: string | null
  summary?: string | null
  problem?: string | null
  built?: string | null
  outcome?: string | null
  live_url?: string | null
  repo_url?: string | null
  started_on?: string | null
  completed_on?: string | null
  cover?: { share_token?: string | null; alt?: string | null; caption?: string | null } | null
  images?: { share_token?: string | null; alt?: string | null; caption?: string | null }[]
  hero_order?: number | null
  brand_colour?: string | null
  hero_word?: string | null
  hero_desktop?: { share_token?: string | null; alt?: string | null } | null
  hero_mobile?: { share_token?: string | null; alt?: string | null } | null
}

const KINDS: WorkKind[] = ["case_study", "product", "experiment", "writing"]
const asKind = (s: string): WorkKind => (KINDS.includes(s as WorkKind) ? (s as WorkKind) : "case_study")

/** An image only renders when it has both a share token and real alt text. */
function toImage(i: { share_token?: string | null; alt?: string | null; caption?: string | null } | null | undefined): WorkImage | null {
  if (!i?.share_token || !i.alt) return null
  return { src: `/files.php?token=${encodeURIComponent(i.share_token)}`, alt: i.alt, caption: i.caption ?? null }
}

/** A hero screenshot only renders with both a share token and real alt text. */
function toShot(i: { share_token?: string | null; alt?: string | null } | null | undefined): HeroShot | null {
  if (!i?.share_token || !i.alt) return null
  return { src: `/files.php?token=${encodeURIComponent(i.share_token)}`, alt: i.alt }
}

const HEX_COLOUR = /^#[0-9A-Fa-f]{6}$/

/** Normalise one work.php row (list, get or hero) into a WorkRecord. */
export function fromApi(r: ApiWork): WorkRecord {
  const year = (r.completed_on ?? r.started_on ?? "").slice(0, 4) || null
  const rows: [string | null, string | null, string | null] = [
    r.problem || null,
    r.built || null,
    r.outcome || null,
  ]
  const missing = rows.some((v) => v === null)
  return {
    slug: r.slug,
    kind: asKind(r.kind),
    title: r.title,
    clientName: r.client_name || null,
    sector: r.sector || null,
    year,
    summary: r.summary || null,
    rows,
    liveUrl: r.live_url || null,
    repoUrl: r.repo_url || null,
    cover: toImage(r.cover),
    images: (r.images ?? []).map(toImage).filter((i): i is WorkImage => i !== null),
    awaiting: missing ? "Still being written up." : null,
    heroOrder: typeof r.hero_order === "number" ? r.hero_order : null,
    brandColour: r.brand_colour && HEX_COLOUR.test(r.brand_colour) ? r.brand_colour : null,
    heroWord: r.hero_word || null,
    heroDesktop: toShot(r.hero_desktop),
    heroMobile: toShot(r.hero_mobile),
  }
}

/*
 * Publishing is real. A successful CMS answer decides what is shown, including
 * an empty one, so an unpublished record leaves the site. The static records
 * above appear only when the request fails (the endpoint is unreachable, or the
 * table does not exist yet on the live database); see ./cmsResult.ts. Nothing
 * is rendered from them before the request settles, so a withdrawn record
 * never flashes up first.
 */
export function useWork() {
  const [records, setRecords] = useState<WorkRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [fromCms, setFromCms] = useState(false)

  useEffect(() => {
    let alive = true
    workApi
      .list()
      .catch(() => null)
      .then((res) => {
        if (!alive) return
        // WorkSummary is typed loosely in src/lib/api.ts; ApiWork is the shape
        // this page reads.
        const { items, fromCms } = resolveList(res as ApiResult<ApiWork[]> | null, fromApi, fallbackWork)
        setRecords(items)
        setFromCms(fromCms)
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  return { records, loading, fromCms }
}

// One record by slug. A 404 is a real not-found; the static record with that
// slug is used only when the request fails. Keyed by slug, so a previous record
// never shows while the next one loads.
export function useWorkRecord(slug: string | undefined) {
  const [result, setResult] = useState<{ slug: string; record: WorkRecord | null } | null>(null)

  useEffect(() => {
    if (!slug) return
    let alive = true
    workApi
      .get(slug)
      .catch(() => null)
      .then((res) => {
        if (!alive) return
        const fallback = fallbackWork.find((r) => r.slug === slug) ?? null
        setResult({ slug, record: resolveOne(res as ApiResult<ApiWork | null> | null, fromApi, fallback) })
      })
    return () => {
      alive = false
    }
  }, [slug])

  const current = slug && result?.slug === slug ? result : null
  return { record: current ? current.record : null, loading: Boolean(slug) && !current }
}
