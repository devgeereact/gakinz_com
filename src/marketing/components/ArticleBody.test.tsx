import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { parseArticle } from "@/marketing/lib/articleFormat"
import { AFFILIATE_DISCLOSURE_GAP, ArticleBody } from "./ArticleBody"

const html = (body: string) => renderToStaticMarkup(<ArticleBody blocks={parseArticle(body)} />)
const rec = (title: string, extra = "") =>
  `:::recommend\ntitle: ${title}\nurl: https://${title.toLowerCase()}.example/\n${extra}\n:::`

describe("ArticleBody: recommendation cards", () => {
  it("renders an affiliate item with sponsored nofollow, a visible label and the disclosure gap", () => {
    const out = html(rec("Alpha", "note: Good.\naffiliate: yes"))
    expect(out).toContain('rel="sponsored nofollow noopener noreferrer"')
    expect(out).toContain("Affiliate link")
    expect(out).toContain(`<span class="gap">${AFFILIATE_DISCLOSURE_GAP}</span>`)
    expect(out).toContain('href="https://alpha.example/"')
  })

  it("renders a plain item without sponsored, nofollow, label or disclosure", () => {
    const out = html(rec("Beta", "note: Fine."))
    expect(out).toContain('rel="noopener noreferrer"')
    expect(out).not.toContain("sponsored")
    expect(out).not.toContain("nofollow")
    expect(out).not.toContain("Affiliate link")
    expect(out).not.toContain('class="gap"')
  })

  it("shows the disclosure marker once per post, above the first block, even with several affiliate items", () => {
    const out = html(`${rec("One")}\n\n${rec("Two", "affiliate: yes")}\n\n${rec("Three", "affiliate: yes")}`)
    expect(out.split(AFFILIATE_DISCLOSURE_GAP).length - 1).toBe(1)
    expect(out.indexOf(AFFILIATE_DISCLOSURE_GAP)).toBeLessThan(out.indexOf("one.example"))
    expect((out.match(/Affiliate link/g) ?? []).length).toBe(2)
  })

  it("opens an own-site recommendation in the same tab, without the new-tab text", () => {
    const out = html(":::recommend\ntitle: Home\nurl: https://gakinz.com/work\n:::")
    expect(out).toContain('href="https://gakinz.com/work"')
    expect(out).not.toContain("_blank")
    expect(out).not.toContain("new tab")
  })

  it("never emits an author-supplied javascript: address or raw markup", () => {
    const out = html(":::recommend\ntitle: <script>x</script>\nurl: javascript:alert(1)\n:::")
    expect(out).not.toContain("<script>")
    expect(out).not.toContain("href=")
    expect(out).toContain("&lt;script&gt;")
  })
})
