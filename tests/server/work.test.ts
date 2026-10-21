/**
 * The work ledger (server/work.php) against a real database: the public view
 * only ever shows published rows, a named client never goes public without
 * recorded consent, and an attached image stays publicly reachable.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createUser, login, one, q, resetDb, sql } from "./helpers"

type Work = { id: number; slug: string; status: string; client_name?: string; client_consent?: number; images?: Array<{ share_token: string | null; alt: string }> }

let editor: string

beforeEach(async () => {
  resetDb()
  createUser({ email: "editor@example.test", role: "editor" })
  editor = await login("editor@example.test")
})

async function create(body: Record<string, unknown>) {
  return api<{ id: number; slug: string; error?: string }>("work.php?action=create", { body: { title: "Synthetic project", ...body }, token: editor })
}

function insertFile(opts: { token?: string | null; expires?: string | null } = {}): number {
  sql(
    `INSERT INTO files (name, \`stored\`, mime, size, share_token, expires_at) VALUES ` +
      `('shot.png', 'stored-synthetic.png', 'image/png', 10, ${q(opts.token ?? null)}, ${opts.expires ?? "NULL"})`,
  )
  return Number(one("SELECT MAX(id) FROM files"))
}

describe("work access", () => {
  it("serves an empty public list to a signed-out visitor", async () => {
    const r = await api<Work[]>("work.php?action=list")
    expect(r.status).toBe(200)
    expect(r.json).toEqual([])
  })

  it("refuses the staff list without a token and to a role outside EDITORS", async () => {
    expect((await api("work.php?action=listAll")).status).toBe(401)
    createUser({ email: "staff@example.test", role: "employee" })
    const staff = await login("staff@example.test")
    expect((await api("work.php?action=listAll", { token: staff })).status).toBe(403)
    expect((await api("work.php?action=create", { body: { title: "x" }, token: staff })).status).toBe(403)
  })

  it("keeps a draft off the public list and the public detail page", async () => {
    const { json } = await create({ slug: "hidden-draft" })
    expect((await api<Work[]>("work.php?action=list")).json).toEqual([])
    expect((await api("work.php?action=get&slug=hidden-draft")).status).toBe(404)
    const admin = await api<Work>(`work.php?action=getAdmin&id=${json.id}`, { token: editor })
    expect(admin.status).toBe(200)
    expect(admin.json.status).toBe("draft")
  })
})

describe("client consent", () => {
  it("refuses to create a published record that names a client without consent", async () => {
    const r = await create({ client_name: "Synthetic Ltd", status: "published" })
    expect(r.status).toBe(409)
    expect(one("SELECT COUNT(*) FROM work")).toBe("0")
  })

  it("refuses to publish a stored draft that names a client without consent, and audits it", async () => {
    const { json } = await create({ client_name: "Synthetic Ltd" })
    const r = await api("work.php?action=publish", { body: { id: json.id }, token: editor })
    expect(r.status).toBe(409)
    expect(one(`SELECT status FROM work WHERE id = ${json.id}`)).toBe("draft")
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'work_publish_refused'")).toBe("1")
  })

  it("refuses an update that withdraws consent while keeping the record published", async () => {
    const { json } = await create({ client_name: "Synthetic Ltd", client_consent: 1, status: "published" })
    const r = await api("work.php?action=update", {
      body: { id: json.id, title: "Synthetic project", client_name: "Synthetic Ltd", client_consent: 0, status: "published" },
      token: editor,
    })
    expect(r.status).toBe(409)
    expect(one(`SELECT client_consent FROM work WHERE id = ${json.id}`)).toBe("1")
  })

  it("shows the client name publicly only with consent, and never exposes the consent flag", async () => {
    await create({ slug: "named", client_name: "Synthetic Ltd", client_consent: 1, status: "published" })
    await create({ slug: "unnamed", status: "published" })
    const named = await api<Work>("work.php?action=get&slug=named")
    expect(named.status).toBe(200)
    expect(named.json.client_name).toBe("Synthetic Ltd")
    expect(named.json).not.toHaveProperty("client_consent")

    const list = await api<Work[]>("work.php?action=list")
    expect(list.json.map((w) => w.slug).sort()).toEqual(["named", "unnamed"])
    const unnamed = list.json.find((w) => w.slug === "unnamed")!
    expect(unnamed).not.toHaveProperty("client_name")
    for (const w of list.json) expect(w).not.toHaveProperty("client_consent")
  })

  it("takes a published record back off the public site when unpublished", async () => {
    const { json } = await create({ slug: "going", status: "published" })
    await api("work.php?action=publish", { body: { id: json.id, status: "draft" }, token: editor })
    expect((await api("work.php?action=get&slug=going")).status).toBe(404)
  })
})

describe("validation", () => {
  it("refuses a duplicate slug on create and on update", async () => {
    await create({ slug: "same" })
    expect((await create({ slug: "same" })).status).toBe(409)
    const other = await create({ slug: "other" })
    const r = await api("work.php?action=update", { body: { id: other.json.id, title: "x", slug: "same" }, token: editor })
    expect(r.status).toBe(409)
  })

  it("refuses a link that is not http or https, and a malformed date", async () => {
    expect((await create({ live_url: "javascript:alert(1)" })).status).toBe(400)
    expect((await create({ started_on: "11/10/2026" })).status).toBe(400)
    expect(one("SELECT COUNT(*) FROM work")).toBe("0")
  })

  it("builds an ASCII slug from the title when none is given", async () => {
    const r = await create({ title: "Café Ordering — Phase 2" })
    expect(r.status).toBe(201)
    expect(r.json.slug).toBe("caf-ordering-phase-2")
  })
})

describe("images", () => {
  it("refuses an image without alt text", async () => {
    const { json } = await create({})
    const fileId = insertFile()
    const r = await api("work.php?action=addImage", { body: { work_id: json.id, file_id: fileId, alt: "  " }, token: editor })
    expect(r.status).toBe(400)
    expect(one("SELECT COUNT(*) FROM work_images")).toBe("0")
  })

  it("issues a permanent public link when an image is attached, and serves it on the public page", async () => {
    const { json } = await create({ slug: "with-image", status: "published" })
    const fileId = insertFile()
    const r = await api<{ share_token: string; token_issued: boolean }>("work.php?action=addImage", {
      body: { work_id: json.id, file_id: fileId, alt: "The order screen" },
      token: editor,
    })
    expect(r.status).toBe(201)
    expect(r.json.token_issued).toBe(true)
    expect(r.json.share_token).toMatch(/^[0-9a-f]{40}$/)
    expect(one(`SELECT expires_at IS NULL FROM files WHERE id = ${fileId}`)).toBe("1")

    const page = await api<Work>("work.php?action=get&slug=with-image")
    expect(page.json.images).toEqual([expect.objectContaining({ alt: "The order screen", share_token: r.json.share_token })])
  })

  it("keeps an existing link but lifts its expiry", async () => {
    const { json } = await create({})
    const token = "a".repeat(40)
    const fileId = insertFile({ token, expires: "DATE_ADD(NOW(), INTERVAL 7 DAY)" })
    const r = await api<{ share_token: string; token_issued: boolean; expiry_cleared: boolean }>("work.php?action=addImage", {
      body: { work_id: json.id, file_id: fileId, alt: "Dashboard" },
      token: editor,
    })
    expect(r.json).toMatchObject({ share_token: token, token_issued: false, expiry_cleared: true })
    expect(one(`SELECT expires_at IS NULL FROM files WHERE id = ${fileId}`)).toBe("1")
  })

  it("refuses a deleted file", async () => {
    const { json } = await create({})
    const fileId = insertFile()
    sql(`UPDATE files SET deleted_at = NOW() WHERE id = ${fileId}`)
    const r = await api("work.php?action=addImage", { body: { work_id: json.id, file_id: fileId, alt: "Gone" }, token: editor })
    expect(r.status).toBe(404)
  })

  it("refuses a file that is not an image, and does not make it public", async () => {
    const { json } = await create({})
    const fileId = insertFile()
    sql(`UPDATE files SET name = 'contract.pdf', mime = 'application/pdf' WHERE id = ${fileId}`)
    const r = await api("work.php?action=addImage", { body: { work_id: json.id, file_id: fileId, alt: "A contract" }, token: editor })
    expect(r.status).toBe(422)
    expect(one(`SELECT share_token FROM files WHERE id = ${fileId}`)).toBe("NULL")
  })

  it("removes a record's images with the record", async () => {
    const { json } = await create({})
    await api("work.php?action=addImage", { body: { work_id: json.id, file_id: insertFile(), alt: "One" }, token: editor })
    expect((await api("work.php?action=remove", { body: { id: json.id }, token: editor })).status).toBe(200)
    expect(one("SELECT COUNT(*) FROM work_images")).toBe("0")
  })
})

describe("ordering", () => {
  it("applies a reorder to the public list, featured records first", async () => {
    const a = await create({ slug: "a", status: "published" })
    const b = await create({ slug: "b", status: "published" })
    const c = await create({ slug: "c", status: "published", featured: 1 })
    await api("work.php?action=reorder", { body: { ids: [b.json.id, a.json.id, c.json.id] }, token: editor })
    const list = await api<Work[]>("work.php?action=list")
    expect(list.json.map((w) => w.slug)).toEqual(["c", "b", "a"])
  })
})
