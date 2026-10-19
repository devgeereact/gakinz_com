import { describe, it, expect } from "vitest"
import type { SiteDrafts, SiteSection } from "@/lib/api"
import { SITE_SECTIONS } from "@/lib/api"
import { DEFAULT_COPY } from "@/marketing/data/content"
import {
  addRow,
  blankHero,
  defaultSiteContent,
  dirtySections,
  effectiveContent,
  focusAfterMove,
  formatPublishedDate,
  heroChanges,
  heroIdsInHeroOrder,
  heroIdsInListOrder,
  lastPublished,
  moveRow,
  normaliseSecs,
  prepareSection,
  removeRow,
  SECTION_TAB,
  SITE_MAX_ROWS,
  textOn,
  tidyService,
  unpublishedSections,
  validateHero,
  validateSection,
} from "./siteContentModel"

function draftsWith(over: Partial<Record<SiteSection, Partial<SiteDrafts[SiteSection]>>> = {}): SiteDrafts {
  const out = {} as Record<SiteSection, unknown>
  for (const s of SITE_SECTIONS) {
    out[s] = {
      draft: null,
      published: null,
      updated_at: null,
      updated_by_name: null,
      published_at: null,
      published_by_name: null,
      ...over[s],
    }
  }
  return out as SiteDrafts
}

describe("defaultSiteContent", () => {
  it("maps the built-in copy onto the API shapes, with no extra keys", () => {
    const d = defaultSiteContent()
    expect(Object.keys(d.services[0]).sort()).toEqual(["deliverables", "detail", "exclusions", "group", "hook", "needs", "price_basis", "slug", "summary", "title"])
    expect(Object.keys(d.process[0]).sort()).toEqual(["detail", "title"])
    expect(Object.keys(d.packages[0]).sort()).toEqual(["best", "featured", "name", "price"])
    expect(Object.keys(d.addons[0]).sort()).toEqual(["name", "price"])
    expect(Object.keys(d.terms[0]).sort()).toEqual(["share", "stage"])
    expect(Object.keys(d.faqs[0]).sort()).toEqual(["a", "q"])
    expect(Object.keys(d.contact).sort()).toEqual(["email", "footer", "reply"])
    expect(d.services.length).toBe(DEFAULT_COPY.services.length)
    expect(d.services[0].title).toBe(DEFAULT_COPY.services[0].title)
  })

  it("rounds the hero seconds to the whole number site.php accepts", () => {
    expect(Number.isInteger(defaultSiteContent().hero.secs)).toBe(true)
  })

  it("passes its own validation, so publishing the defaults is never refused", () => {
    const d = defaultSiteContent()
    for (const s of SITE_SECTIONS) expect(validateSection(s, d[s])).toBeNull()
  })
})

describe("effectiveContent", () => {
  it("prefers the draft, then the published copy, then the default", () => {
    const drafts = draftsWith({
      faqs: { draft: [{ q: "Draft?", a: "Yes" }], published: [{ q: "Published?", a: "Yes" }] },
      terms: { published: [{ stage: "Up front", share: "100%" }] },
    })
    const c = effectiveContent(drafts)
    expect(c.faqs[0].q).toBe("Draft?")
    expect(c.terms).toEqual([{ stage: "Up front", share: "100%" }])
    expect(c.services).toEqual(defaultSiteContent().services)
  })
})

