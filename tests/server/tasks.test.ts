/**
 * Tasks (Phase 7): a task can be edited, assigned and dated after it is created, and a status change to the
 * status it already has is not a "not found". Each route runs through the real PHP against a real database.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createUser, login, one, resetDb, sql } from "./helpers"

let staff: string
let projectId: number

beforeEach(async () => {
  resetDb()
  createUser({ email: "emp@example.test", role: "employee" })
  staff = await login("emp@example.test")
  sql("INSERT INTO projects (name, status) VALUES ('Synthetic Project', 'build')")
  projectId = Number(one("SELECT MAX(id) FROM projects"))
})

const post = (action: string, body: Record<string, unknown>, token = staff) =>
  api<Record<string, unknown> & { error?: string }>(`tasks.php?action=${action}`, { body, token })
const make = async (extra: Record<string, unknown> = {}) =>
  Number((await post("create", { project_id: projectId, title: "Original", assignee: "Ann", due_date: "2026-12-01", ...extra })).json.id)
const row = (id: number) => sql(`SELECT title, assignee, due_date, status FROM tasks WHERE id = ${id}`)[0]

describe("updating a task", () => {
  it("changes the title, assignee and due date", async () => {
    const id = await make()
    const r = await post("update", { id, title: "Renamed", assignee: "Bo", due_date: "2026-12-24" })
    expect(r.status).toBe(200)
    expect(row(id)).toEqual(["Renamed", "Bo", "2026-12-24", "todo"])
    const uid = one("SELECT id FROM users WHERE email = 'emp@example.test'")
    expect(sql("SELECT user_id, detail FROM audit_log WHERE action = 'task_update'")).toEqual([[uid, `#${id}`]])
  })

  it("changes only what is sent", async () => {
    const id = await make()
    await post("status", { id, status: "doing" })
    expect((await post("update", { id, assignee: "Cy" })).status).toBe(200)
    expect(row(id)).toEqual(["Original", "Cy", "2026-12-01", "doing"])
    expect((await post("update", { id, due_date: "2027-01-05" })).status).toBe(200)
    expect(row(id)).toEqual(["Original", "Cy", "2027-01-05", "doing"])
  })

  it("clears the assignee or the date when sent empty", async () => {
    const id = await make()
    expect((await post("update", { id, assignee: "", due_date: "" })).status).toBe(200)
    expect(sql(`SELECT assignee IS NULL, due_date IS NULL FROM tasks WHERE id = ${id}`)[0]).toEqual(["1", "1"])
  })

  it("trims and caps the text", async () => {
    const id = await make()
    await post("update", { id, title: "  Padded  ", assignee: " x".repeat(200) })
    const [title, assignee] = row(id)
    expect(title).toBe("Padded")
    expect(assignee.length).toBeLessThanOrEqual(120)
  })

  it.each([
    ["an empty title", { title: "   " }],
    ["a malformed date", { due_date: "05/12/2026" }],
    ["an impossible date", { due_date: "2026-02-30" }],
  ])("refuses %s and changes nothing", async (_l, patch) => {
    const id = await make()
    const before = row(id)
    expect((await post("update", { id, ...patch })).status).toBe(400)
    expect(row(id)).toEqual(before)
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'task_update'")).toBe("0")
  })

  it("answers 404 for a missing, deleted or unsent id", async () => {
    expect((await post("update", { id: 9999, title: "x" })).status).toBe(404)
    expect((await post("update", { title: "x" })).status).toBe(400)
    const id = await make()
    sql(`UPDATE tasks SET deleted_at = NOW() WHERE id = ${id}`)
    expect((await post("update", { id, title: "x" })).status).toBe(404)
  })

  it("is for staff only", async () => {
    const id = await make()
    createUser({ email: "trainer@example.test", role: "trainer" })
    createUser({ email: "portal@example.test", role: "client", clientId: createClient("Portal Ltd") })
    for (const email of ["trainer@example.test", "portal@example.test"]) {
      expect((await post("update", { id, title: "hacked" }, await login(email))).status).toBe(403)
    }
    expect((await post("update", { id, title: "hacked" }, "")).status).toBe(401)
    expect(row(id)[0]).toBe("Original")
  })
})

describe("creating a task", () => {
  it("refuses a malformed due date instead of failing in the database", async () => {
    const r = await post("create", { project_id: projectId, title: "Bad date", due_date: "next week" })
    expect(r.status).toBe(400)
    expect(one("SELECT COUNT(*) FROM tasks")).toBe("0")
  })
})

describe("moving a task", () => {
  it("accepts a move to the status it already has", async () => {
    const id = await make()
    expect((await post("status", { id, status: "todo" })).status).toBe(200)
    expect((await post("status", { id, status: "doing" })).status).toBe(200)
    expect((await post("status", { id, status: "doing" })).status).toBe(200)
    expect(row(id)[3]).toBe("doing")
  })

  it("still answers 404 for a missing task and 400 for a bad status", async () => {
    const id = await make()
    expect((await post("status", { id: 9999, status: "done" })).status).toBe(404)
    expect((await post("status", { id, status: "nope" })).status).toBe(400)
  })
})
