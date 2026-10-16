/**
 * Reads and checks the head tags of each prerendered page (scripts/prerender.mjs).
 * Pure, so it is unit tested (head.test.ts) and also run over every real page
 * (pages.test.tsx) without a build.
 *
 * buildPage() already refuses a page without exactly one <title> and one
 * canonical. checkHeads() goes further: every page's metadata must be its own
 * (canonical and og:url equal to the page's URL, the social titles equal to the
 * <title>), and no two indexable pages may share a title, a description or a
 * canonical. The build fails on any problem it reports.
 */

export const SITE_ORIGIN = "https://gakinz.com"

export type PageHead = {
  title: string
  description: string | null
  canonical: string | null
  robots: string | null
  og: Record<string, string>
  twitter: Record<string, string>
}

const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag)
  return m ? decode(m[1]) : null
}

/** The tags splitHead() took off the front of a page's markup, as fields. */
export function readHead(head: string[]): PageHead {
  const out: PageHead = { title: "", description: null, canonical: null, robots: null, og: {}, twitter: {} }
  for (const tag of head) {
    if (tag.startsWith("<title")) {
      out.title = decode(tag.replace(/^<title\b[^>]*>/, "").replace(/<\/title>$/, ""))
    } else if (tag.startsWith("<link") && attr(tag, "rel") === "canonical") {
      out.canonical = attr(tag, "href")
    } else if (tag.startsWith("<meta")) {
      const name = attr(tag, "name")
      const property = attr(tag, "property")
      const content = attr(tag, "content") ?? ""
      if (name === "description") out.description = content
      else if (name === "robots") out.robots = content
      else if (name?.startsWith("twitter:")) out.twitter[name.slice(8)] = content
      else if (property?.startsWith("og:")) out.og[property.slice(3)] = content
    }
  }
  return out
}

/** The absolute URL a path is canonical at: no trailing slash, except the home page. */
export const canonicalUrl = (path: string) => (path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`)

export const isIndexable = (h: PageHead) => !/\bnoindex\b/i.test(h.robots ?? "")

/** Every problem with the pages' metadata, one line each. An empty list means the set is sound. */
export function checkHeads(pages: { path: string; head: PageHead }[]): string[] {
  const problems: string[] = []
  const seen = { title: new Map<string, string>(), description: new Map<string, string>(), canonical: new Map<string, string>() }

  for (const { path, head: h } of pages) {
    const url = canonicalUrl(path)
    const say = (msg: string) => problems.push(`${path}: ${msg}`)
    if (!h.title.trim()) say("empty <title>")
    if (!h.description?.trim()) say("no description")
    if (h.canonical !== url) say(`canonical is ${h.canonical}, expected ${url}`)
    if (h.og.url !== url) say(`og:url is ${h.og.url}, expected ${url}`)
    if (h.og.title !== h.title) say("og:title differs from <title>")
    if (h.twitter.title !== h.title) say("twitter:title differs from <title>")
    if (h.og.description !== h.description) say("og:description differs from the description")
    if (h.twitter.description !== h.description) say("twitter:description differs from the description")
    if (!h.og.image || !h.twitter.image) say("no og:image or twitter:image")
    if (!h.twitter.card) say("no twitter:card")
    if (!isIndexable(h)) continue
    for (const key of ["title", "description", "canonical"] as const) {
      const value = h[key]
      if (!value) continue
      const other = seen[key].get(value)
      if (other) say(`same ${key} as ${other}`)
      else seen[key].set(value, path)
    }
  }
  return problems
}
