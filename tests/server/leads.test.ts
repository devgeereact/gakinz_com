/**
 * Enquiry follow-ups: the owner can set a next-action date, a short note and a simple
 * priority on an enquiry. The endpoint must validate them, keep them staff only,
 * and keep working on a live database where the 2026-10-10 ALTER has not run.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createUser, login, one, q, resetDb, sql } from "./helpers"

type Row = {
  id: number
  tags: string | null
  score: number
  next_action_at?: string | null
  next_action_note?: string | null
  priority?: number
}

let token: string

function enquiry(name = "Synthetic Enquirer"): number {
  sql(
    `INSERT INTO enquiries (name, email, message) VALUES ` +
      `(${q(name)}, ${q(`${name.toLowerCase().replace(/\W/g, "")}@example.test`)}, 'Synthetic enquiry message')`,
  )
  return Number(one("SELECT MAX(id) FROM enquiries"))
}

const meta = (body: Record<string, unknown>, t = token) =>
  api<{ ok?: boolean; error?: string; followup?: boolean }>("leads.php?action=meta", { body, token: t })
const list = (t = token) => api<Row[] | { error: string }>("leads.php", { token: t })
const find = async (id: number) => ((await list()).json as Row[]).find((r) => r.id === id)

beforeEach(async () => {
  resetDb()
  sql("SET FOREIGN_KEY_CHECKS = 0; TRUNCATE TABLE enquiries; SET FOREIGN_KEY_CHECKS = 1;")
  createUser({ email: "owner@example.test", role: "super_admin" })
  token = await login("owner@example.test")
})

describe("enquiry follow-up fields", () => {
  it("lists a new enquiry with no follow-up and no priority", async () => {
    const id = enquiry()
    const r = await find(id)
    expect(r).toMatchObject({ next_action_at: null, next_action_note: null, priority: 0 })
  })

  it("saves and reads back the next action date, note and priority", async () => {
    const id = enquiry()
    const r = await meta({ id, tags: "web", score: 2, next_action_at: "2026-10-01", next_action_note: "  Chase the brief  ", priority: 3 })
    expect(r.status).toBe(200)
    expect(r.json.followup).toBe(true)
    expect(await find(id)).toMatchObject({
      tags: "web", score: 2, next_action_at: "2026-10-01", next_action_note: "Chase the brief", priority: 3,
    })
    expect(one(`SELECT COUNT(*) FROM audit_log WHERE action = 'lead_meta'`)).toBe("1")
  })

  it("clears the date and note when sent empty", async () => {
    const id = enquiry()
    await meta({ id, next_action_at: "2026-10-01", next_action_note: "Call", priority: 1 })
    await meta({ id, next_action_at: null, next_action_note: "", priority: 0 })
    expect(await find(id)).toMatchObject({ next_action_at: null, next_action_note: null, priority: 0 })
  })

  it("leaves the follow-up untouched when the fields are not sent", async () => {
    const id = enquiry()
    await meta({ id, next_action_at: "2026-10-01", next_action_note: "Call", priority: 2 })
    await meta({ id, tags: "later", score: 1 })
    expect(await find(id)).toMatchObject({ tags: "later", next_action_at: "2026-10-01", next_action_note: "Call", priority: 2 })
  })

  it("caps the note at 300 characters", async () => {
    const id = enquiry()
    await meta({ id, next_action_note: "x".repeat(400) })
    expect((await find(id))?.next_action_note).toHaveLength(300)
  })

  it.each(["01/10/2026", "2026-02-30", "2026-1-5", "tomorrow", 20261001])("rejects the date %s and changes nothing", async (bad) => {
    const id = enquiry()
    const r = await meta({ id, tags: "should-not-save", next_action_at: bad })
    expect(r.status).toBe(400)
    expect(r.json.error).toMatch(/date/i)
    expect(one(`SELECT tags IS NULL FROM enquiries WHERE id = ${id}`)).toBe("1")
  })

  it.each([-1, 4, "high", 1.5])("rejects the priority %s", async (bad) => {
    const id = enquiry()
    const r = await meta({ id, priority: bad })
    expect(r.status).toBe(400)
    expect(r.json.error).toMatch(/priority/i)
    expect(one(`SELECT priority FROM enquiries WHERE id = ${id}`)).toBe("0")
  })

  it("returns 404 for an unknown enquiry", async () => {
    const r = await meta({ id: 9999, priority: 1 })
    expect(r.status).toBe(404)
  })
})

describe("enquiry access", () => {
  it.each(["trainer", "employee"])("refuses a %s account on read and on update", async (role) => {
    const id = enquiry()
    createUser({ email: `${role}@example.test`, role })
    const staff = await login(`${role}@example.test`)
    expect((await list(staff)).status).toBe(403)
    const r = await meta({ id, priority: 3, next_action_at: "2026-10-01" }, staff)
    expect(r.status).toBe(403)
    expect(one(`SELECT priority FROM enquiries WHERE id = ${id}`)).toBe("0")
  })
})

describe("enquiries before the follow-up columns exist", () => {
  it("still lists and updates on an un-migrated database", async () => {
    const id = enquiry()
    sql("ALTER TABLE enquiries DROP COLUMN next_action_at, DROP COLUMN next_action_note, DROP COLUMN priority")
    try {
      const l = await list()
      expect(l.status).toBe(200)
      const row = (l.json as Row[]).find((r) => r.id === id)
      expect(row).toBeDefined()
      expect(row).not.toHaveProperty("priority")

      const r = await meta({ id, tags: "legacy", score: 1, next_action_at: "2026-10-01", next_action_note: "Call", priority: 2 })
      expect(r.status).toBe(200)
      expect(r.json.followup).toBe(false)
      expect(one(`SELECT tags FROM enquiries WHERE id = ${id}`)).toBe("legacy")
    } finally {
      sql(
        "ALTER TABLE enquiries " +
          "ADD COLUMN next_action_at DATE NULL DEFAULT NULL, " +
          "ADD COLUMN next_action_note VARCHAR(300) NULL DEFAULT NULL, " +
          "ADD COLUMN priority TINYINT NOT NULL DEFAULT 0",
      )
    }
  })
})
