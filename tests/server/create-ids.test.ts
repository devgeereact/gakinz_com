/**
 * Plan finding A30: create endpoints returned $conn->insert_id after audit()
 * had inserted its own row, so the caller received the audit-log id instead of
 * the new record's id.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createUser, login, one, resetDb, sql } from "./helpers"

let token: string
beforeEach(async () => {
  resetDb()
  createUser({ email: "owner@example.test", role: "super_admin" })
  token = await login("owner@example.test")
  // Push audit_log ids well ahead of other tables so a mix-up cannot pass by luck.
  for (let i = 0; i < 5; i++) sql("INSERT INTO audit_log (action, detail) VALUES ('padding', '')")
})

describe("create endpoints return the new record's id", () => {
  it("clients", async () => {
    const r = await api<{ id: number }>("clients.php?action=create", { body: { company: "Synthetic Ltd" }, token })
    expect(r.status).toBe(201)
    expect(one(`SELECT company FROM clients WHERE id = ${r.json.id}`)).toBe("Synthetic Ltd")
  })

  it("projects", async () => {
    const r = await api<{ id: number }>("projects.php?action=create", { body: { name: "Synthetic project" }, token })
    expect(r.status).toBe(201)
    expect(one(`SELECT name FROM projects WHERE id = ${r.json.id}`)).toBe("Synthetic project")
  })

  it("blog posts", async () => {
    const r = await api<{ id: number }>("blog.php?action=create", { body: { title: "Synthetic post", status: "draft" }, token })
    expect(r.status).toBe(201)
    expect(one(`SELECT title FROM posts WHERE id = ${r.json.id}`)).toBe("Synthetic post")
  })
})
