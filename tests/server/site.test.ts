/**
 * Site content (server/site.php) against a real database: strict shapes, drafts
 * that stay private until published, editor-only writes, and a public read that
 * degrades to {} when the table has not been created yet.
 */
import fs from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { api, createUser, login, one, q, resetDb, sql } from "./helpers"

let editor: string

const HERO = { status: "Booking two projects for November", lead: "Websites for small firms.", cta1: "Start a project", cta2: "See the work", secs: 6 }
const FAQS = [{ q: "How long does a site take?", a: "Four to six weeks for most builds." }]

beforeEach(async () => {
  resetDb()
  createUser({ email: "editor@example.test", role: "editor" })
  editor = await login("editor@example.test")
})

const save = (section: string, data: unknown, token = editor) =>
  api<{ ok?: boolean; error?: string; draft?: unknown }>("site.php?action=save", { body: { section, data }, token })
const publish = (sections?: string[], token = editor) =>
  api<{ ok?: boolean; published?: string[]; error?: string }>("site.php?action=publish", { body: sections ? { sections } : {}, token })

describe("save and validate", () => {
  it("stores a valid draft and audits it", async () => {
    const r = await save("hero", { ...HERO, lead: "  Websites for small firms.  " })
    expect(r.status).toBe(200)
    expect(r.json.draft).toEqual(HERO) // trimmed
    expect(JSON.parse(one("SELECT draft FROM site_content WHERE section = 'hero'")!)).toEqual(HERO)
    expect(one("SELECT published IS NULL FROM site_content WHERE section = 'hero'")).toBe("1")
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'site_save'")).toBe("1")
  })

  it("refuses unknown sections, unknown keys, wrong types, out-of-range and over-long values", async () => {
    expect((await save("footer", {})).status).toBe(400)
    expect((await save("hero", { ...HERO, extra: "x" })).status).toBe(400)
    expect((await save("hero", { ...HERO, secs: 3 })).status).toBe(400)
    expect((await save("hero", { ...HERO, secs: 11 })).status).toBe(400)
    expect((await save("hero", { ...HERO, secs: "6" })).status).toBe(400)
    expect((await save("hero", { ...HERO, cta1: "" })).status).toBe(400)
    expect((await save("hero", { ...HERO, status: "x".repeat(301) })).status).toBe(400)
    expect((await save("hero", [HERO])).status).toBe(400)
    expect((await save("faqs", FAQS[0])).status).toBe(400)
    expect((await save("faqs", [])).status).toBe(400)
    expect((await save("faqs", Array.from({ length: 13 }, () => FAQS[0]))).status).toBe(400)
    expect((await save("faqs", [{ q: "Q", a: "x".repeat(1201) }])).status).toBe(400)
    expect((await save("packages", [{ name: "Site", price: "£2,400", best: "Most firms", featured: "yes" }])).status).toBe(400)
    expect((await save("contact", { email: "not-an-email", reply: "Within a day", footer: "GAkinz" })).status).toBe(400)
    expect(one("SELECT COUNT(*) FROM site_content")).toBe("0")
  })

  it("accepts every section shape", async () => {
    const all: Record<string, unknown> = {
      hero: HERO,
      services: [{ title: "Websites", summary: "Fast, accessible sites." }],
      process: [{ title: "Talk", detail: "A call to scope the work." }],
      packages: [{ name: "Site", price: "£2,400", best: "Most firms", featured: true }, { name: "Shop", price: "£4,000", best: "Retail" }],
      addons: [{ name: "Copywriting", price: "£300" }],
      terms: [{ stage: "Deposit", share: "50%" }],
      faqs: FAQS,
      contact: { email: "hello@example.test", reply: "Within a working day", footer: "GAkinz, London" },
    }
    for (const [section, data] of Object.entries(all)) {
      const r = await save(section, data)
      expect(r.status, `${section}: ${JSON.stringify(r.json)}`).toBe(200)
    }
  })
})

