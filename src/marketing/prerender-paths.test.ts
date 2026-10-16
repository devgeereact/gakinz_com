import { describe, expect, it } from "vitest"
import { normalisePath, outputFile, prerenderPaths, samePath } from "./prerender-paths"
import { SHOWCASE } from "./data/showcase"
import { DEFAULT_COPY } from "./data/content"
import { insights } from "./data/site"

describe("prerenderPaths", () => {
  const paths = prerenderPaths()

  it("covers every fixed public page", () => {
    for (const p of ["/", "/work", "/services", "/pricing", "/about", "/resources", "/contact", "/sectors", "/privacy", "/terms", "/cookies"]) {
      expect(paths).toContain(p)
    }
  })

  it("covers every built-in project, service and post", () => {
    for (const p of SHOWCASE) expect(paths).toContain(`/work/${p.slug}`)
    for (const s of DEFAULT_COPY.services) expect(paths).toContain(`/services/${s.slug}`)
    for (const i of insights) expect(paths).toContain(`/resources/${i.slug}`)
  })

  it("leaves out the client-only and per-record routes", () => {
    expect(paths.some((p) => /^\/(app|login|set-password|p|verify)(\/|$)/.test(p))).toBe(false)
  })

  it("lists each path once, normalised", () => {
    expect(new Set(paths).size).toBe(paths.length)
    for (const p of paths) expect(normalisePath(p)).toBe(p)
  })
})

describe("paths and files", () => {
  it("treats a trailing slash, a query and a hash as the same page", () => {
    expect(normalisePath("/work/")).toBe("/work")
    expect(normalisePath("/work//")).toBe("/work")
    expect(normalisePath("/work?x=1#top")).toBe("/work")
    expect(normalisePath("/")).toBe("/")
    expect(normalisePath("")).toBe("/")
    expect(samePath("/work/rotaflow/", "/work/rotaflow")).toBe(true)
    expect(samePath("/work", "/work/rotaflow")).toBe(false)
  })

  it("writes each page as a directory index", () => {
    expect(outputFile("/")).toBe("index.html")
    expect(outputFile("/work")).toBe("work/index.html")
    expect(outputFile("/work/rotaflow/")).toBe("work/rotaflow/index.html")
  })
})
