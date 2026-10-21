import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { buildPage, buildShell, prerenderPaths, render, thirdPartyProblems } from "@/entry-server"
import { setMonetisationForTests } from "@/marketing/lib/monetisation"

/**
 * Task 25: the built site carries no third-party code. Every page the build
 * prerenders is put through the real template exactly as scripts/prerender.mjs
 * does, then checked the way the build checks it.
 */
const template = readFileSync(join(import.meta.dirname, "../../index.html"), "utf8")
const build = () => prerenderPaths().map((path) => ({ path, html: buildPage(template, { path, markup: render(path) }) }))

afterEach(() => setMonetisationForTests())

describe("prerendered pages with the shipped settings", () => {
  const pages = build()

  it("include article pages, so the slot positions are exercised", () => {
    expect(pages.some((p) => p.path.startsWith("/resources/"))).toBe(true)
  })

  it("carry no third-party script, frame, ad slot or consent code", () => {
    const found = pages.flatMap(({ path, html }) => thirdPartyProblems(html).map((p) => `${path}: ${p}`))
    expect(found).toEqual([])
  })

  it("load only the site's own entry script", () => {
    for (const { path, html } of pages) {
      const srcs = [...html.matchAll(/<script\b[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1])
      expect(srcs, path).toEqual(["/src/main.tsx"])
    }
  })

  it("leave the SPA shell clean too", () => {
    expect(thirdPartyProblems(buildShell(template))).toEqual([])
  })
})

describe("prerendered pages with ads and a CMP configured", () => {
  it("are byte for byte the pages built with everything off", () => {
    const off = build()
    setMonetisationForTests({
      ads: { provider: "adsense", client_id: "ca-pub-1234567890123456", slot_id: "1234567890" },
      consent: { mode: "cmp", cmp_script_url: "https://cmp.inmobi.com/choice/abc/gakinz.com/choice.js" },
    })
    const on = build()
    expect(on.map((p) => p.path)).toEqual(off.map((p) => p.path))
    on.forEach((p, i) => expect(p.html, p.path).toBe(off[i].html))
  })
})

describe("thirdPartyProblems", () => {
  it("passes same-origin scripts, inline JSON-LD and ordinary links", () => {
    const html = `<script type="module" src="/assets/index.js"></script><script type="application/ld+json">{"url":"https://gakinz.com"}</script><a href="https://example.com">x</a>`
    expect(thirdPartyProblems(html)).toEqual([])
  })

  it("passes article text and JSON-LD that merely mention ad code or the slot attribute", () => {
    const html = [
      `<p>How adsbygoogle.js and googlesyndication.com work, and what __tcfapi does.</p>`,
      `<p>The attribute data-gk-ad= marks a slot; so does &lt;aside data-gk-ad=&quot;&quot;&gt;.</p>`,
      `<p>&lt;ins class=&quot;adsbygoogle&quot;&gt;</p>`,
      `<script type="application/ld+json">{"headline":"Why adsbygoogle and __tcfapi matter"}</script>`,
    ].join("")
    expect(thirdPartyProblems(html)).toEqual([])
  })

  it("flags absolute script and frame addresses, same-origin ones included, with accurate wording", () => {
    expect(thirdPartyProblems(`<script async src="https://cmp.inmobi.com/x.js"></script>`)).toEqual([
      "<script> with an absolute src (only same-origin paths are allowed): https://cmp.inmobi.com/x.js",
    ])
    expect(thirdPartyProblems(`<script src="https://gakinz.com/assets/x.js"></script>`)[0]).toMatch(/absolute src/)
    expect(thirdPartyProblems(`<SCRIPT src=//cdn.example/x.js></SCRIPT>`)).toHaveLength(1)
    expect(thirdPartyProblems(`<iframe src="https://ads.example/"></iframe>`)).toHaveLength(1)
  })

  it("flags ad code in a same-origin src or an inline script, the slot attributes and an AdSense ins", () => {
    expect(thirdPartyProblems(`<script src="/vendor/adsbygoogle.js"></script>`)).toEqual(["<script> src names ad or consent code: /vendor/adsbygoogle.js"])
    expect(thirdPartyProblems(`<script>window.__tcfapi=1</script>`)).toEqual(["inline <script> names ad or consent code: __tcfapi"])
    expect(thirdPartyProblems(`<script>(adsbygoogle = window.adsbygoogle || []).push({})</script>`)).toHaveLength(1)
    expect(thirdPartyProblems(`<aside class="adslot" data-gk-ad=""></aside>`)).toEqual(["element with data-gk-ad"])
    expect(thirdPartyProblems(`<script data-gk-third-party="x" src="/x.js"></script>`)).toEqual(["element with data-gk-third-party"])
    expect(thirdPartyProblems(`<ins class="adsbygoogle" style="display:block"></ins>`)).toEqual(["AdSense <ins> element"])
  })
})
