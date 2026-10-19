import { useEffect, useState } from "react"
import { siteContent, SOCIAL_PLATFORMS, type SiteSocialPlatform } from "@/lib/api"
import { EMAIL_PATTERN, isHttpsUrl, PHONE_PATTERN } from "@/marketing/components/seo-schema"
import { services as baseServices, packages as basePackages, addOns, paymentTerms, faqs as baseFaqs, processStages, site, SERVICE_GROUPS, type ServiceGroup } from "./site"

/**
 * The copy the CMS can edit (D-046, "Site content").
 *
 * Defaults come from site.ts so the site always has real words to show. When
 * the site_content endpoint answers, each published section replaces its
 * default whole. A section the CMS has never published keeps the default.
 */

export type HeroCopy = { status: string; lead: string; cta1: string; cta2: string; secs: number }
export type ServiceCopy = {
  slug: string
  group: ServiceGroup
  title: string
  hook: string
  summary: string
  detail: string
  needs: string[]
  deliverables: string[]
  exclusions: string[]
  price_basis: string
}
export type StageCopy = { title: string; detail: string }
export type PackageCopy = { name: string; price: string; best: string; featured: boolean; features: string[] }
export type PairCopy = { name: string; price: string }
export type TermCopy = { stage: string; share: string }
export type FaqCopy = { q: string; a: string }
export type ContactCopy = { email: string; reply: string; footer: string }

/** How each profile platform is named when its label is left blank. */
export const PLATFORM_LABELS: Record<SiteSocialPlatform, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X",
  youtube: "YouTube",
  tiktok: "TikTok",
  github: "GitHub",
}
export type SocialLink = { platform: string; url: string; label: string }

/**
 * The public business details (D-039, spec 4.4). Nothing is invented: a phone,
 * address, opening note or profile is `null` or empty until the owner has
 * published a real one, and the interface prints nothing for it.
 */
export type BusinessCopy = { email: string; phone: string | null; address: string[]; hours: string | null; social: SocialLink[] }

export type SiteCopy = {
  hero: HeroCopy
  services: ServiceCopy[]
  process: StageCopy[]
  packages: PackageCopy[]
  addons: PairCopy[]
  terms: TermCopy[]
  faqs: FaqCopy[]
  contact: ContactCopy
  business: BusinessCopy
}

export const DEFAULT_COPY: SiteCopy = {
  hero: { status: "Designer and developer · London", lead: "I design and build websites for", cta1: "Start a project", cta2: "See all the work", secs: 5.6 },
  services: baseServices.map((s) => ({
    slug: s.slug,
    group: s.group,
    title: s.title,
    hook: s.hook,
    summary: s.summary,
    detail: s.detail,
    needs: s.needs,
    deliverables: s.deliverables,
    exclusions: s.exclusions,
    price_basis: s.price_basis,
  })),
  process: processStages.map((s) => ({ title: s.title, detail: s.detail })),
  packages: basePackages.map((p) => ({ name: p.name, price: p.price, best: p.best, featured: Boolean(p.featured), features: p.features })),
  addons: addOns.map((a) => ({ name: a.name, price: a.price })),
  terms: paymentTerms.map((t) => ({ stage: t.stage, share: t.share })),
  faqs: baseFaqs.map((f) => ({ q: f.q, a: f.a })),
  contact: { email: site.contact.email, reply: site.contact.replyIntent, footer: "Websites and the systems behind them, for UK small businesses." },
  business: {
    email: site.contact.email,
    phone: site.contact.phone,
    address: [],
    hours: null,
    social: site.social.filter((l) => isHttpsUrl(l.url)).map((l) => ({ platform: "other", url: l.url, label: l.label })),
  },
}

const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

/**
 * A published service row. Rows saved before 2026-10-19 carry only a title and
 * a summary; later rows may carry the full page (server/site.php 'services').
 */
export type PublishedService = {
  slug?: string
  group?: string
  title?: string
  hook?: string
  summary?: string
  detail?: string
  needs?: unknown
  deliverables?: unknown
  exclusions?: unknown
  price_basis?: string
}

/** Raw published sections as the endpoint returns them. Every field is optional and checked. */
export type PublishedSections = Partial<{
  hero: Partial<HeroCopy>
  services: PublishedService[]
  process: { title?: string; detail?: string }[]
  packages: { name?: string; price?: string; best?: string; featured?: boolean }[]
  addons: { name?: string; price?: string }[]
  terms: { stage?: string; share?: string }[]
  faqs: { q?: string; a?: string }[]
  contact: Partial<ContactCopy>
  business: { email?: unknown; phone?: unknown; address?: unknown; hours?: unknown; social?: unknown }
}>

const str = (v: unknown, d = "") => (typeof v === "string" && v.trim() ? v.trim() : d)
const rows = <T,>(v: unknown): T[] | null => (Array.isArray(v) && v.length ? (v as T[]) : null)

const list = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean) : [])
const isGroup = (v: unknown): v is ServiceGroup => SERVICE_GROUPS.some((g) => g.key === v)

/** Names a service had before D-038, so a row published under the old name still finds its page. */
const FORMER_TITLES: Record<string, string> = { "care and support": "care-and-support" }

/** The built-in service a published row stands for: by slug, then by title, then by a former title. */
export function builtInFor(row: PublishedService): ServiceCopy | undefined {
  const slug = str(row.slug)
  const title = str(row.title).toLowerCase()
  return (
    DEFAULT_COPY.services.find((k) => slug && k.slug === slug) ??
    DEFAULT_COPY.services.find((k) => k.title.toLowerCase() === title) ??
    DEFAULT_COPY.services.find((k) => k.slug === FORMER_TITLES[title])
  )
}

