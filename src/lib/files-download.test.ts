import { afterEach, describe, expect, it, vi } from "vitest"

// The build the owner signs in with has Clerk on and no legacy session token stored (K-127).
vi.mock("@/lib/clerk", () => ({
  clerkEnabled: true,
  clerkToken: async () => ({ kind: "token", token: "clerk-session-jwt" }),
  clerkSignOut: async () => {},
}))

import { files } from "./api"

describe("files.download (staff, K-127)", () => {
  afterEach(() => vi.unstubAllGlobals())

  const answer = (status: number, body: string, headers: Record<string, string>) => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(body, { status, headers }))
    vi.stubGlobal("fetch", fetchMock)
    return fetchMock
  }

  it("sends the Clerk token when no legacy token is stored", async () => {
    const fetchMock = answer(200, "%PDF-1.7 test", {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="brief.pdf"',
    })
    const r = await files.download(7)
    expect(r.ok).toBe(true)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/files.php?download=7")
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer clerk-session-jwt")
  })

  it("hands back the file under the name the server gave it", async () => {
    answer(200, "data", { "Content-Type": "image/png", "Content-Disposition": 'attachment; filename="logo.png"' })
    const r = await files.download(3)
    expect(r.ok && (r.data as File).name).toBe("logo.png")
  })

  it("shows the server's own words when the file is not found", async () => {
    answer(404, '{"error":"File not found."}', { "Content-Type": "application/json" })
    expect(await files.download(99)).toMatchObject({ ok: false, status: 404, error: "File not found." })
  })

  it("refuses a 200 that is really a page, so it is never saved as the file", async () => {
    answer(200, "<!doctype html><title>app</title>", { "Content-Type": "text/html" })
    const r = await files.download(5)
    expect(r.ok).toBe(false)
  })
})
