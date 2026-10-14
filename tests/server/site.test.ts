/**
 * Site content (server/site.php) against a real database: strict shapes, drafts
 * that stay private until published, editor-only writes, and a public read that
 * degrades to {} when the table has not been created yet.
 */
import fs from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { api, createUser, login, one, resetDb, sql } from "./helpers"

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
