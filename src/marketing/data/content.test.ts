import { describe, expect, it } from "vitest"
import { DEFAULT_COPY, enquiryServiceOptions, groupServices, mergeCopy, mergeServices, OTHER_SERVICE, serviceFromRow } from "./content"
import { IT_EXCLUSION, QUOTE_ONLY } from "./site"
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

  it("reads an older title-and-summary list as edits to the built-in six, hiding a service it cannot complete", () => {
    const c = mergeCopy({ services: [{ title: "Web design", summary: "Edited." }, { title: "SEO & Content", summary: "New." }, { title: "Care and support", summary: "Still here." }] })
    expect(c.services.map((s) => s.slug)).toEqual(DEFAULT_COPY.services.map((s) => s.slug))
    expect(c.services[0]).toMatchObject({ slug: "web-design", summary: "Edited.", hook: DEFAULT_COPY.services[0].hook })
    expect(c.services[0].deliverables).toEqual(DEFAULT_COPY.services[0].deliverables)
    // The old name of Website care still finds its page.
    expect(c.services.find((s) => s.slug === "care-and-support")).toMatchObject({ title: "Care and support", summary: "Still here." })
    expect(c.services.some((s) => s.title === "SEO & Content")).toBe(false)
  })

  it("ignores blank fields and an out-of-range slide time", () => {
    const c = mergeCopy({ hero: { lead: "  ", secs: 30 }, contact: { email: "" } })
    expect(c.hero.lead).toBe(DEFAULT_COPY.hero.lead)
    expect(c.hero.secs).toBe(DEFAULT_COPY.hero.secs)
    expect(c.contact.email).toBe(DEFAULT_COPY.contact.email)
  })
})

const PAGE = {
  group: "it",
  hook: "Printers that print.",
  needs: ["A printer that works"],
  deliverables: ["A working printer"],
  exclusions: ["New printers"],
  price_basis: "Priced per job, ask for a quote.",
}

describe("services", () => {
  it("ships six built-in services, four websites then two IT, each a whole page", () => {
    const d = DEFAULT_COPY.services
    expect(d.map((s) => s.title)).toEqual(["Web design", "Web development", "Ecommerce", "Website care", "General IT support", "IT consultancy"])
    expect(d.map((s) => s.group)).toEqual(["websites", "websites", "websites", "websites", "it", "it"])
    for (const s of d) {
      expect(s.hook && s.summary && s.detail && s.price_basis).toBeTruthy()
      expect(s.needs.length * s.deliverables.length * s.exclusions.length).toBeGreaterThan(0)
    }
    // Spec 4.3: no IT price until the owner supplies one; networking and hardware repair only as the exclusion.
    for (const s of d.filter((x) => x.group === "it")) {
      expect(s.price_basis).toBe(QUOTE_ONLY)
      expect(s.exclusions).toContain(IT_EXCLUSION)
    }
    const prose = d.flatMap((s) => [s.hook, s.summary, s.detail, s.price_basis, ...s.needs, ...s.deliverables, ...s.exclusions.filter((x) => x !== IT_EXCLUSION)])
    expect(prose.filter((t) => /network|hardware/i.test(t))).toEqual([])
  })

  it("keeps the published URL of Website care", () => {
    expect(DEFAULT_COPY.services.find((s) => s.title === "Website care")?.slug).toBe("care-and-support")
  })

  it("lets a published row with a slug override the built-in service, and decide the order", () => {
    const list = mergeServices([
      { slug: "it-support", title: "IT help", summary: "Edited summary for IT.", ...PAGE },
      { slug: "web-design", title: "Web design", summary: "Edited." },
    ])
    expect(list.map((s) => s.slug)).toEqual(["it-support", "web-design"])
    expect(list[0]).toMatchObject({ title: "IT help", hook: "Printers that print.", needs: ["A printer that works"], detail: DEFAULT_COPY.services[4].detail })
    // A slugged row without page fields keeps the built-in page.
    expect(list[1].deliverables).toEqual(DEFAULT_COPY.services[0].deliverables)
  })

  it("publishes a new service only when it has every page field", () => {
    const whole = { slug: "printers", title: "Printers", summary: "Printer help for the office.", ...PAGE }
    expect(serviceFromRow(whole)).toMatchObject({ slug: "printers", group: "it", detail: "Printer help for the office." })
    for (const key of Object.keys(PAGE)) {
      const part: Record<string, unknown> = { ...whole }
      delete part[key]
      expect(serviceFromRow(part), key).toBeNull()
    }
    expect(serviceFromRow({ ...whole, needs: ["  "] })).toBeNull()
    expect(serviceFromRow({ ...whole, group: "plumbing" })).toBeNull()
    const list = mergeServices([{ slug: "printers", title: "Printers", summary: "x", hook: "Half a page." }, { slug: "ecommerce", title: "Ecommerce", summary: "Shops." }])
    expect(list.map((s) => s.slug)).toEqual(["ecommerce"])
  })

  it("keeps the built-in list when nothing published can make a page, and drops a repeated slug", () => {
    expect(mergeServices([{ slug: "x", title: "Unknown", summary: "No page." }])).toEqual(DEFAULT_COPY.services)
    expect(mergeServices([{ slug: "web-design", title: "Web design" }, { slug: "web-design", title: "Again" }]).map((s) => s.title)).toEqual(["Web design"])
    expect(mergeServices("not a list")).toEqual(DEFAULT_COPY.services)
  })

  it("groups services as Websites then IT support, leaving out an empty group", () => {
    const g = groupServices(DEFAULT_COPY.services)
    expect(g.map((x) => [x.label, x.items.length])).toEqual([["Websites", 4], ["IT support", 2]])
    const onlyIt = groupServices(DEFAULT_COPY.services.filter((s) => s.group === "it"))
    expect(onlyIt.map((x) => x.label)).toEqual(["IT support"])
  })

  it("offers the website's service names on the enquiry form, then Something else", () => {
    expect(enquiryServiceOptions(DEFAULT_COPY.services)).toEqual([...DEFAULT_COPY.services.map((s) => s.title), OTHER_SERVICE])
    const renamed = mergeCopy({ services: [{ title: "Web design", summary: "Edited." }] }).services
    expect(enquiryServiceOptions(renamed)).toHaveLength(7)
    expect(enquiryServiceOptions([{ ...DEFAULT_COPY.services[0], title: OTHER_SERVICE }])).toEqual([OTHER_SERVICE])
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
