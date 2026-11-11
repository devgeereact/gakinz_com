/**
 * The layout check both browser layout tests run inside the page (public-layout.test.ts, cms-layout.test.ts): page.evaluate(pageProblems).
 * It must stay self-contained: Playwright sends its source text into the page, so it can use nothing from this module.
 */
/** Runs inside the page. Returns one line per problem. */
export function pageProblems(): string[] {
  const problems: string[] = []
  const vw = window.innerWidth
  const root = document.documentElement
  if (root.scrollWidth > vw) problems.push(`the page scrolls sideways (${root.scrollWidth}px in a ${vw}px window)`)
  const visible = (el: Element) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"
  }
  for (const el of document.querySelectorAll("body *")) {
    // Not flaws: form controls scroll their own text; .sr and .sr-only are visually hidden on purpose; the hero's
    // laptop and phone frames crop their screenshots by design (object-fit: cover inside overflow: hidden).
    if (el.matches("input, textarea, select, .sr, .sr-only, svg, svg *, .laptop, .laptop *, .phone, .phone *")) continue
    const cs = getComputedStyle(el)
    // Deliberate truncation (an ellipsis, a line clamp) is not a flaw either.
    if (cs.textOverflow === "ellipsis" || cs.webkitLineClamp !== "none" && cs.webkitLineClamp !== undefined && cs.webkitLineClamp !== "") continue
    if ((cs.overflowX === "hidden" || cs.overflowX === "clip") && el.scrollWidth > el.clientWidth + 1 && visible(el)) {
      problems.push(`content clipped in <${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 60)}">`)
    }
  }
  // Something sticking out past the right edge is what makes a phone page scroll sideways; name the first few.
  if (root.scrollWidth > vw) {
    let named = 0
    for (const el of document.querySelectorAll("body *")) {
      if (named >= 3) break
      const r = el.getBoundingClientRect()
      if (r.right > vw + 1 && r.width > 0 && visible(el)) {
        problems.push(`  sticks out: <${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 60)}"> right edge ${Math.round(r.right)}px`)
        named++
      }
    }
  }
  return problems
}