describe("publish and the public read", () => {
  it("never leaks a draft, and publishes only what was asked", async () => {
    expect((await api("site.php?action=get")).json).toEqual({})
    await save("hero", HERO)
    await save("faqs", FAQS)
    const before = await api<Record<string, unknown>>("site.php?action=get")
    expect(before.status).toBe(200)
    expect(before.json).toEqual({})

    const r = await publish(["faqs"])
    expect(r.status).toBe(200)
    expect(r.json.published).toEqual(["faqs"])
    expect((await api("site.php?action=get")).json).toEqual({ faqs: FAQS })

    // A later draft does not change the public copy until it is published.
    await save("faqs", [{ q: "New?", a: "Not yet public." }])
    expect((await api("site.php?action=get")).json).toEqual({ faqs: FAQS })
  })

  it("publishes every drafted section when none are named, and records who", async () => {
    await save("hero", HERO)
    await save("faqs", FAQS)
    const r = await publish()
    expect(r.json.published).toEqual(["faqs", "hero"])
    const pub = await api<Record<string, unknown>>("site.php?action=get")
    expect(pub.json).toEqual({ hero: HERO, faqs: FAQS })
    expect(pub.headers.get("cache-control")).toContain("max-age")

    const d = await api<Record<string, { published: unknown; published_by_name: string | null; updated_by_name: string | null; draft: unknown }>>(
      "site.php?action=draft", { token: editor },
    )
    expect(d.status).toBe(200)
    expect(d.json.hero.published).toEqual(HERO)
    expect(d.json.hero.published_by_name).toBe("editor")
    expect(d.json.hero.updated_by_name).toBe("editor")
    expect(d.json.contact.draft).toBeNull()
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'site_publish'")).toBe("1")
  })

  it("refuses to publish a section with no draft, or when nothing is saved", async () => {
    expect((await publish()).status).toBe(409)
    await save("hero", HERO)
    expect((await publish(["faqs"])).status).toBe(409)
    expect((await publish(["nonsense"])).status).toBe(400)
  })
})

describe("service pages", () => {
  const PAGE = {
    slug: "it-support",
    title: "General IT support",
    summary: "Email, devices, software and backups.",
    group: "it",
    hook: "Everyday IT problems sorted.",
    detail: "A longer paragraph.",
    needs: ["Email to set up"],
    deliverables: ["Email set up"],
    exclusions: ["Networking installation and hardware repair are not offered."],
    price_basis: "Priced per job, ask for a quote.",
  }
  const LEGACY = { title: "Web design", summary: "Layout and type." }

  it("stores a whole service page beside an older title-and-summary row, trimming each line", async () => {
    const r = await save("services", [{ ...PAGE, needs: ["  Email to set up  "] }, LEGACY])
    expect(r.status, JSON.stringify(r.json)).toBe(200)
    expect(r.json.draft).toEqual([PAGE, LEGACY])
    expect((await publish(["services"])).status).toBe(200)
    expect((await api("site.php?action=get")).json).toEqual({ services: [PAGE, LEGACY] })
  })

  it("leaves detail optional but takes the other page fields all together or not at all", async () => {
    const noDetail: Record<string, unknown> = { ...PAGE }
    delete noDetail.detail
    expect((await save("services", [noDetail])).status).toBe(200)
    for (const key of ["slug", "group", "hook", "needs", "deliverables", "exclusions", "price_basis"]) {
      const part: Record<string, unknown> = { ...PAGE }
      delete part[key]
      const r = await save("services", [part])
      expect(r.status, key).toBe(400)
      expect(r.json.error).toContain(`missing ${key}`)
    }
    expect((await save("services", [{ ...LEGACY, hook: "Only a hook." }])).status).toBe(400)
  })

  it("refuses a bad slug, a repeated slug, an unknown group and bad lists", async () => {
    const bad = [
      { ...PAGE, slug: "IT Support" },
      { ...PAGE, slug: "it--support" },
      { ...PAGE, slug: "x".repeat(81) },
      { ...PAGE, group: "networking" },
      { ...PAGE, needs: [] },
      { ...PAGE, needs: "Email" },
      { ...PAGE, needs: ["Email", "  "] },
      { ...PAGE, needs: [42] },
      { ...PAGE, needs: { a: "Email" } },
      { ...PAGE, exclusions: Array.from({ length: 11 }, (_, i) => `Line ${i}`) },
      { ...PAGE, deliverables: ["x".repeat(301)] },
      { ...PAGE, hook: "x".repeat(301) },
    ]
    for (const row of bad) {
      expect((await save("services", [row])).status, JSON.stringify(row).slice(0, 80)).toBe(400)
    }
    const twice = await save("services", [PAGE, { ...PAGE, title: "Again" }])
    expect(twice.status).toBe(400)
    expect(twice.json.error).toMatch(/already used/)
    expect(one("SELECT COUNT(*) FROM site_content")).toBe("0")
  })

  it("will not publish a stored draft that a newer rule refuses", async () => {
    sql(
      `INSERT INTO site_content (section, draft) VALUES ('services', ${q(JSON.stringify([{ title: "Printers", summary: "Help.", hook: "Half a page." }]))})`,
    )
    expect((await publish(["services"])).status).toBe(400)
    expect((await api("site.php?action=get")).json).toEqual({})
  })
})

