import { useEffect, useState } from "react"
import { work as workApi } from "@/lib/api"

/**
 * The work ledger.
 *
 * Records come from the `work` table through server/work.php. When that
 * endpoint is unreachable — or before the table has been created on the live
 * database — the page falls back to the static records below. That is the same
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
}

/** A record is settled when every one of its three rows has real content. */
export function spineFor(r: WorkRecord): Spine {
  return r.rows.every((v) => v !== null && v !== "") && r.awaiting === null ? "set" : "to-come"
}

// ── Static fallback ─────────────────────────────────────────────────────────

/**
 * Figures quoted below are counted from this repository and are re-counted in
 * the release checklist. `qa/RELEASE-CHECKLIST.md` carries the commands. If a
 * number here stops matching the repository, the number is wrong, not the
 * repository.
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
      "One private, role-gated workspace of twenty-four modules over a PHP and MySQL back end, sharing a single build with the public site. Forty server endpoints, and the browser never touches the database.",
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
      "Measured, not asserted: axe-core across sixteen routes returned no violations, and contrast was computed on rendered pixels rather than read off a comment. Two real defects turned up that no automated tool reported. The method and the gaps are published in qa/ACCESSIBILITY-AUDIT.md.",
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
}

const KINDS: WorkKind[] = ["case_study", "product", "experiment", "writing"]
const asKind = (s: string): WorkKind => (KINDS.includes(s as WorkKind) ? (s as WorkKind) : "case_study")

/** An image only renders when it has both a share token and real alt text. */
function toImage(i: { share_token?: string | null; alt?: string | null; caption?: string | null } | null | undefined): WorkImage | null {
  if (!i?.share_token || !i.alt) return null
  return { src: `/files.php?token=${encodeURIComponent(i.share_token)}`, alt: i.alt, caption: i.caption ?? null }
}

function fromApi(r: ApiWork): WorkRecord {
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
  }
}

export function useWork() {
  const [records, setRecords] = useState<WorkRecord[]>(fallbackWork)
  const [loading, setLoading] = useState(true)
  const [fromCms, setFromCms] = useState(false)

  useEffect(() => {
    let alive = true
    workApi
      .list()
      .then((res) => {
        if (!alive) return
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          setRecords((res.data as ApiWork[]).map(fromApi))
          setFromCms(true)
        }
      })
      .catch(() => {
        /* The endpoint is unreachable or the table does not exist yet. The
           static fallback above is already rendered, so the page stays valid. */
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  return { records, loading, fromCms }
}

export function useWorkRecord(slug: string | undefined) {
  const fallback = fallbackWork.find((r) => r.slug === slug) ?? null
  const [record, setRecord] = useState<WorkRecord | null>(fallback)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    if (!slug) {
      setLoading(false)
      return
    }
    workApi
      .get(slug)
      .then((res) => {
        if (!alive) return
        // ApiResult is a discriminated union: `data` only exists on the ok
        // branch, so it must be narrowed before it is read.
        if (!res.ok) return
        const d = res.data as unknown as ApiWork | null
        if (d?.slug) setRecord(fromApi(d))
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [slug])

  return { record, loading }
}
