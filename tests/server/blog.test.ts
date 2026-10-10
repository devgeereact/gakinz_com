/**
 * Plan finding A06 / K-016: editing a post must never wipe its body. Editors
 * can load a full draft, and an update that omits body or excerpt keeps them.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createUser, login, one, resetDb } from "./helpers"

let token: string
let postId: number

beforeEach(async () => {
  resetDb()
  createUser({ email: "editor@example.test", role: "editor" })
  token = await login("editor@example.test")
  const r = await api<{ id: number }>("blog.php?action=create", {
    body: { title: "Synthetic draft", excerpt: "Short summary", body: "## Heading\n\nThe full article body.", status: "draft" },
    token,
  })
  postId = r.json.id
})

describe("blog editing", () => {
  it("lets an editor load a full draft by id", async () => {
    const r = await api<{ body: string; excerpt: string; status: string }>(`blog.php?id=${postId}`, { token })
    expect(r.status).toBe(200)
    expect(r.json.body).toBe("## Heading\n\nThe full article body.")
    expect(r.json.excerpt).toBe("Short summary")
    expect(r.json.status).toBe("draft")
  })

  it("does not show a draft by id to an anonymous visitor", async () => {
    const r = await api(`blog.php?id=${postId}`)
    expect(r.status).toBe(401)
  })

  it("keeps the body and excerpt when an update leaves them out", async () => {
    const r = await api("blog.php?action=update", { body: { id: postId, title: "Renamed draft", status: "draft" }, token })
    expect(r.status).toBe(200)
    expect(one(`SELECT title FROM posts WHERE id = ${postId}`)).toBe("Renamed draft")
    expect(one(`SELECT excerpt FROM posts WHERE id = ${postId}`)).toBe("Short summary")
    expect(one(`SELECT LENGTH(body) FROM posts WHERE id = ${postId}`)).toBe(String("## Heading\n\nThe full article body.".length))
  })

  it("still saves a deliberately changed body", async () => {
    await api("blog.php?action=update", { body: { id: postId, title: "Synthetic draft", body: "New body", status: "draft" }, token })
    expect(one(`SELECT body FROM posts WHERE id = ${postId}`)).toBe("New body")
  })
})