describe("business and social links", () => {
  const BUSINESS = {
    email: "  hello@example.test ",
    phone: "+44 20 7946 0000",
    address: ["1 Example Street", "London"],
    hours: "Monday to Friday, 9am to 5pm",
    social: [
      { platform: "linkedin", url: "https://www.linkedin.com/in/example", label: "LinkedIn" },
      { platform: "github", url: "https://github.com/example" },
    ],
  }
  const bad = async (data: unknown, pattern: RegExp) => {
    const r = await save("business", data)
    expect(r.status, JSON.stringify(data)).toBe(400)
    expect(String(r.json.error)).toMatch(pattern)
  }

  it("stores a full record trimmed, and a record with every field left out", async () => {
    const r = await save("business", BUSINESS)
    expect(r.status).toBe(200)
    expect(r.json.draft).toEqual({ ...BUSINESS, email: "hello@example.test" })
    expect((await save("business", {})).status).toBe(200)
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'site_save'")).toBe("2")
  })

  it("accepts only https profile addresses on a listed platform", async () => {
    const profile = (p: object) => ({ social: [{ platform: "x", url: "https://x.com/example", ...p }] })
    await bad(profile({ url: "http://x.com/example" }), /https/)
    await bad(profile({ url: "javascript:alert(1)" }), /https/)
    await bad(profile({ url: "//x.com/example" }), /https/)
    await bad(profile({ url: "https://user:pw@x.com/example" }), /https/)
    await bad(profile({ url: "https://x.com/exa mple" }), /https/)
    await bad(profile({ url: "https://localhost/example" }), /https/)
    await bad(profile({ url: "https://x.com/</script><script>alert(1)</script>" }), /https/)
    for (const ch of ['"', "<", ">", "\\", "`", "\u0007"]) await bad(profile({ url: `https://x.com/a${ch}b` }), /https/)
    await bad(profile({ platform: "myspace" }), /one of: linkedin/)
    await bad(profile({ url: "https://x.com/" + "a".repeat(300) }), /300 characters/)
    await bad(profile({ label: "x".repeat(61) }), /60 characters/)
    await bad(profile({ extra: 1 }), /unknown field/)
    await bad({ social: [] }, /at least one profile/)
    await bad({ social: { platform: "x" } }, /list of profiles/)
    await bad({ social: Array.from({ length: 11 }, (_, i) => ({ platform: "x", url: `https://x.com/u${i}` })) }, /at most 10/)
    await bad({ social: [{ platform: "x", url: "https://x.com/a" }, { platform: "x", url: "https://X.com/a" }] }, /already listed/)
    expect(one("SELECT COUNT(*) FROM site_content")).toBe("0")
  })

  it("refuses a bad email, phone, address and over-long note", async () => {
    await bad({ email: "nope" }, /valid email/)
    await bad({ phone: "call me" }, /phone number/)
    await bad({ phone: "12345" }, /phone number/)
    await bad({ phone: "+" + "1".repeat(30) }, /phone number/)
    await bad({ address: [] }, /at least one line/)
    await bad({ address: ["a", "b", "c", "d", "e"] }, /at most 4/)
    await bad({ address: ["ok", ""] }, /cannot be empty/)
    await bad({ hours: "x".repeat(301) }, /300 characters/)
    await bad({ twitter: "x" }, /unknown field/)
    await bad([BUSINESS], /must be an object/)
  })

  it("is private until published, then public, and a later draft stays private", async () => {
    await save("business", BUSINESS)
    expect((await api("site.php?action=get")).json).toEqual({})
    expect((await publish(["business"])).status).toBe(200)
    const pub = await api<{ business: { phone: string; social: unknown[] } }>("site.php?action=get")
    expect(pub.json.business.phone).toBe("+44 20 7946 0000")
    expect(pub.json.business.social).toHaveLength(2)

    await save("business", { phone: "020 7946 0001" })
    expect((await api<{ business: { phone: string } }>("site.php?action=get")).json.business.phone).toBe("+44 20 7946 0000")
    const staff = await api<{ business: { draft: { phone: string }; published: { phone: string } } }>("site.php?action=draft", { token: editor })
    expect(staff.json.business.draft.phone).toBe("020 7946 0001")
  })

  it("will not publish a stored draft that no longer passes (a hand-edited http profile)", async () => {
    await save("business", BUSINESS)
    sql(`UPDATE site_content SET draft = '{"social":[{"platform":"x","url":"http://x.com/a"}]}' WHERE section = 'business'`)
    const r = await publish(["business"])
    expect(r.status).toBe(400)
    expect(one("SELECT published IS NULL FROM site_content WHERE section = 'business'")).toBe("1")
  })

  it("refuses a client login and a signed-out caller", async () => {
    createUser({ email: "client@example.test", role: "client" })
    const client = await login("client@example.test")
    expect((await save("business", BUSINESS, client)).status).toBe(403)
    expect((await api("site.php?action=save", { body: { section: "business", data: BUSINESS } })).status).toBe(401)
  })
})

