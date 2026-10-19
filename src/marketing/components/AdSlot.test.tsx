import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it } from "vitest"
import { parseArticle, type Block } from "@/marketing/lib/articleFormat"
import { setMonetisationForTests } from "@/marketing/lib/monetisation"
import { resetConsentForTests } from "@/marketing/lib/consent"
import AdSlot, { AdSlotView } from "./AdSlot"
import { ArticleBody } from "./ArticleBody"
import { slotPositions } from "@/marketing/lib/adSlots"

const ON = {
  ads: { provider: "adsense", client_id: "ca-pub-1234567890123456", slot_id: "1234567890" },
  consent: { mode: "cmp", cmp_script_url: "https://cmp.inmobi.com/choice/abc/gakinz.com/choice.js" },
}
const paras = (n: number) => Array.from({ length: n }, (_, i) => `Paragraph ${i + 1}.`).join("\n\n")

afterEach(() => {
  setMonetisationForTests()
  resetConsentForTests()
})

describe("AdSlot", () => {
  it("renders nothing with the shipped settings", () => {
    expect(renderToStaticMarkup(<AdSlot />)).toBe("")
  })

  it("renders nothing when configured but consent is not known", () => {
    setMonetisationForTests(ON)
    expect(renderToStaticMarkup(<AdSlot />)).toBe("")
  })

  it("draws a labelled unit with the configured publisher and slot", () => {
    const out = renderToStaticMarkup(<AdSlotView clientId="ca-pub-1234567890123456" slotId="1234567890" />)
    expect(out).toContain('aria-label="Advertisement"')
    expect(out).toContain(">Advertisement</p>")
    expect(out).toContain('class="adsbygoogle"')
    expect(out).toContain('data-ad-client="ca-pub-1234567890123456"')
    expect(out).toContain('data-ad-slot="1234567890"')
    expect(out).not.toContain("<script")
  })
})

describe("slotPositions", () => {
  const blocks = (body: string): Block[] => parseArticle(body)

  it("places at most two slots, after the third and eighth paragraphs", () => {
    const b = blocks(paras(12))
    expect(slotPositions(b)).toEqual([2, 7])
  })

  it("never places a slot after the last block or in a short article", () => {
    expect(slotPositions(blocks(paras(3)))).toEqual([])
    expect(slotPositions(blocks(paras(2)))).toEqual([])
    expect(slotPositions(blocks(paras(8)))).toEqual([2])
  })

  it("counts paragraphs only, not headings or lists", () => {
    const b = blocks(`## Intro\n\nOne.\n\n- a\n- b\n\nTwo.\n\nThree.\n\nFour.`)
    const at = slotPositions(b)
    expect(at).toHaveLength(1)
    expect(b[at[0]]).toEqual(parseArticle("Three.")[0])
  })
})

describe("ArticleBody with a slot", () => {
  it("is unchanged when no slot is passed", () => {
    const b = parseArticle(paras(10))
    expect(renderToStaticMarkup(<ArticleBody blocks={b} />)).toBe(b.map((_, i) => `<p>Paragraph ${i + 1}.</p>`).join(""))
  })

  it("inserts the slot between paragraphs at each position", () => {
    const out = renderToStaticMarkup(<ArticleBody blocks={parseArticle(paras(10))} slot={(n) => <hr data-n={n} />} />)
    expect(out).toContain('<p>Paragraph 3.</p><hr data-n="0"/><p>Paragraph 4.</p>')
    expect(out).toContain('<p>Paragraph 8.</p><hr data-n="1"/><p>Paragraph 9.</p>')
    expect(out.match(/<hr/g)).toHaveLength(2)
  })
})
