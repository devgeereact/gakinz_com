/**
 * API response headers (go-live hardening 2026-11-01): no PHP version, a CSP that lets a
 * JSON reply load nothing and never be framed, and no caching of authenticated replies.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createUser, login, resetDb } from "./helpers"

describe("API headers", () => {
  beforeEach(() => resetDb())

  it("hides the PHP version and sends the API security headers", async () => {
    const r = await api("api.php")
    expect(r.status).toBe(200)
    expect(r.headers.get("x-powered-by")).toBeNull()
    expect(r.headers.get("content-security-policy")).toBe("default-src 'none'; frame-ancestors 'none'")
    expect(r.headers.get("x-content-type-options")).toBe("nosniff")
    expect(r.headers.get("x-frame-options")).toBe("DENY")
  })

  it("marks authenticated replies no-store", async () => {
    createUser({ email: "owner@example.test", role: "super_admin" })
    const t = await login("owner@example.test")
    const r = await api("auth.php?action=me", { token: t })
    expect(r.status).toBe(200)
    expect(r.headers.get("cache-control")).toBe("no-store")
  })
})
