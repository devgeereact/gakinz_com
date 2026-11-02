/**
 * 2026-11-01 go-live hardening: staff-entered links are http(s) only (dev.php), and the
 * GitHub connector refuses dot segments that would move its token-bearing request to
 * another api.github.com path (github.php).
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createUser, login, one, resetDb, sql } from "./helpers"

let staff: string
let pid: number

beforeEach(async () => {
  resetDb()
  createUser({ email: "emp@example.test", role: "employee" })
  staff = await login("emp@example.test")
  const cid = createClient("Acme")
  sql(`INSERT INTO projects (client_id, name) VALUES (${cid}, 'Site')`)
  pid = Number(one("SELECT MAX(id) FROM projects"))
})

describe("dev.php links", () => {
  it("refuses a javascript: link and stores nothing", async () => {
    const r = await api("dev.php?action=meta", { token: staff, body: { project_id: pid, prod_url: "javascript:alert(1)" } })
    expect(r.status).toBe(400)
    expect(one(`SELECT COUNT(*) FROM project_dev WHERE project_id = ${pid}`)).toBe("0")
    const d = await api("dev.php?action=deploy", { token: staff, body: { project_id: pid, environment: "production", url: "data:text/html,x" } })
    expect(d.status).toBe(400)
  })

  it("accepts https links and empty ones", async () => {
    const r = await api("dev.php?action=meta", { token: staff, body: { project_id: pid, repo_url: "https://github.com/a/b", staging_url: "", prod_url: "https://example.test/" } })
    expect(r.status).toBe(200)
    const d = await api("dev.php?action=deploy", { token: staff, body: { project_id: pid, environment: "staging", url: "" } })
    expect(d.status).toBeLessThan(300)
  })
})

describe("github.php owner and repo", () => {
  it("refuses dot segments before any request is made", async () => {
    const r = await api(`github.php?url=${encodeURIComponent("https://github.com/../user")}`, { token: staff })
    expect(r.status).toBe(400)
    const r2 = await api(`github.php?url=${encodeURIComponent("https://github.com/owner/..")}`, { token: staff })
    expect(r2.status).toBe(400)
  })
})
