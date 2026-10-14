import { useEffect, useState } from "react"
import { siteContent } from "@/lib/api"
import { services as baseServices, packages as basePackages, addOns, paymentTerms, faqs as baseFaqs, processStages, site } from "./site"

/**
 * The copy the CMS can edit (D-044, "Site content").
 *
 * Defaults come from site.ts so the site always has real words to show. When
 * the site_content endpoint answers, each published section replaces its
 * default whole. A section the CMS has never published keeps the default.
 */

export type HeroCopy = { status: string; lead: string; cta1: string; cta2: string; secs: number }
export type ServiceCopy = { slug: string; title: string; summary: string; detail: string; deliverables: string[] }
export type StageCopy = { title: string; detail: string }
export type PackageCopy = { name: string; price: string; best: string; featured: boolean; features: string[] }
export type PairCopy = { name: string; price: string }
export type TermCopy = { stage: string; share: string }
export type FaqCopy = { q: string; a: string }
export type ContactCopy = { email: string; reply: string; footer: string }

export type SiteCopy = {
  hero: HeroCopy
  services: ServiceCopy[]
  process: StageCopy[]
  packages: PackageCopy[]
  addons: PairCopy[]
  terms: TermCopy[]
  faqs: FaqCopy[]
  contact: ContactCopy
}

export const DEFAULT_COPY: SiteCopy = {
  hero: { status: "Designer and developer · London", lead: "I design and build websites for", cta1: "Start a project", cta2: "See all the work", secs: 5.6 },
  services: baseServices.map((s) => ({ slug: s.slug, title: s.title, summary: s.summary, detail: s.detail, deliverables: s.deliverables })),
  process: processStages.map((s) => ({ title: s.title, detail: s.detail })),
  packages: basePackages.map((p) => ({ name: p.name, price: p.price, best: p.best, featured: Boolean(p.featured), features: p.features })),
  addons: addOns.map((a) => ({ name: a.name, price: a.price })),
  terms: paymentTerms.map((t) => ({ stage: t.stage, share: t.share })),
  faqs: baseFaqs.map((f) => ({ q: f.q, a: f.a })),
  contact: { email: site.contact.email, reply: site.contact.replyIntent, footer: "Websites and the systems behind them, for UK small businesses." },
}

const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

/** Raw published sections as the endpoint returns them. Every field is optional and checked. */
export type PublishedSections = Partial<{
  hero: Partial<HeroCopy>
  services: { title?: string; summary?: string }[]
  process: { title?: string; detail?: string }[]
  packages: { name?: string; price?: string; best?: string; featured?: boolean }[]
  addons: { name?: string; price?: string }[]
  terms: { stage?: string; share?: string }[]
  faqs: { q?: string; a?: string }[]
  contact: Partial<ContactCopy>
}>

const str = (v: unknown, d = "") => (typeof v === "string" && v.trim() ? v.trim() : d)
const rows = <T,>(v: unknown): T[] | null => (Array.isArray(v) && v.length ? (v as T[]) : null)

/** Merge published sections over the defaults. Pure, so it is easy to test. */
export function mergeCopy(p: PublishedSections | null | undefined): SiteCopy {
  const d = DEFAULT_COPY
  if (!p) return d
  const h = p.hero ?? {}
  const secs = typeof h.secs === "number" && h.secs >= 4 && h.secs <= 10 ? h.secs : d.hero.secs
  const svc = rows<{ title?: string; summary?: string }>(p.services)
  const pkg = rows<{ name?: string; price?: string; best?: string; featured?: boolean }>(p.packages)
  return {
    hero: { status: str(h.status, d.hero.status), lead: str(h.lead, d.hero.lead), cta1: str(h.cta1, d.hero.cta1), cta2: str(h.cta2, d.hero.cta2), secs },
    services: svc
      ? svc.filter((s) => str(s.title)).map((s) => {
          const known = d.services.find((k) => k.title.toLowerCase() === str(s.title).toLowerCase())
          return { slug: known?.slug ?? slugify(str(s.title)), title: str(s.title), summary: str(s.summary, known?.summary ?? ""), detail: known?.detail ?? str(s.summary), deliverables: known?.deliverables ?? [] }
        })
      : d.services,
    process: rows<{ title?: string; detail?: string }>(p.process)?.filter((s) => str(s.title)).map((s) => ({ title: str(s.title), detail: str(s.detail) })) ?? d.process,
    packages: pkg
      ? pkg.filter((x) => str(x.name)).map((x) => {
          const known = d.packages.find((k) => k.name.toLowerCase() === str(x.name).toLowerCase())
          return { name: str(x.name), price: str(x.price, known?.price ?? "Quoted"), best: str(x.best, known?.best ?? ""), featured: Boolean(x.featured ?? known?.featured), features: known?.features ?? [] }
        })
      : d.packages,
    addons: rows<{ name?: string; price?: string }>(p.addons)?.filter((x) => str(x.name)).map((x) => ({ name: str(x.name), price: str(x.price) })) ?? d.addons,
    terms: rows<{ stage?: string; share?: string }>(p.terms)?.filter((x) => str(x.stage)).map((x) => ({ stage: str(x.stage), share: str(x.share) })) ?? d.terms,
    faqs: rows<{ q?: string; a?: string }>(p.faqs)?.filter((x) => str(x.q)).map((x) => ({ q: str(x.q), a: str(x.a) })) ?? d.faqs,
    contact: { email: str(p.contact?.email, d.contact.email), reply: str(p.contact?.reply, d.contact.reply), footer: str(p.contact?.footer, d.contact.footer) },
  }
}

/** Loader for published sections; null when the endpoint is unavailable. Replaceable in tests. */
let loader: (() => Promise<PublishedSections | null>) | null = () =>
  siteContent.get().then((r) => (r.ok ? (r.data as PublishedSections) : null))
export function setSiteCopyLoader(fn: () => Promise<PublishedSections | null>) {
  loader = fn
}

let cache: SiteCopy | null = null
let pending: Promise<SiteCopy> | null = null

function load(): Promise<SiteCopy> {
  if (cache) return Promise.resolve(cache)
  if (!pending) {
    pending = (loader ? loader().catch(() => null) : Promise.resolve(null)).then((p) => (cache = mergeCopy(p)))
  }
  return pending
}

/** The site's editable copy. Renders defaults at once, then the published copy when it arrives. */
export function useSiteCopy(): SiteCopy {
  const [copy, setCopy] = useState<SiteCopy>(cache ?? DEFAULT_COPY)
  useEffect(() => {
    let live = true
    load().then((c) => live && setCopy(c))
    return () => {
      live = false
    }
  }, [])
  return copy
}