describe("roles", () => {
  it("refuses client and employee roles, and signed-out callers, on every staff action", async () => {
    createUser({ email: "staff@example.test", role: "employee" })
    createUser({ email: "client@example.test", role: "client" })
    for (const email of ["staff@example.test", "client@example.test"]) {
      const token = await login(email)
      expect((await api("site.php?action=draft", { token })).status).toBe(403)
      expect((await save("hero", HERO, token)).status).toBe(403)
      expect((await publish(undefined, token)).status).toBe(403)
    }
    expect((await api("site.php?action=draft")).status).toBe(401)
    expect((await api("site.php?action=save", { body: { section: "hero", data: HERO } })).status).toBe(401)
    expect(one("SELECT COUNT(*) FROM site_content")).toBe("0")
  })
})

describe("before the migration", () => {
  const create = fs.readFileSync(path.resolve(__dirname, "../../server/schema.sql"), "utf8")
    .match(/CREATE TABLE IF NOT EXISTS site_content \([\s\S]*?\) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;/)![0]

  it("serves {} publicly and refuses staff actions with a clear message", async () => {
    sql("DROP TABLE site_content")
    try {
      const pub = await api("site.php?action=get")
      expect(pub.status).toBe(200)
      expect(pub.json).toEqual({})
      const r = await save("hero", HERO)
      expect(r.status).toBe(503)
      expect(r.json.error).toMatch(/site_content schema step/)
      expect((await api("site.php?action=draft", { token: editor })).status).toBe(503)
    } finally {
      sql(create)
    }
  })
})
