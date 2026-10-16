import { describe, expect, it } from "vitest"
import { buildSitemap } from "./sitemap"

describe("buildSitemap", () => {
  const xml = buildSitemap([
    { loc: "https://gakinz.com/", lastmod: "2026-10-16" },
    { loc: "https://gakinz.com/resources/a&b", lastmod: "2026-05-12" },
  ])

  it("writes one <url> per entry with its loc and lastmod, escaped", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true)
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml.match(/<url>/g)).toHaveLength(2)
    expect(xml).toContain("<loc>https://gakinz.com/resources/a&amp;b</loc>\n    <lastmod>2026-05-12</lastmod>")
  })

  it("is well-formed XML", () => {
    // DOMParser is not in the node test environment, so check nesting by hand:
    // every element opened is closed in order, and no bare ampersand is left.
    const stack: string[] = []
    const body = xml.replace(/<\?xml[^>]*\?>|<!--[\s\S]*?-->/g, "")
    for (const [, close, name] of body.matchAll(/<(\/?)([a-z]+)[^>]*>/g)) {
      if (close) expect(stack.pop()).toBe(name)
      else stack.push(name)
    }
    expect(stack).toEqual([])
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/)
  })

  it("refuses a relative or foreign URL, a bad date and a duplicate", () => {
    expect(() => buildSitemap([{ loc: "/work", lastmod: "2026-10-16" }])).toThrow(/absolute/)
    expect(() => buildSitemap([{ loc: "http://gakinz.com/work", lastmod: "2026-10-16" }])).toThrow(/absolute/)
    expect(() => buildSitemap([{ loc: "https://gakinz.com/work", lastmod: "16/10/2026" }])).toThrow(/lastmod/)
    const twice = { loc: "https://gakinz.com/work", lastmod: "2026-10-16" }
    expect(() => buildSitemap([twice, twice])).toThrow(/twice/)
  })
})