describe("dirty and unpublished sections", () => {
  it("lists only sections whose values changed", () => {
    const a = defaultSiteContent()
    const b = { ...a, faqs: [...a.faqs, { q: "New", a: "Row" }] }
    expect(dirtySections(b, a)).toEqual(["faqs"])
    expect(dirtySections(a, defaultSiteContent())).toEqual([])
  })

  it("treats a draft equal to the published copy as published", () => {
    const same = [{ q: "Q", a: "A" }]
    const d = draftsWith({ faqs: { draft: same, published: same }, terms: { draft: [{ stage: "x", share: "y" }] } })
    expect(unpublishedSections(d)).toEqual(["terms"])
  })

  it("reports the most recent publish", () => {
    const d = draftsWith({
      hero: { published_at: "2026-10-01 09:00:00", published_by_name: "A" },
      faqs: { published_at: "2026-10-12 14:03:00", published_by_name: "Gideon" },
    })
    expect(lastPublished(d)).toEqual({ at: "2026-10-12 14:03:00", by: "Gideon" })
    expect(lastPublished(draftsWith())).toBeNull()
    expect(formatPublishedDate("2026-10-12 14:03:00")).toBe("12 Oct 2026")
  })
})

describe("list editor helpers", () => {
  const rows = [{ t: "a" }, { t: "b" }, { t: "c" }]

  it("moves a row and ignores moves past either end", () => {
    expect(moveRow(rows, 0, 1).map((r) => r.t)).toEqual(["b", "a", "c"])
    expect(moveRow(rows, 2, -1).map((r) => r.t)).toEqual(["a", "c", "b"])
    expect(moveRow(rows, 0, -1)).toBe(rows)
    expect(moveRow(rows, 2, 1)).toBe(rows)
  })

  it("removes a row but always keeps one", () => {
    expect(removeRow(rows, 1).map((r) => r.t)).toEqual(["a", "c"])
    expect(removeRow([{ t: "only" }], 0)).toEqual([{ t: "only" }])
  })

  it("adds a blank row up to the server's limit", () => {
    expect(addRow(rows, { t: "" })).toHaveLength(4)
    const full = Array.from({ length: SITE_MAX_ROWS }, () => ({ t: "x" }))
    expect(addRow(full, { t: "" })).toBe(full)
  })

  it("keeps focus on the moved row, flipping direction at an edge", () => {
    expect(focusAfterMove(3, 0, 1)).toEqual({ index: 1, delta: 1 })
    expect(focusAfterMove(3, 1, 1)).toEqual({ index: 2, delta: -1 })
    expect(focusAfterMove(3, 1, -1)).toEqual({ index: 0, delta: 1 })
  })
})

describe("validateSection", () => {
  it("mirrors the site.php rules", () => {
    const d = defaultSiteContent()
    expect(validateSection("hero", { ...d.hero, secs: 5.5 })).toMatch(/whole number/)
    expect(validateSection("hero", { ...d.hero, secs: 11 })).toMatch(/4 to 10/)
    expect(validateSection("hero", { ...d.hero, cta1: "  " })).toMatch(/Main button cannot be empty/)
    expect(validateSection("contact", { ...d.contact, email: "nope" })).toMatch(/valid email/)
    expect(validateSection("faqs", [{ q: "Q", a: "" }])).toBe("Row 1: Answer cannot be empty.")
    expect(validateSection("faqs", [])).toMatch(/at least one/)
  })

  it("maps every section to a tab", () => {
    for (const s of SITE_SECTIONS) expect(SECTION_TAB[s]).toBeTruthy()
    expect(SECTION_TAB.terms).toBe("pricing")
  })
  it("rounds and clamps seconds", () => {
    expect(normaliseSecs(5.6)).toBe(6)
    expect(normaliseSecs(2)).toBe(4)
    expect(normaliseSecs(Number.NaN)).toBe(6)
  })
})

