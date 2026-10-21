/**
 * The homepage hero (server/work.php setHero, heroOrder and the public `hero`
 * action) against a real database: at most five records, published only, a
 * gap-free order, and the same client-consent rule as the public list.
 */
import fs from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { api, createUser, login, one, q, resetDb, sql } from "./helpers"

type Shot = { file_id: number; alt: string; share_token: string | null; mime: string | null } | null
type HeroRow = {
  id: number
  slug: string
  title: string
  hero_order: number
  brand_colour: string | null
  hero_word: string | null
  client_name?: string
  client_consent?: number
  hero_desktop: Shot
  hero_mobile: Shot
}

let editor: string

beforeEach(async () => {
  resetDb()
  createUser({ email: "editor@example.test", role: "editor" })
  editor = await login("editor@example.test")
})

async function create(body: Record<string, unknown>) {
  const r = await api<{ id: number; slug: string; error?: string }>("work.php?action=create", {
    body: { title: "Synthetic project", ...body },
    token: editor,
  })
  return r
}

async function published(slug: string, extra: Record<string, unknown> = {}): Promise<number> {
  const r = await create({ slug, status: "published", ...extra })
  expect(r.status).toBe(201)
  return r.json.id
}

const setHero = (id: number, on: boolean, token = editor) =>
  api<{ ok?: boolean; hero_order?: number | null; error?: string }>("work.php?action=setHero", { body: { id, on }, token })

const heroOrders = () =>
  sql("SELECT slug, hero_order FROM work WHERE hero_order IS NOT NULL ORDER BY hero_order").map(([s, o]) => [s, Number(o)])

function insertFile(): number {
  sql(`INSERT INTO files (name, \`stored\`, mime, size) VALUES ('shot.png', 'stored-synthetic.png', 'image/png', 10)`)
  return Number(one("SELECT MAX(id) FROM files"))
}

describe("setHero", () => {
  it("refuses a draft with the publish message", async () => {
    const draft = await create({ slug: "draft" })
    const r = await setHero(draft.json.id, true)
    expect(r.status).toBe(409)
    expect(r.json.error).toBe("Publish this record before putting it in the hero.")
    expect(one(`SELECT hero_order IS NULL FROM work WHERE id = ${draft.json.id}`)).toBe("1")
  })

  it("appends in order and refuses a sixth", async () => {
    const ids: number[] = []
    for (const s of ["a", "b", "c", "d", "e", "f"]) ids.push(await published(s))
    for (let i = 0; i < 5; i++) {
      const r = await setHero(ids[i], true)
      expect(r.status).toBe(200)
      expect(r.json.hero_order).toBe(i + 1)
    }
    const sixth = await setHero(ids[5], true)
    expect(sixth.status).toBe(409)
    expect(sixth.json.error).toBe("The hero holds 5 projects. Switch one off first.")
    expect(one("SELECT COUNT(*) FROM work WHERE hero_order IS NOT NULL")).toBe("5")
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'work_hero_on'")).toBe("5")
  })

  it("switching one off compacts the rest to 1..n", async () => {
    const ids = [await published("a"), await published("b"), await published("c")]
    for (const id of ids) await setHero(id, true)
    const off = await setHero(ids[0], false)
    expect(off.status).toBe(200)
    expect(heroOrders()).toEqual([["b", 1], ["c", 2]])
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'work_hero_off'")).toBe("1")
  })

  it("is idempotent and needs a real boolean", async () => {
    const id = await published("a")
    expect((await setHero(id, true)).json.hero_order).toBe(1)
    expect((await setHero(id, true)).json.hero_order).toBe(1)
    const bad = await api("work.php?action=setHero", { body: { id, on: "yes" }, token: editor })
    expect(bad.status).toBe(400)
  })

  it("refuses employee and client roles, and a signed-out caller", async () => {
    const id = await published("a")
    createUser({ email: "staff@example.test", role: "employee" })
    createUser({ email: "client@example.test", role: "client" })
    expect((await setHero(id, true, await login("staff@example.test"))).status).toBe(403)
    expect((await setHero(id, true, await login("client@example.test"))).status).toBe(403)
    expect((await api("work.php?action=setHero", { body: { id, on: true } })).status).toBe(401)
    expect((await api("work.php?action=heroOrder", { body: { ids: [id] } })).status).toBe(401)
  })
})

