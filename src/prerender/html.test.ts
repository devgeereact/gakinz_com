import { describe, expect, it } from "vitest"
import { buildPage, buildShell, splitHead, withFontPreloads } from "./html"

const TEMPLATE = `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="UTF-8" />
    <!--seo:start-->
    <title>Default</title>
    <meta name="description" content="Default" />
    <!--seo:end-->
    <link rel="icon" href="/favicon.svg" />
    <script type="module" src="/assets/index.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <!--noscript:start-->
    <noscript><p>Needs JavaScript</p></noscript>
    <!--noscript:end-->
  </body>
</html>`

const MARKUP =
  '<link rel="preload" as="image" href="/a.webp"/><title>Work · Site</title><meta name="description" content="Projects"/>' +
  '<link rel="canonical" href="https://gakinz.com/work"/><script>theme()</script><div class="gk-site"><h1>Work</h1>' +
  '<script type="application/ld+json">{"@type":"Person"}</script><meta itemprop="x" content="in body"/></div>'

describe("splitHead", () => {
  it("takes the leading title, meta and link tags and nothing after them", () => {
    const { head, body } = splitHead(MARKUP)
    expect(head).toEqual([
      '<link rel="preload" as="image" href="/a.webp"/>',
      "<title>Work · Site</title>",
      '<meta name="description" content="Projects"/>',
      '<link rel="canonical" href="https://gakinz.com/work"/>',
    ])
    expect(body.startsWith("<script>theme()</script>")).toBe(true)
    // JSON-LD and anything in the tree stay where React rendered them.
    expect(body).toContain('application/ld+json')
    expect(body).toContain('<meta itemprop="x"')
  })
})

describe("buildPage", () => {
  const html = buildPage(TEMPLATE, { path: "/work", markup: MARKUP })

  it("replaces the default tags with the page's own", () => {
    expect(html).not.toContain("<title>Default</title>")
    expect(html.match(/<title>/g)).toHaveLength(1)
    expect(html.match(/rel="canonical"/g)).toHaveLength(1)
    expect(html).toContain("<title>Work · Site</title>")
    expect(html.indexOf("<title>")).toBeLessThan(html.indexOf("</head>"))
    expect(html).toContain('<link rel="icon" href="/favicon.svg" />')
  })

  it("puts the markup in #root with the path, and drops the noscript notice", () => {
    expect(html).toContain('<div id="root" data-prerendered="/work"><script>theme()</script><div class="gk-site"><h1>Work</h1>')
    expect(html).not.toContain("noscript")
    expect(html).not.toContain("seo:start")
  })

  it("does not read $ in the markup as a replacement pattern", () => {
    const out = buildPage(TEMPLATE, { path: "/pricing", markup: MARKUP.replace("<h1>Work</h1>", () => "<h1>From $& £1,000 $1</h1>") })
    expect(out).toContain("<h1>From $& £1,000 $1</h1>")
  })

  it("refuses a page without exactly one title and one canonical", () => {
    expect(() => buildPage(TEMPLATE, { path: "/x", markup: "<p>Loading…</p>" })).toThrow(/one <title> and one canonical/)
    expect(() => buildPage(TEMPLATE, { path: "/x", markup: MARKUP.replace("<title>", "<title>A</title><title>") })).toThrow()
  })

  it("refuses a template that has lost its markers", () => {
    expect(() => buildPage(TEMPLATE.replace("<!--seo:start-->", ""), { path: "/work", markup: MARKUP })).toThrow(/seo:start/)
  })
})

describe("withFontPreloads", () => {
  it("adds one font preload per file in the head, ahead of the page's tags, for pages and shell alike", () => {
    const t = withFontPreloads(TEMPLATE, ["/assets/a.woff2", "/assets/b.woff2"])
    expect(t.match(/rel="preload" as="font" type="font\/woff2" crossorigin/g)).toHaveLength(2)
    expect(t.indexOf("/assets/a.woff2")).toBeLessThan(t.indexOf("<!--seo:start-->"))
    expect(buildPage(t, { path: "/work", markup: MARKUP })).toContain('href="/assets/b.woff2"')
    expect(buildShell(t)).toContain('href="/assets/a.woff2"')
  })

  it("leaves the template alone when there is nothing to preload", () => {
    expect(withFontPreloads(TEMPLATE, [])).toBe(TEMPLATE)
  })
})

describe("buildShell", () => {
  it("keeps the default head, an empty root and the noscript notice, without the markers", () => {
    const shell = buildShell(TEMPLATE)
    expect(shell).toContain("<title>Default</title>")
    expect(shell).toContain('<div id="root"></div>')
    expect(shell).toContain("<noscript>")
    expect(shell).not.toMatch(/<!--(seo|noscript):/)
  })
})
