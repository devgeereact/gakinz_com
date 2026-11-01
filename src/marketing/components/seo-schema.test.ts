import { describe, expect, it } from "vitest"
import { breadcrumbSchema, businessSchema, serviceSchema, SITE_URL } from "./seo-schema"

describe("businessSchema", () => {
  const b = businessSchema({
    description: "I design and build websites.",
    email: "hello@gakinz.com",
    services: [{ slug: "web-design", title: "Web design", summary: "Layout and type." }],
  })

  it("is a ProfessionalService tied to the Person and the site", () => {
    expect(b["@type"]).toBe("ProfessionalService")
    expect(b["@id"]).toBe(`${SITE_URL}/#business`)
    expect(b.founder).toEqual({ "@id": `${SITE_URL}/#person` })
    expect(b.url).toBe(SITE_URL)
  })

  it("claims no street address, phone or registration the site does not have", () => {
    expect(b.address).toEqual({ "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" })
    expect(b).not.toHaveProperty("telephone")
    expect(b).not.toHaveProperty("streetAddress")
    expect(b).not.toHaveProperty("vatID")
  })

  it("lists each service as an offer pointing at its own page", () => {
    const offers = (b.hasOfferCatalog as { itemListElement: { itemOffered: { name: string; url: string } }[] }).itemListElement
    expect(offers).toHaveLength(1)
    expect(offers[0].itemOffered).toMatchObject({ name: "Web design", url: `${SITE_URL}/services/web-design` })
  })
})

describe("serviceSchema", () => {
  it("names the provider by reference", () => {
    const s = serviceSchema({ slug: "it-support", title: "General IT support", summary: "Email and accounts." })
    expect(s).toMatchObject({
      "@type": "Service",
      name: "General IT support",
      url: `${SITE_URL}/services/it-support`,
      provider: { "@id": `${SITE_URL}/#business` },
      areaServed: { "@type": "Country", name: "United Kingdom" },
    })
  })
})

describe("breadcrumbSchema", () => {
  it("numbers the trail from Home and makes every URL absolute", () => {
    const c = breadcrumbSchema([
      ["/services", "Services"],
      ["/services/web-design", "Web design"],
    ])
    expect(c["@type"]).toBe("BreadcrumbList")
    expect(c.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Services", item: `${SITE_URL}/services` },
      { "@type": "ListItem", position: 3, name: "Web design", item: `${SITE_URL}/services/web-design` },
    ])
  })
})