describe("leaving the hero", () => {
  it("unpublishing drops the record from the hero and compacts", async () => {
    const ids = [await published("a"), await published("b"), await published("c")]
    for (const id of ids) await setHero(id, true)
    const r = await api<{ hero_removed: boolean }>("work.php?action=publish", { body: { id: ids[1], status: "draft" }, token: editor })
    expect(r.status).toBe(200)
    expect(r.json.hero_removed).toBe(true)
    expect(heroOrders()).toEqual([["a", 1], ["c", 2]])
  })

  it("saving a record as a draft through update also drops it", async () => {
    const a = await published("a")
    const b = await published("b")
    await setHero(a, true)
    await setHero(b, true)
    const r = await api("work.php?action=update", { body: { id: a, title: "Synthetic project", slug: "a", status: "draft" }, token: editor })
    expect(r.status).toBe(200)
    expect(heroOrders()).toEqual([["b", 1]])
  })

  it("removing a record closes its gap", async () => {
    const ids = [await published("a"), await published("b"), await published("c")]
    for (const id of ids) await setHero(id, true)
    await api("work.php?action=remove", { body: { id: ids[0] }, token: editor })
    expect(heroOrders()).toEqual([["b", 1], ["c", 2]])
  })
})

describe("heroOrder", () => {
  it("sets 1..n from the list given", async () => {
    const ids = [await published("a"), await published("b"), await published("c")]
    for (const id of ids) await setHero(id, true)
    const r = await api("work.php?action=heroOrder", { body: { ids: [ids[2], ids[0], ids[1]] }, token: editor })
    expect(r.status).toBe(200)
    expect(heroOrders()).toEqual([["c", 1], ["a", 2], ["b", 3]])
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'work_hero_order'")).toBe("1")
  })

  it("refuses a partial list, a stranger, a duplicate and more than five", async () => {
    const ids = [await published("a"), await published("b"), await published("c")]
    await setHero(ids[0], true)
    await setHero(ids[1], true)
    const partial = await api("work.php?action=heroOrder", { body: { ids: [ids[1]] }, token: editor })
    expect(partial.status).toBe(409)
    const stranger = await api("work.php?action=heroOrder", { body: { ids: [ids[1], ids[2]] }, token: editor })
    expect(stranger.status).toBe(409)
    const dup = await api("work.php?action=heroOrder", { body: { ids: [ids[1], ids[1]] }, token: editor })
    expect(dup.status).toBe(400)
    const many = await api("work.php?action=heroOrder", { body: { ids: [1, 2, 3, 4, 5, 6] }, token: editor })
    expect(many.status).toBe(400)
    expect(heroOrders()).toEqual([["a", 1], ["b", 2]])
  })
})

describe("public hero action", () => {
  it("returns published hero records in order, with the consent rule", async () => {
    const named = await published("named", { client_name: "Synthetic Ltd", client_consent: 1, brand_colour: "#1a2b3c", hero_word: "dentists" })
    const anon = await published("anon", { hero_word: "local trades" })
    await published("not-in-hero")
    await setHero(anon, true)
    await setHero(named, true)
    // A stale flag on a draft must never reach the public, even if set by hand.
    const draft = await create({ slug: "sneaky" })
    sql(`UPDATE work SET hero_order = 3 WHERE id = ${draft.json.id}`)

    const r = await api<HeroRow[]>("work.php?action=hero")
    expect(r.status).toBe(200)
    expect(r.json.map((w) => w.slug)).toEqual(["anon", "named"])
    expect(r.json[0]).not.toHaveProperty("client_name")
    expect(r.json[1].client_name).toBe("Synthetic Ltd")
    expect(r.json[1].brand_colour).toBe("#1A2B3C")
    expect(r.json[0].hero_word).toBe("local trades")
    for (const w of r.json) expect(w).not.toHaveProperty("client_consent")
  })

  it("carries the screenshots with alt text and a permanent public token", async () => {
    const desk = insertFile()
    const phone = insertFile()
    const id = await published("shots", {
      hero_desktop_file_id: desk, hero_desktop_alt: "Booking page on a laptop",
      hero_mobile_file_id: phone, hero_mobile_alt: "Booking page on a phone",
    })
    await setHero(id, true)
    const [row] = (await api<HeroRow[]>("work.php?action=hero")).json
    expect(row.hero_desktop).toMatchObject({ file_id: desk, alt: "Booking page on a laptop", mime: "image/png" })
    expect(row.hero_desktop?.share_token).toMatch(/^[0-9a-f]{40}$/)
    expect(row.hero_mobile?.alt).toBe("Booking page on a phone")
    expect(one(`SELECT COUNT(*) FROM files WHERE share_token IS NOT NULL AND expires_at IS NULL`)).toBe("2")

    const list = await api<HeroRow[]>("work.php?action=list")
    expect(list.json[0].hero_order).toBe(1)
    expect(list.json[0].hero_desktop?.alt).toBe("Booking page on a laptop")
  })
})

