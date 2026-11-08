/**
 * Updates change only what they are sent, and an update, approve or assign for an id that does not exist
 * answers 404 (K-129, K-130). Before: blog, testimonials, content, clients, leads meta and dev meta reset
 * every field a request left out to a default, and several routes answered ok for a missing id.
 * Each route is exercised through the real PHP against a real database.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createUser, login, one, resetDb, sql } from "./helpers"

let admin: string

beforeEach(async () => {
  resetDb()
  createUser({ email: "admin@example.test", role: "admin" })
  admin = await login("admin@example.test")
})

const post = (path: string, body: Record<string, unknown>) => api<Record<string, unknown>>(path, { body, token: admin })

describe("blog.php update", () => {
  async function seed() {
    const r = await post("blog.php?action=create", {
      title: "Original title", excerpt: "Original excerpt", body: "Original body", category: "Guides",
      cover: "studio", read_mins: 9, status: "published",
    })
    return { id: Number(r.json.id), slug: String(r.json.slug) }
  }
  const row = (id: number) => sql(`SELECT title, excerpt, body, category, cover, read_mins, status, slug FROM posts WHERE id = ${id}`)[0]

  it("changes only the excerpt when only the excerpt is sent", async () => {
    const { id, slug } = await seed()
    const r = await post("blog.php?action=update", { id, excerpt: "New excerpt" })
    expect(r.status).toBe(200)
    expect(row(id)).toEqual(["Original title", "New excerpt", "Original body", "Guides", "studio", "9", "published", slug])
  })

  it("keeps a published post published, with its address, when the title is edited alone", async () => {
    const { id, slug } = await seed()
    expect((await post("blog.php?action=update", { id, title: "A better title" })).status).toBe(200)
    const [title, , , , , , status, newSlug] = row(id)
    expect(title).toBe("A better title")
    expect(status).toBe("published") // the old code reset this to draft: an unpublished live post
    expect(newSlug).toBe(slug) // and the retitle changed the public address
  })

  it("still lets a request change several fields at once", async () => {
    const { id } = await seed()
    await post("blog.php?action=update", { id, title: "T2", category: "News", read_mins: 3, status: "draft" })
    expect(row(id).slice(0, 1).concat(row(id).slice(3, 4), row(id).slice(5, 7))).toEqual(["T2", "News", "3", "draft"])
  })

  it("answers 404 for a post that does not exist", async () => {
    expect((await post("blog.php?action=update", { id: 99999, title: "x" })).status).toBe(404)
  })
})

describe("testimonials.php", () => {
  async function seed() {
    const r = await post("testimonials.php?action=create", { author: "Ann", quote: "Great", role: "CEO", company: "Acme", rating: 4, approved: true, sort_order: 7 })
    return Number(r.json.id)
  }
  const row = (id: number) => sql(`SELECT author, quote, role, company, rating, approved, sort_order FROM testimonials WHERE id = ${id}`)[0]

  it("keeps it approved, with its rating and order, when only the quote is edited", async () => {
    const id = await seed()
    expect((await post("testimonials.php?action=update", { id, quote: "Edited quote" })).status).toBe(200)
    expect(row(id)).toEqual(["Ann", "Edited quote", "CEO", "Acme", "4", "1", "7"])
  })

  it("still lets an update unapprove one on purpose", async () => {
    const id = await seed()
    await post("testimonials.php?action=update", { id, approved: false })
    expect(row(id)[5]).toBe("0")
  })

  it("answers 404 for update and approve on an id that does not exist", async () => {
    expect((await post("testimonials.php?action=update", { id: 99999, quote: "x" })).status).toBe(404)
    expect((await post("testimonials.php?action=approve", { id: 99999, approved: true })).status).toBe(404)
  })

  it("does not mistake a change that changes nothing for a missing id", async () => {
    const id = await seed() // already approved
    expect((await post("testimonials.php?action=approve", { id, approved: true })).status).toBe(200)
  })
})

describe("content.php update", () => {
  const row = (id: number) => sql(`SELECT topic, platform, title, body, hashtags, keywords FROM content_drafts WHERE id = ${id}`)[0]

  it("changes only the title when only the title is sent", async () => {
    const r = await post("content.php?action=create", { topic: "Topic", platform: "linkedin", title: "T", body: "Body", hashtags: "#a", keywords: "k" })
    const id = Number(r.json.id)
    expect((await post("content.php?action=update", { id, title: "New title" })).status).toBe(200)
    expect(row(id)).toEqual(["Topic", "linkedin", "New title", "Body", "#a", "k"])
  })

  it("answers 404 for a draft that does not exist", async () => {
    expect((await post("content.php?action=update", { id: 99999, title: "x" })).status).toBe(404)
  })
})

describe("clients.php update", () => {
  const row = (id: number) => sql(`SELECT company, contact_name, email, phone, tag, retainer_amount, notes FROM clients WHERE id = ${id}`)[0]

  it("keeps the retainer and contact details when only the notes are sent", async () => {
    const r = await post("clients.php?action=create", { company: "Acme", contact_name: "Ann", email: "ann@example.test", phone: "0123", tag: "retainer", retainer_amount: 250, notes: "n" })
    const id = Number(r.json.id)
    expect((await post("clients.php?action=update", { id, notes: "Changed" })).status).toBe(200)
    expect(row(id)).toEqual(["Acme", "Ann", "ann@example.test", "0123", "retainer", "250.00", "Changed"])
  })

  it("answers 404 for a client that does not exist", async () => {
    expect((await post("clients.php?action=update", { id: 99999, company: "x" })).status).toBe(404)
  })
})

describe("leads.php meta", () => {
  it("keeps the tags and score when only a follow-up is saved", async () => {
    sql(`INSERT INTO enquiries (name, email, message, tags, score) VALUES ('Lee', 'lee@example.test', 'Hi', 'vip', 2)`)
    const id = Number(one("SELECT MAX(id) FROM enquiries"))
    const r = await post("leads.php?action=meta", { id, next_action_note: "Call back" })
    expect(r.status).toBe(200)
    expect(sql(`SELECT tags, score, next_action_note FROM enquiries WHERE id = ${id}`)[0]).toEqual(["vip", "2", "Call back"])
  })

  it("still lets a request change the score on purpose", async () => {
    sql(`INSERT INTO enquiries (name, email, message, tags, score) VALUES ('Lee', 'lee@example.test', 'Hi', 'vip', 2)`)
    const id = Number(one("SELECT MAX(id) FROM enquiries"))
    await post("leads.php?action=meta", { id, score: 0 })
    expect(sql(`SELECT tags, score FROM enquiries WHERE id = ${id}`)[0]).toEqual(["vip", "0"])
  })

  it("answers 404 for a lead that does not exist", async () => {
    expect((await post("leads.php?action=meta", { id: 99999, tags: "x" })).status).toBe(404)
  })
})

describe("dev.php meta", () => {
  function project(): number {
    sql(`INSERT INTO projects (name, status) VALUES ('Site', 'in_progress')`)
    return Number(one("SELECT MAX(id) FROM projects"))
  }
  const row = (id: number) => sql(`SELECT repo_url, staging_url, prod_url, checklist FROM project_dev WHERE project_id = ${id}`)[0]

  it("keeps the saved links and checklist when only the live address is sent", async () => {
    const id = project()
    await post("dev.php?action=meta", { project_id: id, repo_url: "https://github.com/x/y", staging_url: "https://s.example.test", prod_url: "https://p.example.test", checklist: { a: true } })
    expect((await post("dev.php?action=meta", { project_id: id, prod_url: "https://p2.example.test" })).status).toBe(200)
    expect(row(id)).toEqual(["https://github.com/x/y", "https://s.example.test", "https://p2.example.test", '{"a":true}'])
  })

  it("answers 404 for a project that does not exist", async () => {
    expect((await post("dev.php?action=meta", { project_id: 99999, repo_url: "https://x.example.test" })).status).toBe(404)
  })
})

describe("support.php assign", () => {
  it("answers 404 for a ticket or an assignee that does not exist, and assigns a real one", async () => {
    const cid = createClient("Acme")
    sql(`INSERT INTO tickets (client_id, subject, body, status) VALUES (${cid}, 'Help', 'Please', 'open')`)
    const ticket = Number(one("SELECT MAX(id) FROM tickets"))
    const staff = Number(one("SELECT id FROM users WHERE email = 'admin@example.test'"))
    expect((await post("support.php?action=assign", { id: 99999, assignee_id: staff })).status).toBe(404)
    expect((await post("support.php?action=assign", { id: ticket, assignee_id: 99999 })).status).toBe(404)
    expect((await post("support.php?action=assign", { id: ticket, assignee_id: staff })).status).toBe(200)
    expect(one(`SELECT assignee_id FROM tickets WHERE id = ${ticket}`)).toBe(String(staff))
  })
})
