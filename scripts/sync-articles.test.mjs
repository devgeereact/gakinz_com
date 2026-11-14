import { describe, expect, it } from "vitest"
import { buildSnapshot, postsToInsights, renderInsights, replaceInsights, SITE_FILE } from "./sync-articles.mjs"
import fs from "node:fs"

const list = [
  { slug: "b-post", title: "B \"quoted\" title", excerpt: "Second.", published_at: "2026-07-01 09:30:00" },
  { slug: "a-post", title: "A title", excerpt: null, published_at: "2026-06-20 10:00:00" },
]
const full = {
  "b-post": { ...list[0], body: "Para one.\n\n\nPara two with — a dash.\n\nPara three." },
  "a-post": { ...list[1], body: "Only one." },
}

describe("postsToInsights", () => {
  it("turns CMS JSON into the insights array, verbatim and in the CMS order", () => {
    expect(postsToInsights(list, full)).toEqual([
      { slug: "b-post", title: "B \"quoted\" title", excerpt: "Second.", date: "2026-07-01", body: ["Para one.", "Para two with — a dash.", "Para three."] },
      { slug: "a-post", title: "A title", excerpt: "", date: "2026-06-20", body: ["Only one."] },
    ])
  })
  it("refuses a post it cannot represent", () => {
    expect(() => postsToInsights([{ ...list[0], published_at: null }], full)).toThrow(/no published date/)
    expect(() => postsToInsights([list[0]], { "b-post": { body: " " } })).toThrow(/no body/)
    expect(() => postsToInsights([list[0]], {})).toThrow(/No full post/)
  })
})

describe("renderInsights and replaceInsights", () => {
  const source = `before\n\nexport const insights: Insight[] = [\n  { old: true },\n]\n\nafter\n`
  it("replaces only the array and keeps every other line", () => {
    const next = replaceInsights(source, renderInsights(postsToInsights(list, full)))
    expect(next.startsWith("before\n\nexport const insights: Insight[] = [\n  {\n    slug: \"b-post\"")).toBe(true)
    expect(next.endsWith("\n]\n\nafter\n")).toBe(true)
    expect(next).not.toContain("old: true")
    expect(next).toContain('title: "B \\"quoted\\" title"')
  })
  it("is stable: syncing the same posts twice gives the same text", () => {
    const once = replaceInsights(source, renderInsights(postsToInsights(list, full)))
    expect(replaceInsights(once, renderInsights(postsToInsights(list, full)))).toBe(once)
  })
  it("throws when the array is missing", () => {
    expect(() => replaceInsights("nothing here", "x")).toThrow(/Could not find/)
  })
})

describe("buildSnapshot", () => {
  const source = fs.readFileSync(SITE_FILE, "utf8")
  const fakeFetch = (table) => async (url) => {
    const hit = table[url]
    return hit === undefined ? { ok: false, status: 404, json: async () => ({}) } : { ok: true, status: 200, json: async () => hit }
  }
  it("calls only the two public GET endpoints", async () => {
    const seen = []
    const f = async (url, init) => {
      seen.push([url, init?.method ?? "GET"])
      return fakeFetch({ "https://x.test/blog.php": list, "https://x.test/blog.php?slug=b-post": full["b-post"], "https://x.test/blog.php?slug=a-post": full["a-post"] })(url)
    }
    await buildSnapshot({ origin: "https://x.test", source, fetchFn: f })
    expect(seen.every(([, m]) => m === "GET")).toBe(true)
    expect(seen.map(([u]) => u)).toEqual(["https://x.test/blog.php", "https://x.test/blog.php?slug=b-post", "https://x.test/blog.php?slug=a-post"])
  })
  it("refuses to empty the snapshot when the CMS lists nothing", async () => {
    await expect(buildSnapshot({ origin: "https://x.test", source, fetchFn: fakeFetch({ "https://x.test/blog.php": [] }) })).rejects.toThrow(/refusing/)
  })
  it("is a no-op when the CMS already holds what the snapshot holds (the dry-run promise)", async () => {
    // Rebuild the CMS answer from the committed snapshot itself, then sync it back: nothing may change.
    const { insights } = await import("../src/marketing/data/site.ts")
    const rows = insights.map((p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt, published_at: `${p.date} 00:00:00` }))
    const table = { "https://x.test/blog.php": rows }
    for (const p of insights) table[`https://x.test/blog.php?slug=${p.slug}`] = { body: p.body.join("\n\n") }
    const once = await buildSnapshot({ origin: "https://x.test", source, fetchFn: fakeFetch(table) })
    expect(await buildSnapshot({ origin: "https://x.test", source: once, fetchFn: fakeFetch(table) })).toBe(once)
  })
})
