import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { DEFAULT_COPY, mergeBusiness } from "@/marketing/data/content"
import { BusinessDetails } from "./site-ui"
import { telHref } from "./site-helpers"
import { isHttpsUrl, jsonLdString } from "./seo-schema"

const html = (business: Parameters<typeof BusinessDetails>[0]["business"]) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <BusinessDetails business={business} />
    </MemoryRouter>,
  )

describe("BusinessDetails", () => {
  it("prints nothing at all before the owner has published any detail (no placeholders)", () => {
    expect(html(DEFAULT_COPY.business)).toBe("")
  })

  it("prints only the published fields, with a tel link and profile links", () => {
    const out = html(
      mergeBusiness({ phone: "+44 20 7946 0000", hours: "Weekdays", social: [{ platform: "github", url: "https://github.com/example" }] }, "a@b.co"),
    )
    expect(out).toContain('href="tel:+442079460000"')
    expect(out).toContain("Weekdays")
    expect(out).toContain('href="https://github.com/example"')
    expect(out).toContain(">GitHub<")
    expect(out).not.toContain("<span style")
  })

  it("lists each address line on its own line", () => {
    const out = html(mergeBusiness({ address: ["1 Example Street", "London"] }, "a@b.co"))
    expect(out).toContain("1 Example Street")
    expect(out.match(/<span style/g)).toHaveLength(2)
  })

  it("never links an unsafe profile address that reached it", () => {
    const out = html(mergeBusiness({ social: [{ platform: "x", url: "javascript:alert(1)" }, { platform: "x", url: "http://x.com/a" }] }, "a@b.co"))
    expect(out).toBe("")
  })

  it("keeps the leading plus and drops spaces and brackets in a tel link", () => {
    expect(telHref("+44 (0)20 7946 0000")).toBe("tel:+4402079460000")
  })
})

describe("hostile profile addresses", () => {
  const hostile = ["https://x.com/</script><script>alert(1)</script>", 'https://x.com/a"b', "https://x.com/a`b", "https://x.com/a\\b", "https://x.com/a<b", "https://x.com/a\u2028b", "https://x.com/a\u0007b"]

  it("are refused by isHttpsUrl and dropped by the merge", () => {
    for (const url of hostile) {
      expect(isHttpsUrl(url), JSON.stringify(url)).toBe(false)
      expect(mergeBusiness({ social: [{ platform: "x", url }] }, "a@b.co").social).toEqual([])
    }
  })

  it("cannot close the JSON-LD script tag even if a value reaches it", () => {
    const out = jsonLdString({ sameAs: ["https://x.com/</script><script>alert(1)</script>"], note: "a&b \u2028 \u2029 >" })
    expect(out).not.toMatch(/[<>&\u2028\u2029]/)
    expect(out.toLowerCase()).not.toContain("</script")
    expect(JSON.parse(out).sameAs[0]).toBe("https://x.com/</script><script>alert(1)</script>")
  })
})
