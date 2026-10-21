import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it } from "vitest"
import { parseArticle, type Block } from "@/marketing/lib/articleFormat"
import { normaliseMonetisation, setMonetisationForTests } from "@/marketing/lib/monetisation"
import { resetConsentForTests } from "@/marketing/lib/consent"
import AdSlot, { AdSlotView } from "./AdSlot"
import { ArticleBody } from "./ArticleBody"
import { adToShow, requestAdOnce, slotPositions, type AdQueueHost } from "@/marketing/lib/adSlots"

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

  it("renders nothing in the server render even when configured, so prerendered pages never carry a slot", () => {
    setMonetisationForTests(ON)
    expect(renderToStaticMarkup(<AdSlot />)).toBe("")
  })
})

describe("adToShow", () => {
  const configured = normaliseMonetisation(ON)

  it("shows nothing with everything off, whatever the consent", () => {
    const off = normaliseMonetisation(undefined)
    expect(adToShow(off, false)).toBeNull()
    expect(adToShow(off, true)).toBeNull()
  })

  it("shows nothing when configured but the visitor has not consented", () => {
    expect(adToShow(configured, false)).toBeNull()
  })

  it("shows the configured unit once the visitor has consented", () => {
    expect(adToShow(configured, true)).toEqual({ provider: "adsense", clientId: "ca-pub-1234567890123456", slotId: "1234567890" })
  })

  it("shows nothing when AdSense is set but no CMP is, even with a consent signal", () => {
    const noCmp = normaliseMonetisation({ ...ON, consent: { mode: "none", cmp_script_url: "" } })
    expect(noCmp.ads).not.toBeNull()
    expect(adToShow(noCmp, true)).toBeNull()
  })
})

describe("requestAdOnce", () => {
  it("pushes one request per ins element, however often the effect runs", () => {
    const host: AdQueueHost = {}
    const a = { dataset: {} as DOMStringMap }
    const b = { dataset: {} as DOMStringMap }
    expect(requestAdOnce(a, host)).toBe(true)
    expect(requestAdOnce(a, host)).toBe(false)
    expect(requestAdOnce(b, host)).toBe(true)
    expect(host.adsbygoogle).toEqual([{}, {}])
  })

  it("keeps a queue AdSense already created", () => {
    const queue: object[] = [{ earlier: true }]
    const host: AdQueueHost = { adsbygoogle: queue }
    requestAdOnce({ dataset: {} as DOMStringMap }, host)
    expect(host.adsbygoogle).toBe(queue)
    expect(queue).toHaveLength(2)
  })
})

describe("AdSlotView", () => {
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
