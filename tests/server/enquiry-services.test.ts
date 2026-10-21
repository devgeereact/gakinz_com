/**
 * The enquiry form's service choice (spec 7, Task 20) against server/contact.php.
 * The form sends the website's own service names, or "Something else", in the
 * existing projectType field. contact.php keeps no list of its own, so every
 * new name and every older value (a former service name, a package
 * carried from Pricing) is stored as sent, an over-long value is cut to the
 * column as before, and the message check and the throttle still hold.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, one, resetDb, sql } from "./helpers"
import { services } from "../../src/marketing/data/site"

const send = (projectType: string | undefined, extra: Record<string, unknown> = {}) =>
  api<{ id?: number; error?: string }>("contact.php", {
    body: { name: "Synthetic Buyer", email: "buyer@example.test", message: "We need help with our office email.", projectType, ...extra },
  })

// Five enquiries per address per window; clear the counter between batches.
const clearThrottle = () => sql("DELETE FROM audit_log WHERE action = 'enquiry_submit'")

beforeEach(() => resetDb())

describe("service choice on an enquiry", () => {
  it("stores each of the six service names and Something else exactly as sent", async () => {
    const names = [...services.map((s) => s.title), "Something else"]
    expect(names).toHaveLength(7)
    for (const name of names) {
      clearThrottle()
      const r = await send(name)
      expect(r.status, `${name}: ${JSON.stringify(r.json)}`).toBe(201)
      expect(one(`SELECT project_type FROM enquiries WHERE id = ${r.json.id}`)).toBe(name)
    }
    expect(one("SELECT COUNT(DISTINCT project_type) FROM enquiries")).toBe("7")
  })

  it("still accepts an older project type, a package name and no choice at all", async () => {
    const a = await send("Care and support")
    const b = await send("Business")
    const c = await send(undefined)
    expect([a.status, b.status, c.status]).toEqual([201, 201, 201])
    expect(one(`SELECT project_type FROM enquiries WHERE id = ${a.json.id}`)).toBe("Care and support")
    expect(one(`SELECT project_type FROM enquiries WHERE id = ${b.json.id}`)).toBe("Business")
    expect(one(`SELECT COALESCE(project_type, '') = '' FROM enquiries WHERE id = ${c.json.id}`)).toBe("1")
  })

  it("cuts an over-long value to the column, refuses a thin message, and keeps the throttle", async () => {
    const long = await send("x".repeat(150))
    expect(long.status).toBe(201)
    expect(one(`SELECT CHAR_LENGTH(project_type) FROM enquiries WHERE id = ${long.json.id}`)).toBe("100")
    expect((await send("General IT support", { message: "short" })).status).toBe(400)
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("1")
    clearThrottle()
    for (let i = 0; i < 5; i++) expect((await send("IT consultancy")).status).toBe(201)
    expect((await send("IT consultancy")).status).toBe(429)
    expect(one("SELECT COUNT(*) FROM enquiries WHERE project_type = 'IT consultancy'")).toBe("5")
  })
})
