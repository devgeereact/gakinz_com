import { describe, expect, it } from "vitest"
import { parseArticle, parseInline, safeHref } from "./articleFormat"

describe("parseArticle: blocks", () => {
  it("splits paragraphs on blank lines and joins wrapped lines with a space", () => {
    expect(parseArticle("First line\nstill first.\n\nSecond.")).toEqual([
      { type: "paragraph", children: [{ type: "text", text: "First line still first." }] },
      { type: "paragraph", children: [{ type: "text", text: "Second." }] },
    ])
  })

  it("reads ## and ### as headings, and leaves other hash counts as prose", () => {
    expect(parseArticle("## Why\n\n### How\n\n# Not a heading\n\n#### Nor this")).toEqual([
      { type: "heading", level: 2, children: [{ type: "text", text: "Why" }] },
      { type: "heading", level: 3, children: [{ type: "text", text: "How" }] },
      { type: "paragraph", children: [{ type: "text", text: "# Not a heading" }] },
      { type: "paragraph", children: [{ type: "text", text: "#### Nor this" }] },
    ])
  })

  it("groups consecutive '- ' lines into one bullet list", () => {
    expect(parseArticle("- one\n- two")).toEqual([
      {
        type: "list",
        ordered: false,
        start: 1,
        items: [[{ type: "text", text: "one" }], [{ type: "text", text: "two" }]],
      },
    ])
  })

  it("groups consecutive '1. ' lines into one numbered list and keeps the first number", () => {
    expect(parseArticle("3. three\n4. four")).toEqual([
      {
        type: "list",
        ordered: true,
        start: 3,
        items: [[{ type: "text", text: "three" }], [{ type: "text", text: "four" }]],
      },
    ])
  })

  it("separates a paragraph, a list and a following paragraph written without blank lines", () => {
    const blocks = parseArticle("Before:\n- a\n1. b\nAfter.")
    expect(blocks.map((b) => (b.type === "list" ? `list:${b.ordered}` : b.type))).toEqual([
      "paragraph",
      "list:false",
      "list:true",
      "paragraph",
    ])
  })

  it("normalises Windows line endings", () => {
    expect(parseArticle("## A\r\n\r\nB")).toHaveLength(2)
  })

  it("returns no blocks for empty or whitespace-only input", () => {
    expect(parseArticle("")).toEqual([])
    expect(parseArticle("  \n\n \t")).toEqual([])
  })
})

describe("parseInline: links", () => {
  it("renders an https link as an external link", () => {
    expect(parseInline("See [the guide](https://example.com/a?b=1) now")).toEqual([
      { type: "text", text: "See " },
      {
        type: "link",
        href: "https://example.com/a?b=1",
        external: true,
        sponsored: false,
        children: [{ type: "text", text: "the guide" }],
      },
      { type: "text", text: " now" },
    ])
  })

  it("allows http and mailto", () => {
    const [http] = parseInline("[a](http://example.com)")
    const [mail] = parseInline("[b](mailto:hello@example.com)")
    expect(http).toMatchObject({ type: "link", href: "http://example.com/", external: true })
    expect(mail).toMatchObject({ type: "link", href: "mailto:hello@example.com", external: false })
  })

  it("keeps one level of balanced parentheses in the address", () => {
    expect(parseInline("[W](https://en.wikipedia.org/wiki/Foo_(bar))")[0]).toMatchObject({
      type: "link",
      href: "https://en.wikipedia.org/wiki/Foo_(bar)",
    })
  })

  it("treats a link to gakinz.com as internal", () => {
    expect(parseInline("[contact](https://gakinz.com/contact)")[0]).toMatchObject({
      type: "link",
      external: false,
    })
  })

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD4=",
    "vbscript:msgbox",
    "file:///etc/passwd",
    "/relative/path",
    "//example.com",
    "ftp://example.com",
  ])("renders the label as plain text for a disallowed URL: %s", (url) => {
    expect(parseInline(`go [here](${url}) now`)).toEqual([{ type: "text", text: "go here now" }])
  })

  it("marks a {sponsored} link and consumes the marker", () => {
    expect(parseInline("[Buy](https://www.amazon.co.uk/dp/X){sponsored}.")).toEqual([
      {
        type: "link",
        href: "https://www.amazon.co.uk/dp/X",
        external: true,
        sponsored: true,
        children: [{ type: "text", text: "Buy" }],
      },
      { type: "text", text: "." },
    ])
  })

  it("drops the {sponsored} marker with a disallowed URL", () => {
    expect(parseInline("[x](javascript:void0){sponsored}")).toEqual([{ type: "text", text: "x" }])
  })

  it("allows bold inside link text", () => {
    expect(parseInline("[**big** deal](https://example.com)")[0]).toMatchObject({
      type: "link",
      children: [
        { type: "bold", children: [{ type: "text", text: "big" }] },
        { type: "text", text: " deal" },
      ],
    })
  })

  it("does not nest a link inside link text", () => {
    const out = parseInline("[[a](https://x.com)](https://y.com)")
    expect(out.filter((n) => n.type === "link")).toHaveLength(1)
  })
})

describe("parseInline: bold", () => {
  it("renders **bold**", () => {
    expect(parseInline("a **b** c")).toEqual([
      { type: "text", text: "a " },
      { type: "bold", children: [{ type: "text", text: "b" }] },
      { type: "text", text: " c" },
    ])
  })

  it("allows a link inside bold", () => {
    expect(parseInline("**see [x](https://example.com)**")[0]).toMatchObject({
      type: "bold",
      children: [{ type: "text", text: "see " }, { type: "link", href: "https://example.com/" }],
    })
  })

  it("leaves an unclosed or empty marker as literal text", () => {
    expect(parseInline("a ** b")).toEqual([{ type: "text", text: "a ** b" }])
    expect(parseInline("****")).toEqual([{ type: "text", text: "****" }])
  })
})

describe("malformed input", () => {
  it.each([
    "[",
    "[a](",
    "[a](https://example.com",
    "](https://example.com)",
    "[](https://example.com)",
    "**[a](https://x.com",
    "- ",
    "1.",
    "##",
    "[a](https://exa mple.com)",
    "<script>alert(1)</script>",
    "[a](https://[::1)",
  ])("does not throw on %j", (s) => {
    expect(() => parseArticle(s)).not.toThrow()
  })

  it("keeps HTML as plain text rather than markup", () => {
    expect(parseInline("<b>hi</b>")).toEqual([{ type: "text", text: "<b>hi</b>" }])
  })

  it("handles a long run of brackets and asterisks quickly", () => {
    const s = "[".repeat(5000) + "*".repeat(5000)
    const t = Date.now()
    parseArticle(s)
    expect(Date.now() - t).toBeLessThan(1000)
  })
})

describe("safeHref", () => {
  it("returns the normalised URL for allowed schemes", () => {
    expect(safeHref("https://example.com")).toBe("https://example.com/")
    expect(safeHref("mailto:a@b.co")).toBe("mailto:a@b.co")
  })

  it("rejects everything else", () => {
    expect(safeHref("java\tscript:alert(1)")).toBeNull()
    expect(safeHref("not a url")).toBeNull()
    expect(safeHref("")).toBeNull()
  })
})
