import { describe, expect, it } from "vitest"
import { DEFAULT_COPY, mergeCopy } from "./content"
import { heroFrom, onColour, SHOWCASE } from "./showcase"

describe("mergeCopy", () => {
  it("returns the defaults when nothing is published", () => {
    expect(mergeCopy(null)).toEqual(DEFAULT_COPY)
    expect(mergeCopy({})).toEqual(DEFAULT_COPY)
  })

  it("replaces a published section and keeps the rest", () => {
    const c = mergeCopy({ faqs: [{ q: "New question?", a: "New answer." }] })
    expect(c.faqs).toEqual([{ q: "New question?", a: "New answer." }])
    expect(c.services).toEqual(DEFAULT_COPY.services)
  })

  it("keeps detail and deliverables for a known service and slugs a new one", () => {
    const c = mergeCopy({ services: [{ title: "Web design", summary: "Edited." }, { title: "SEO & Content", summary: "New." }] })
    expect(c.services[0].slug).toBe("web-design")
    expect(c.services[0].summary).toBe("Edited.")
    expect(c.services[0].deliverables.length).toBeGreaterThan(0)
    expect(c.services[1]).toMatchObject({ slug: "seo-and-content", detail: "New.", deliverables: [] })
  })

  it("ignores blank fields and an out-of-range slide time", () => {
    const c = mergeCopy({ hero: { lead: "  ", secs: 30 }, contact: { email: "" } })
    expect(c.hero.lead).toBe(DEFAULT_COPY.hero.lead)
    expect(c.hero.secs).toBe(DEFAULT_COPY.hero.secs)
    expect(c.contact.email).toBe(DEFAULT_COPY.contact.email)
  })
})

describe("showcase", () => {
  it("picks at most five flagged projects with screenshots, in order", () => {
    const hero = heroFrom(SHOWCASE)
    expect(hero.length).toBeLessThanOrEqual(5)
    expect(hero.map((p) => p.heroOrder)).toEqual([...hero.map((p) => p.heroOrder)].sort((a, b) => (a ?? 0) - (b ?? 0)))
    expect(hero.every((p) => p.desktop)).toBe(true)
  })

  it("chooses readable text on brand colours", () => {
    expect(onColour("#1B2E6B")).toBe("#FFFFFF")
    expect(onColour("#F59E0B")).toBe("#16120A")
    expect(onColour("not a colour")).toBe("#FFFFFF")
  })
})