describe("hero field validation", () => {
  it("refuses a bad colour, a three-word hero word and a screenshot without alt", async () => {
    expect((await create({ brand_colour: "red" })).status).toBe(400)
    expect((await create({ brand_colour: "#12345" })).status).toBe(400)
    expect((await create({ hero_word: "far too many" })).status).toBe(400)
    expect((await create({ hero_desktop_file_id: insertFile() })).status).toBe(400)
    expect((await create({ hero_mobile_alt: "orphan alt" })).status).toBe(400)
    expect(one("SELECT COUNT(*) FROM work")).toBe("0")
  })

  it("leaves stored hero fields alone when an update does not send them", async () => {
    const id = await published("keep", { brand_colour: "#ABCDEF", hero_word: "bakers" })
    const r = await api("work.php?action=update", { body: { id, title: "Renamed", slug: "keep", status: "published" }, token: editor })
    expect(r.status).toBe(200)
    expect(sql(`SELECT brand_colour, hero_word FROM work WHERE id = ${id}`)[0]).toEqual(["#ABCDEF", "bakers"])
    await api("work.php?action=update", { body: { id, title: "Renamed", slug: "keep", status: "published", brand_colour: null, hero_word: "" }, token: editor })
    expect(sql(`SELECT brand_colour, hero_word FROM work WHERE id = ${id}`)[0]).toEqual(["NULL", "NULL"])
  })

  it("refuses a deleted screenshot file", async () => {
    const f = insertFile()
    sql(`UPDATE files SET deleted_at = NOW() WHERE id = ${q(f)}`)
    const r = await create({ hero_desktop_file_id: f, hero_desktop_alt: "Gone" })
    expect(r.status).toBe(404)
  })
})

describe("before the migration", () => {
  // The ALTER recorded at the foot of server/schema.sql, uncommented.
  const migrate = fs.readFileSync(path.resolve(__dirname, "../../server/schema.sql"), "utf8")
    .match(/-- {3}ALTER TABLE work\n[\s\S]*?ADD KEY idx_hero \(hero_order\);/)![0]
    .replace(/^--\s{3}/gm, "")

  it("keeps every existing action working, returns an empty hero and refuses hero writes", async () => {
    sql(`ALTER TABLE work DROP KEY idx_hero, DROP COLUMN hero_order, DROP COLUMN brand_colour, DROP COLUMN hero_word,
         DROP COLUMN hero_desktop_file_id, DROP COLUMN hero_desktop_alt, DROP COLUMN hero_mobile_file_id, DROP COLUMN hero_mobile_alt`)
    try {
      const id = await published("old")
      const list = await api<HeroRow[]>("work.php?action=list")
      expect(list.status).toBe(200)
      expect(list.json[0]).toMatchObject({ slug: "old", hero_order: null, hero_desktop: null })
      expect((await api(`work.php?action=getAdmin&id=${id}`, { token: editor })).status).toBe(200)
      expect((await api("work.php?action=hero")).json).toEqual([])
      expect((await setHero(id, true)).status).toBe(503)
      // An empty hero field from a new form is ignored; a real value is refused.
      expect((await create({ slug: "blank", hero_word: "" })).status).toBe(201)
      expect((await create({ slug: "worded", hero_word: "bakers" })).status).toBe(503)
      expect((await api("work.php?action=publish", { body: { id, status: "draft" }, token: editor })).status).toBe(200)
    } finally {
      sql(migrate)
    }
  })
})
