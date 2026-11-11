/**
 * server/notfound.php (V1.2 item 5): server/.htaccess sends an unknown address
 * here, and it answers a real 404 with the site's own not-found page
 * (dist/404.html, in the document root beside it). It must not touch any other
 * 404: the API's JSON "not found" replies stay JSON.
 */
import fs from "node:fs"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { BASE, WORK_DIR } from "./env"
import { api, resetDb } from "./helpers"

const PAGE = path.join(WORK_DIR, "404.html")
const BUILT = "<!doctype html><title>Page not found · built page</title><div id=root>the built not-found page</div>"

describe("notfound.php", () => {
  beforeEach(() => resetDb())
  afterEach(() => fs.rmSync(PAGE, { force: true }))

  const expectHeaders = (r: Response) => {
    expect(r.status).toBe(404)
    expect(r.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(r.headers.get("x-robots-tag")).toBe("noindex")
    expect(r.headers.get("cache-control")).toBe("no-store")
    expect(r.headers.get("x-powered-by")).toBeNull()
  }

  it("answers 404 with the page, noindex and no-store", async () => {
    fs.writeFileSync(PAGE, BUILT)
    const r = await fetch(`${BASE}/notfound.php`)
    expectHeaders(r)
    expect(await r.text()).toBe(BUILT)
  })

  it("falls back to a short page when 404.html is missing", async () => {
    const r = await fetch(`${BASE}/notfound.php`)
    expectHeaders(r)
    const body = await r.text()
    expect(body).toContain("<title>Page not found")
    expect(body).toContain('href="/"')
    expect(body).not.toContain("<script")
  })

  it("the JSON 404 of blog.php for an unknown slug is still JSON", async () => {
    fs.writeFileSync(PAGE, BUILT)
    const r = await api<{ error?: string }>("blog.php?slug=no-such-post-anywhere")
    expect(r.status).toBe(404)
    expect(r.headers.get("content-type")).toMatch(/^application\/json/)
    expect(r.json.error).toBe("Post not found.")
  })
})
