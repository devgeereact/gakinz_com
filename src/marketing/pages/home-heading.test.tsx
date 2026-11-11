import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import Home from "./Home"

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"')
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1

describe("the home headline", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
  const h1 = html.match(/<h1([^>]*)>([\s\S]*?)<\/h1>/)
  const text = decode((h1?.[2] ?? "").replace(/<[^>]*>/g, ""))
  const label = decode(h1?.[1].match(/aria-label="([^"]*)"/)?.[1] ?? "")
  const lead = "I design and build websites for"

  it("carries the lead once and the label carries the sentence", () => {
    expect(h1).not.toBeNull()
    // A crawler ignores aria-hidden, so the words inside the tag must not repeat the sentence.
    expect(count(text, lead)).toBe(1)
    const who = [...h1![2].matchAll(/<span data-s="[^"]*">([\s\S]*?)<\/span>/g)].map((m) => decode(m[1].replace(/<[^>]*>/g, "")))
    expect(who.length).toBeGreaterThan(0)
    for (const w of who) expect(count(text, w)).toBe(1)
    expect(h1![2]).not.toContain('class="sr"')
    // The accessible name is the whole sentence, once.
    expect(label).toBe(`${lead} small businesses: ${who.map((w) => w.replace(/\.$/, "")).join(", ")}.`)
  })
})
