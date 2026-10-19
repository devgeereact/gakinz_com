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
    for (const url of ["javascript:alert(1)", "data:text/html,x", "mailto:a@b.co", "/relative"]) {
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

  it("closes the paragraph and list before it, and text after still parses", () => {
    const out = parseArticle("Intro\n- one\n" + wrap("title: T\nurl: https://t.example/") + "\nOutro")
    expect(out.map((b) => b.type)).toEqual(["paragraph", "list", "recommend", "paragraph"])
  })
})
