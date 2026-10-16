import { describe, expect, it } from "vitest"
import { contentDate, prerenderPaths, render, splitHead } from "@/entry-server"
import { insights } from "@/marketing/data/site"
import { canonicalUrl, checkHeads, isIndexable, readHead } from "./head"

/**
 * Every page the build prerenders, rendered as the build renders it, with its
 * head checked the way the build checks it. A failure here is a failure of
 * `npm run build`, found earlier.
 */
const pages = prerenderPaths().map((path) => ({ path, head: readHead(splitHead(render(path)).head) }))

describe("prerendered page metadata", () => {
  it("is each page's own, with no title, description or canonical shared between pages", () => {
    expect(checkHeads(pages)).toEqual([])
  })

  it("gives every page a canonical at its own URL and leaves every page indexable", () => {
    for (const { path, head } of pages) {
      expect(head.canonical).toBe(canonicalUrl(path))
      expect(isIndexable(head)).toBe(true)
    }
  })

  it("gives every page a description of 50 to 160 characters", () => {
    const outside = pages
      .filter(({ head }) => (head.description ?? "").length < 50 || (head.description ?? "").length > 160)
      .map(({ path, head }) => `${path} (${head.description?.length ?? 0}): ${head.description}`)
    expect(outside).toEqual([])
  })

  it("marks a post as an article", () => {
    for (const p of insights) {
      expect(pages.find(({ path }) => path === `/resources/${p.slug}`)?.head.og.type).toBe("article")
    }
  })
})

describe("contentDate", () => {
  it("dates a post by its own date and nothing else", () => {
    for (const p of insights) expect(contentDate(`/resources/${p.slug}/`)).toBe(p.date)
    expect(contentDate("/work")).toBeNull()
    expect(contentDate("/")).toBeNull()
  })
})
