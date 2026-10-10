/**
 * The article format a CMS author can write in a blog post body.
 *
 * Deliberately small, and parsed into plain data that the page renders as
 * React elements. Nothing here produces HTML, so nothing an author types can
 * become markup or script. What is understood:
 *
 *   Paragraphs           separated by a blank line
 *   ## Heading           an h2; ### gives an h3
 *   - item               a bullet list, one item per line
 *   1. item              a numbered list, one item per line
 *   **bold**             strong emphasis
 *   [text](url)          a link. Only https:, http: and mailto: are allowed;
 *                        any other address (javascript:, data:, a relative
 *                        path) leaves the text in place without a link.
 *   [text](url){sponsored}
 *                        a paid or affiliate link, given rel="sponsored"
 *
 * Anything else is printed as the author typed it.
 */

export type Inline =
  | { type: "text"; text: string }
  | { type: "bold"; children: Inline[] }
  | { type: "link"; href: string; external: boolean; sponsored: boolean; children: Inline[] }

export type Block =
  | { type: "heading"; level: 2 | 3; children: Inline[] }
  | { type: "paragraph"; children: Inline[] }
  | { type: "list"; ordered: boolean; start: number; items: Inline[][] }

const ALLOWED_SCHEMES = new Set(["https:", "http:", "mailto:"])
// A link to this site stays in the same tab.
const OWN_HOSTS = new Set(["gakinz.com", "www.gakinz.com"])

/** The normalised address when its scheme is allowed, otherwise null. */
export function safeHref(raw: string): string | null {
  const s = raw.trim()
  // Absolute only. URL() would happily resolve "//host" or "/path" against a
  // base, but there is no base here, so those throw and are refused.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) return null
  let u: URL
  try {
    u = new URL(s)
  } catch {
    return null
  }
  return ALLOWED_SCHEMES.has(u.protocol) ? u.href : null
}

// [label](url) with an optional {sponsored} marker. The label holds no
// brackets and the url no whitespace; the url may hold one level of balanced
// parentheses, as Wikipedia addresses do. Both limits keep the match linear
// and stop one link swallowing the next. Sticky, so it matches only at
// lastIndex.
const LINK = /\[([^[\]\n]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)(\{sponsored\})?/y

function pushText(out: Inline[], text: string) {
  if (!text) return
  const last = out[out.length - 1]
  if (last?.type === "text") last.text += text
  else out.push({ type: "text", text })
}

function parse(text: string, allowLinks: boolean, allowBold: boolean): Inline[] {
  const out: Inline[] = []
  let i = 0
  while (i < text.length) {
    if (allowBold && text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2)
      if (end > i + 2) {
        out.push({ type: "bold", children: parse(text.slice(i + 2, end), allowLinks, false) })
        i = end + 2
        continue
      }
    }
    if (allowLinks && text[i] === "[") {
      LINK.lastIndex = i
      const m = LINK.exec(text)
      if (m) {
        const [whole, label, url, sponsored] = m
        const children = parse(label, false, allowBold)
        const href = safeHref(url)
        if (href) {
          const u = new URL(href)
          const external = u.protocol !== "mailto:" && !OWN_HOSTS.has(u.hostname)
          out.push({ type: "link", href, external, sponsored: Boolean(sponsored), children })
        } else {
          // Refused address: keep the words, drop the link.
          for (const c of children) {
            if (c.type === "text") pushText(out, c.text)
            else out.push(c)
          }
        }
        i += whole.length
        continue
      }
    }
    pushText(out, text[i])
    i += 1
  }
  return out
}

/** Inline formatting within one line or paragraph. */
export function parseInline(text: string): Inline[] {
  return parse(text, true, true)
}

const HEADING = /^(#{2,3})\s+(.+)$/
const BULLET = /^-\s+(.+)$/
const NUMBERED = /^(\d{1,9})\.\s+(.+)$/

/** A whole post body, as the blocks the article page renders. */
export function parseArticle(body: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  let list: Extract<Block, { type: "list" }> | null = null

  const flushPara = () => {
    if (para.length) blocks.push({ type: "paragraph", children: parseInline(para.join(" ")) })
    para = []
  }
  const flushList = () => {
    if (list) blocks.push(list)
    list = null
  }

  for (const rawLine of body.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim()
    if (!line) {
      flushPara()
      flushList()
      continue
    }

    const h = HEADING.exec(line)
    if (h) {
      flushPara()
      flushList()
      blocks.push({ type: "heading", level: h[1].length === 2 ? 2 : 3, children: parseInline(h[2].trim()) })
      continue
    }

    const b = BULLET.exec(line)
    const n = b ? null : NUMBERED.exec(line)
    const itemText = b ? b[1] : n ? n[2] : null
    if (itemText !== null) {
      const ordered = Boolean(n)
      const item = parseInline(itemText.trim())
      flushPara()
      if (list && list.ordered === ordered) {
        list.items.push(item)
      } else {
        flushList()
        list = { type: "list", ordered, start: n ? Number(n[1]) : 1, items: [item] }
      }
      continue
    }

    flushList()
    para.push(line)
  }
  flushPara()
  flushList()
  return blocks
}
