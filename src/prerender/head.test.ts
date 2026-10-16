import { describe, expect, it } from "vitest"
import { canonicalUrl, checkHeads, isIndexable, readHead } from "./head"

const tags = (path: string, title: string, description: string, extra: string[] = []) => {
  const url = canonicalUrl(path)
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}"/>`,
    `<link rel="canonical" href="${url}"/>`,
    ...extra,
    `<meta property="og:title" content="${title}"/>`,
    `<meta property="og:description" content="${description}"/>`,
    `<meta property="og:url" content="${url}"/>`,
    `<meta property="og:image" content="https://gakinz.com/og.png"/>`,
    `<meta name="twitter:card" content="summary_large_image"/>`,
    `<meta name="twitter:title" content="${title}"/>`,
    `<meta name="twitter:description" content="${description}"/>`,
    `<meta name="twitter:image" content="https://gakinz.com/og.png"/>`,
  ]
}

const NOINDEX = '<meta name="robots" content="noindex, follow"/>'

describe("readHead", () => {
  it("reads the title, description, canonical, robots and social tags, decoding entities", () => {
    const h = readHead(tags("/work", "Work · Gideon", "Sites &amp; &quot;apps&quot;", [NOINDEX]))
    expect(h.title).toBe("Work · Gideon")
    expect(h.description).toBe('Sites & "apps"')
    expect(h.canonical).toBe("https://gakinz.com/work")
    expect(h.og.url).toBe("https://gakinz.com/work")
    expect(h.twitter.card).toBe("summary_large_image")
    expect(isIndexable(h)).toBe(false)
  })
})

describe("canonicalUrl", () => {
  it("keeps the home page's slash and adds none elsewhere", () => {
    expect(canonicalUrl("/")).toBe("https://gakinz.com/")
    expect(canonicalUrl("/work/rotaflow")).toBe("https://gakinz.com/work/rotaflow")
  })
})

describe("checkHeads", () => {
  it("passes a set of pages whose metadata is their own", () => {
    expect(
      checkHeads([
        { path: "/", head: readHead(tags("/", "Home", "The home page.")) },
        { path: "/work", head: readHead(tags("/work", "Work", "The work.")) },
      ]),
    ).toEqual([])
  })

  it("reports a canonical and og:url that belong to another page", () => {
    const head = readHead(tags("/work", "Work", "The work."))
    const problems = checkHeads([{ path: "/about", head }])
    expect(problems).toContain("/about: canonical is https://gakinz.com/work, expected https://gakinz.com/about")
    expect(problems).toContain("/about: og:url is https://gakinz.com/work, expected https://gakinz.com/about")
  })

  it("reports social titles that differ from the title", () => {
    const head = readHead(tags("/work", "Work", "The work.").map((t) => t.replace('og:title" content="Work', 'og:title" content="Home')))
    expect(checkHeads([{ path: "/work", head }])).toEqual(["/work: og:title differs from <title>"])
  })

  it("reports two indexable pages sharing a title or description, but not a noindex page", () => {
    const problems = checkHeads([
      { path: "/a", head: readHead(tags("/a", "Same", "Same words.")) },
      { path: "/b", head: readHead(tags("/b", "Same", "Same words.")) },
      { path: "/c", head: readHead(tags("/c", "Same", "Same words.", [NOINDEX])) },
    ])
    expect(problems).toEqual(["/b: same title as /a", "/b: same description as /a"])
  })

  it("reports a missing description", () => {
    const head = readHead(tags("/a", "A", "x").filter((t) => !t.includes('name="description"')))
    expect(checkHeads([{ path: "/a", head }])).toContain("/a: no description")
  })
})