/**
 * A published row as a whole service page, or null when it cannot make one.
 * A row with every public field stands on its own. A row without them (the
 * older title-and-summary shape, or an incomplete one) borrows the rest from
 * the built-in service it matches, and is dropped when it matches none, so a
 * half page never appears.
 */
export function serviceFromRow(row: PublishedService): ServiceCopy | null {
  const title = str(row.title)
  if (!title) return null
  const known = builtInFor(row)
  const own = {
    group: isGroup(row.group) ? row.group : null,
    hook: str(row.hook),
    needs: list(row.needs),
    deliverables: list(row.deliverables),
    exclusions: list(row.exclusions),
    price_basis: str(row.price_basis),
  }
  const complete = own.group && own.hook && own.needs.length && own.deliverables.length && own.exclusions.length && own.price_basis
  if (complete && own.group) {
    const summary = str(row.summary, known?.summary ?? "")
    if (!summary) return null
    return { slug: str(row.slug) || known?.slug || slugify(title), title, summary, detail: str(row.detail, known?.detail ?? summary), ...own, group: own.group }
  }
  if (!known) return null
  return { ...known, title, summary: str(row.summary, known.summary) }
}

/**
 * Published services over the built-in six.
 *
 * Rows published before slugs existed (no row has a slug) only edit the
 * built-in services they name, so the six pages stay, in the built-in order,
 * until the owner saves the list again in the CMS (which then upgrades every
 * row to a whole page with a slug). Rows with slugs decide
 * which services show and in what order. An empty result keeps the built-in
 * list rather than a services page with nothing on it.
 */
export function mergeServices(published: unknown): ServiceCopy[] {
  const d = DEFAULT_COPY.services
  const raw = rows<PublishedService>(published)
  if (!raw) return d
  const legacy = !raw.some((r) => r && typeof r === "object" && str(r.slug))
  if (legacy) {
    return d.map((k) => {
      const row = raw.find((r) => r && typeof r === "object" && builtInFor(r)?.slug === k.slug)
      return row ? { ...k, title: str(row.title, k.title), summary: str(row.summary, k.summary) } : k
    })
  }
  const out: ServiceCopy[] = []
  for (const r of raw) {
    const s = r && typeof r === "object" ? serviceFromRow(r) : null
    if (s && !out.some((x) => x.slug === s.slug)) out.push(s)
  }
  return out.length ? out : d
}

/** The services in their two groups, in list order. A group with nothing in it is left out. */
export function groupServices(list: ServiceCopy[]): { key: ServiceGroup; label: string; items: ServiceCopy[] }[] {
  return SERVICE_GROUPS.map((g) => ({ ...g, items: list.filter((s) => s.group === g.key) })).filter((g) => g.items.length > 0)
}

/** The enquiry form's last service choice. */
export const OTHER_SERVICE = "Something else"

/** The enquiry form's service choices: the website's service names, then "Something else". */
export function enquiryServiceOptions(list: ServiceCopy[]): string[] {
  return [...new Set([...list.map((s) => s.title), OTHER_SERVICE])]
}

const isPlatform = (v: unknown): v is SiteSocialPlatform => (SOCIAL_PLATFORMS as readonly string[]).includes(v as string)

/**
 * The published business record over the built-in details. Every field is
 * checked again here, so a profile that is not an https address on a listed
 * platform never reaches a link or structured data. A field left out keeps the
 * built-in value; the enquiry email stands in when no public email is set.
 */
export function mergeBusiness(p: PublishedSections["business"] | null | undefined, contactEmail: string): BusinessCopy {
  const d = DEFAULT_COPY.business
  const b = p && typeof p === "object" ? p : {}
  const email = str(b.email)
  const phone = str(b.phone)
  const address = list(b.address)
  const hours = str(b.hours)
  const seen = new Set<string>()
  const social: SocialLink[] = []
  if (Array.isArray(b.social)) {
    for (const r of b.social as { platform?: unknown; url?: unknown; label?: unknown }[]) {
      if (!r || typeof r !== "object" || !isPlatform(r.platform) || !isHttpsUrl(r.url) || seen.has(r.url)) continue
      seen.add(r.url)
      social.push({ platform: r.platform, url: r.url, label: str(r.label, PLATFORM_LABELS[r.platform]) })
    }
  }
  return {
    email: EMAIL_PATTERN.test(email) ? email : contactEmail,
    phone: PHONE_PATTERN.test(phone) && phone.replace(/\D/g, "").length >= 7 ? phone : d.phone,
    address: address.length ? address : d.address,
    hours: hours || d.hours,
    social: social.length ? social : d.social,
  }
}

/** Merge published sections over the defaults. Pure, so it is easy to test. */
export function mergeCopy(p: PublishedSections | null | undefined): SiteCopy {
  const d = DEFAULT_COPY
  if (!p) return d
  const h = p.hero ?? {}
  const secs = typeof h.secs === "number" && h.secs >= 4 && h.secs <= 10 ? h.secs : d.hero.secs
  const pkg = rows<{ name?: string; price?: string; best?: string; featured?: boolean }>(p.packages)
  const contact = { email: str(p.contact?.email, d.contact.email), reply: str(p.contact?.reply, d.contact.reply), footer: str(p.contact?.footer, d.contact.footer) }
  return {
    hero: { status: str(h.status, d.hero.status), lead: str(h.lead, d.hero.lead), cta1: str(h.cta1, d.hero.cta1), cta2: str(h.cta2, d.hero.cta2), secs },
    services: mergeServices(p.services),
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
    contact,
    business: mergeBusiness(p.business, contact.email),
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
