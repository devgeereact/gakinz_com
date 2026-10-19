import { describe, expect, it } from "vitest"
import { parseArticle } from "./articleFormat"

const wrap = (inner: string) => `:::recommend\n${inner}\n:::`

describe("parseArticle: recommendation blocks", () => {
  it("parses a valid block into a typed node, with the note read as inline text", () => {
    const [b] = parseArticle(
      wrap("title: Fathom\nurl: https://usefathom.com/\nnote: Simple **privacy-first** stats.\naffiliate: yes"),
    )
    expect(b).toEqual({
      type: "recommend",
      title: "Fathom",
      href: "https://usefathom.com/",
      note: [
        { type: "text", text: "Simple " },
        { type: "bold", children: [{ type: "text", text: "privacy-first" }] },
        { type: "text", text: " stats." },
      ],
      external: true,
      affiliate: true,
    })
  })

  it("is not affiliate unless the flag says yes, and ignores unknown keys", () => {
    const [a] = parseArticle(wrap("title: A\nurl: http://a.example/x\nmood: cheerful"))
    expect(a).toMatchObject({ type: "recommend", affiliate: false, href: "http://a.example/x", note: [] })
    const [b] = parseArticle(wrap("title: B\nurl: https://b.example/\naffiliate: no"))
    expect(b).toMatchObject({ affiliate: false })
  })

  it("refuses a javascript:, data:, mailto: or relative address and prints plain paragraphs", () => {
    for (const url of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "  javascript:alert(1)",
      "java\tscript:alert(1)",
      "&#106;avascript:alert(1)",
      "//evil.example",
      "/relative",
      "data:text/html,x",
      "mailto:a@b.c",
    ]) {
      const out = parseArticle(wrap(`title: Bad\nurl: ${url}`))
      expect(out).toEqual([
        { type: "paragraph", children: [{ type: "text", text: "title: Bad" }] },
        { type: "paragraph", children: [{ type: "text", text: `url: ${url}` }] },
      ])
    }
  })

  it("treats a block with no title, or no url, as plain paragraphs", () => {
    expect(parseArticle(wrap("url: https://x.example/")).map((b) => b.type)).toEqual(["paragraph"])
    expect(parseArticle(wrap("title: Only a title")).map((b) => b.type)).toEqual(["paragraph"])
  })

  it("leaves an unclosed opening fence as ordinary text and keeps later blocks intact", () => {
    const out = parseArticle(":::recommend\ntitle: X\n\n## After")
    expect(out.map((b) => b.type)).toEqual(["paragraph", "heading"])
  })

  it("does not let an unclosed block borrow the closing line of a later block", () => {
    const out = parseArticle(":::recommend\ntitle: Lost\n\n" + wrap("title: Kept\nurl: https://k.example/"))
    const recs = out.filter((b) => b.type === "recommend")
    expect(recs).toHaveLength(1)
    expect(recs[0]).toMatchObject({ title: "Kept" })
    expect(out[0]).toEqual({ type: "paragraph", children: [{ type: "text", text: ":::recommend title: Lost" }] })
  })

  it("marks own-site addresses as not external", () => {
    const [b] = parseArticle(wrap("title: Home\nurl: https://www.gakinz.com/work"))
    expect(b).toMatchObject({ external: false })
  })

  it("closes the paragraph and list before it, and text after still parses", () => {
    const out = parseArticle("Intro\n- one\n" + wrap("title: T\nurl: https://t.example/") + "\nOutro")
    expect(out.map((b) => b.type)).toEqual(["paragraph", "list", "recommend", "paragraph"])
  })
})
