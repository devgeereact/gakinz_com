/**
 * String surgery for the build-time prerender (scripts/prerender.mjs). Pure,
 * so it is unit tested (html.test.ts) without a build.
 *
 * React 19 hoists <title>, <meta> and <link> wherever Seo.tsx declares them.
 * renderToString cannot reach the document head, so it writes them as a run at
 * the very start of its output, ahead of the tree, together with a preload
 * <link> for each eager image. splitHead() takes that run off the front;
 * buildPage() puts it in the template's head in place of the default tags.
 *
 * JSON-LD is an ordinary <script> to React, so it renders in place inside the
 * page and is left there: it is valid anywhere in the document, and moving it
 * would make the markup differ from what the browser hydrates.
 */

const LEADING_TAG = /^(?:<title\b[^>]*>[\s\S]*?<\/title>|<meta\b[^>]*>|<link\b[^>]*>)/

export function splitHead(markup: string): { head: string[]; body: string } {
  const head: string[] = []
  let rest = markup
  for (let m = LEADING_TAG.exec(rest); m; m = LEADING_TAG.exec(rest)) {
    head.push(m[0])
    rest = rest.slice(m[0].length)
  }
  return { head, body: rest }
}

const SEO_BLOCK = /[ \t]*<!--seo:start-->[\s\S]*?<!--seo:end-->/
const NOSCRIPT_BLOCK = /[ \t]*<!--noscript:start-->[\s\S]*?<!--noscript:end-->\n?/
const ROOT = '<div id="root"></div>'

const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")

/** Fails loudly when index.html has lost a marker, rather than shipping a page with two sets of tags. */
function assertTemplate(template: string) {
  if (!SEO_BLOCK.test(template)) throw new Error("index.html has no <!--seo:start--> ... <!--seo:end--> block")
  if (!template.includes(ROOT)) throw new Error(`index.html has no empty ${ROOT}`)
}

/**
 * A prerendered page: the page's own head tags in place of the defaults, the
 * markup inside #root with the path it was rendered for, and no <noscript>
 * notice, since the page no longer needs JavaScript to be read.
 */
export function buildPage(template: string, page: { path: string; markup: string }): string {
  assertTemplate(template)
  const { head, body } = splitHead(page.markup)
  const titles = head.filter((t) => t.startsWith("<title")).length
  const canonicals = head.filter((t) => /rel="canonical"/.test(t)).length
  if (titles !== 1 || canonicals !== 1) {
    throw new Error(`${page.path}: expected one <title> and one canonical, found ${titles} and ${canonicals}`)
  }
  return template
    .replace(SEO_BLOCK, () => "    " + head.join("\n    "))
    .replace(NOSCRIPT_BLOCK, "")
    .replace(ROOT, () => `<div id="root" data-prerendered="${escapeAttr(page.path)}">${body}</div>`)
}

/**
 * Preload the fonts the first screen is set in, ahead of everything else in
 * the head. A prerendered page paints before JavaScript runs, so if a face
 * arrives after that first paint, font-display: swap reflows the hero and moves
 * everything under it (K-052). The files are hashed by Vite, so the caller finds
 * them in dist/assets.
 */
export function withFontPreloads(template: string, hrefs: string[]): string {
  assertTemplate(template)
  if (!hrefs.length) return template
  const links = hrefs.map((h) => `<link rel="preload" as="font" type="font/woff2" crossorigin href="${escapeAttr(h)}" />`)
  return template.replace(/([ \t]*)<!--seo:start-->/, (_, indent: string) => links.map((l) => indent + l).join("\n") + "\n" + indent + "<!--seo:start-->")
}

/** The SPA shell for every path that is not prerendered: the default head, an empty #root, the <noscript> notice. */
export function buildShell(template: string): string {
  assertTemplate(template)
  return template.replace(/[ \t]*<!--(seo|noscript):(start|end)-->\n?/g, "")
}

/**
 * Third-party code in a built page (Task 25). The public site ships with
 * advertising and consent switched off, and even when they are on, both load
 * only in the browser after the page runs. So a built page must contain no
 * script or frame with an absolute address, no AdSense or CMP code and no ad
 * slot. The prerender fails the build on any of them. Returns one line per
 * problem.
 *
 * Only markup is checked, never article text: words such as "adsbygoogle" in a
 * paragraph, or in an Article's JSON-LD, are escaped text and pass. What fails
 * is a script or frame src that is not a same-origin path, an inline
 * (non-JSON-LD) script naming AdSense or the TCF API, the ad slot's
 * data-gk-ad or data-gk-third-party attribute on an element, or an AdSense ins.
 */
const AD_CODE = /adsbygoogle|googlesyndication|__tcfapi/
export function thirdPartyProblems(html: string): string[] {
  const problems: string[] = []
  for (const m of html.matchAll(/<(script|iframe)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi)) {
    const tag = m[1].toLowerCase()
    const attrs = m[2]
    const src = /\ssrc\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1]
    if (src && /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(src)) {
      problems.push(`<${tag}> with an absolute src (only same-origin paths are allowed): ${src}`)
    } else if (src && AD_CODE.test(src)) {
      problems.push(`<${tag}> src names ad or consent code: ${src}`)
    }
    const jsonLd = /\stype\s*=\s*["']?application\/ld\+json/i.test(attrs)
    if (tag === "script" && !jsonLd && AD_CODE.test(m[3])) problems.push(`inline <script> names ad or consent code: ${AD_CODE.exec(m[3])![0]}`)
  }
  for (const m of html.matchAll(/<[a-z][a-z0-9-]*\b[^>]*\s(data-gk-ad|data-gk-third-party)\s*=/gi)) problems.push(`element with ${m[1]}`)
  if (/<ins\b[^>]*\sclass\s*=\s*["'][^"']*\badsbygoogle\b/i.test(html)) problems.push("AdSense <ins> element")
  return problems
}
