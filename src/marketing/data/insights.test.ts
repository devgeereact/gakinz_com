import { describe, expect, it } from "vitest"
import { prerenderPaths } from "@/marketing/prerender-paths"
import { insights } from "./site"

// A snapshot of GET https://gakinz.com/blog.php on 2026-11-11 (K-147). When the CMS posts change, change this list and
// the articles in site.ts together; `pnpm run check:live` reports a sitemap article the live CMS does not hold.
const CMS_SLUGS = ["fixed-price-how-we-scope", "what-makes-a-website-fast", "why-one-team-design-and-build"]

describe("the built-in articles", () => {
  it("are exactly the posts the live CMS holds", () => {
    expect(insights.map((i) => i.slug)).toEqual(CMS_SLUGS)
  })

  it("each carry the CMS date and four paragraphs", () => {
    for (const i of insights) {
      expect(i.date, i.slug).toBe("2026-06-20")
      expect(i.body, i.slug).toHaveLength(4)
      expect(i.body.every((p) => p.trim().length > 0 && !p.includes("\n")), i.slug).toBe(true)
    }
  })

  it("are the pages the prerender lists, and no others", () => {
    const articles = prerenderPaths().filter((p) => p.startsWith("/resources/"))
    expect(articles).toEqual(CMS_SLUGS.map((s) => `/resources/${s}`))
  })
})
