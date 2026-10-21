import { afterEach, describe, expect, it, vi } from "vitest"
import { BAD_REPLY_ERROR, NETWORK_ERROR, api, parseJsonBody, statusError } from "./api"

// The shared request helper must never put a browser or parser message
// ("Failed to fetch", "Unexpected token '<'") on screen.
describe("api failures in plain language", () => {
  afterEach(() => vi.unstubAllGlobals())

  const reply = (status: number, text: string) =>
    vi.stubGlobal("fetch", vi.fn(async () => new Response(text, { status })))

  it("parses JSON and rejects anything else", () => {
    expect(parseJsonBody("")).toBeNull()
    expect(parseJsonBody('{"a":1}')).toEqual({ a: 1 })
    expect(parseJsonBody("<!doctype html>")).toBeUndefined()
  })

  it("maps a network failure to a plain message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch") }))
    expect(await api.post("/contact.php", {})).toEqual({ ok: false, error: NETWORK_ERROR })
  })

  it("maps an HTML error page on a 500 to a plain message", async () => {
    reply(500, "<html>Internal Server Error</html>")
    const r = await api.get("/blog.php")
    expect(r).toMatchObject({ ok: false, status: 500, error: statusError(500) })
    expect(statusError(500)).not.toMatch(/500/)
  })

  it("keeps the server's own error text when it sends one", async () => {
    reply(422, '{"error":"Enter a valid email address."}')
    expect(await api.post("/contact.php", {})).toMatchObject({ ok: false, error: "Enter a valid email address." })
  })

  it("treats a 200 that is not JSON as a failure, not as data", async () => {
    reply(200, "<!doctype html><title>app</title>")
    expect(await api.get("/site.php?action=get")).toEqual({ ok: false, error: BAD_REPLY_ERROR, status: 200 })
  })
})
