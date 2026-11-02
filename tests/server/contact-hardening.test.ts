/**
 * Public enquiry form (contact.php), 2026-11-01 go-live hardening.
 * Only a JSON body is accepted. A cross-site page can send text/plain or a form
 * post from a visitor's browser without a CORS preflight; JSON cannot be sent that
 * way, so this stops other sites using visitors' browsers to fill the pipeline.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, one, resetDb } from "./helpers"

const ENQUIRY = { name: "Ada", email: "ada@example.test", message: "A site for my bakery, please." }

describe("contact.php body type", () => {
  beforeEach(() => resetDb())

  it("refuses a text/plain body with 415 and stores nothing", async () => {
    const r = await api("contact.php", { raw: JSON.stringify(ENQUIRY), headers: { "Content-Type": "text/plain" } })
    expect(r.status).toBe(415)
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("0")
  })

  it("refuses a form post", async () => {
    const r = await api("contact.php", { raw: "name=Ada&email=ada%40example.test&message=Hello+there+friend", headers: { "Content-Type": "application/x-www-form-urlencoded" } })
    expect(r.status).toBe(415)
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("0")
  })

  it("accepts the JSON the site sends, charset included", async () => {
    const r = await api("contact.php", { body: ENQUIRY, headers: { "Content-Type": "application/json; charset=utf-8" } })
    expect(r.status).toBe(201)
    expect(one("SELECT COUNT(*) FROM enquiries")).toBe("1")
  })
})