describe("Work hero helpers", () => {
  const rows = [
    { id: 4, hero_order: 2 },
    { id: 7, hero_order: null },
    { id: 9, hero_order: 1 },
  ]
  it("reads hero ids in list order and in stored order", () => {
    expect(heroIdsInListOrder(rows)).toEqual([4, 9])
    expect(heroIdsInHeroOrder(rows)).toEqual([9, 4])
  })

  it("picks readable text on a brand colour", () => {
    expect(textOn("#3B6FE0")).toBe("#FFFFFF")
    expect(textOn("#F59E0B")).toBe("#1A1206")
    expect(textOn("#16202B")).toBe("#FFFFFF")
    expect(textOn(null)).toBe("#FFFFFF")
  })

  it("sends only the hero keys that changed, with screenshot and alt together", () => {
    const start = { ...blankHero, brand_colour: "#112233", desktop_file_id: 5, desktop_alt: "Home page" }
    expect(heroChanges(start, start)).toEqual({})
    expect(heroChanges(start, { ...start, hero_word: "care agencies" })).toEqual({ hero_word: "care agencies" })
    expect(heroChanges(start, { ...start, desktop_alt: "New alt" })).toEqual({
      hero_desktop_file_id: 5,
      hero_desktop_alt: "New alt",
    })
    expect(heroChanges(start, { ...start, desktop_file_id: null })).toEqual({
      hero_desktop_file_id: null,
      hero_desktop_alt: null,
    })
    expect(heroChanges(start, { ...start, brand_colour: "" })).toEqual({ brand_colour: null })
  })

  it("checks colour, word and alt text before sending", () => {
    expect(validateHero(blankHero)).toEqual({})
    const e = validateHero({ ...blankHero, brand_colour: "blue", hero_word: "far too many words", mobile_file_id: 3 })
    expect(Object.keys(e).sort()).toEqual(["brand_colour", "hero_word", "mobile_alt"])
  })
})

describe("service rows", () => {
  const whole = () => defaultSiteContent().services[4]

  it("accepts the built-in six as they stand", () => {
    expect(validateSection("services", defaultSiteContent().services)).toBeNull()
  })

  it("accepts an older title-and-summary row for a built-in service, and keeps it that shape when saved", () => {
    const rows = [{ title: "Web design", summary: " Edited. " }, { title: "Website care", summary: "Care.", needs: ["", " "] }]
    expect(validateSection("services", rows)).toBeNull()
    expect(prepareSection("services", rows)).toEqual([{ title: "Web design", summary: "Edited." }, { title: "Website care", summary: "Care." }])
  })

  it("refuses a new service without every page field, naming the first one missing", () => {
    expect(validateSection("services", [{ title: "Printers", summary: "Printer help." }])).toMatch(/^Row 1: Web address cannot be empty\. .*no half page/)
    const bad = { ...whole(), slug: "printers", title: "Printers", hook: " " }
    expect(validateSection("services", [bad])).toMatch(/^Row 1: Buyer hook cannot be empty/)
    expect(validateSection("services", [{ ...whole(), exclusions: ["", ""] }])).toMatch(/Not included cannot be empty/)
  })

  it("refuses a page field on a built-in row unless all of them come with it", () => {
    expect(validateSection("services", [{ title: "Web design", summary: "x", hook: "A hook only." }])).toMatch(/Web address cannot be empty/)
    expect(validateSection("services", [{ title: "Web design", summary: "x", slug: "web-design", hook: "A hook only." }])).toMatch(/Group cannot be empty/)
  })

  it("checks web addresses, repeats and list lengths", () => {
    expect(validateSection("services", [{ ...whole(), slug: "IT Support" }])).toMatch(/lower-case letters/)
    expect(validateSection("services", [whole(), whole()])).toMatch(/^Row 2: Another service already uses the web address it-support/)
    expect(validateSection("services", [{ ...whole(), needs: Array.from({ length: 11 }, (_, i) => `Need ${i}`) }])).toMatch(/up to 10 lines/)
    expect(validateSection("services", [{ ...whole(), price_basis: "x".repeat(301) }])).toMatch(/Price basis must be 300/)
  })

  it("tidies lines typed in the editor before they are saved", () => {
    const t = tidyService({ ...whole(), needs: ["  One ", "", "Two"], detail: "  " })
    expect(t.needs).toEqual(["One", "Two"])
    expect("detail" in t).toBe(false)
  })
})
