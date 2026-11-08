import { describe, expect, it } from "vitest"
import { CHECKS, evaluate, findAssetPath, runChecks } from "./live-check.mjs"

const res = (status, headers = {}) => ({ status, headers: new Headers(headers) })

describe("evaluate", () => {
  it("passes when the status matches and nothing else is required", () => {
    expect(evaluate({ path: "/", status: 200 }, res(200)).ok).toBe(true)
  })

  it("names the path and both codes when the status is wrong", () => {
    const r = evaluate({ path: "/config.php", status: 403 }, res(200))
    expect(r.ok).toBe(false)
    expect(r.detail).toBe("/config.php answered 200, expected 403")
  })

  it("fails when a header that must be present is missing", () => {
    const check = { path: "/", status: 200, present: ["content-security-policy"] }
    const r = evaluate(check, res(200))
    expect(r.ok).toBe(false)
    expect(r.detail).toContain("content-security-policy")
  })

  it("fails when a header that must be absent is sent", () => {
    const check = { path: "/api.php", status: 200, absent: ["x-powered-by"] }
    expect(evaluate(check, res(200, { "x-powered-by": "PHP/8.4" })).ok).toBe(false)
    expect(evaluate(check, res(200)).ok).toBe(true)
  })

  it("requires every cache-control token, in any order", () => {
    const check = { path: "/assets/a.js", status: 200, includes: { "cache-control": ["max-age=31536000", "immutable"] } }
    expect(evaluate(check, res(200, { "cache-control": "public, immutable, max-age=31536000" })).ok).toBe(true)
    const weak = evaluate(check, res(200, { "cache-control": "public, max-age=60" }))
    expect(weak.ok).toBe(false)
    expect(weak.detail).toContain("immutable")
  })
})

describe("findAssetPath", () => {
  it("returns the first hashed index bundle referenced by the page", () => {
    const html = '<script type="module" src="/assets/index-BMBeNQHs.js"></script><link href="/assets/x.css">'
    expect(findAssetPath(html)).toBe("/assets/index-BMBeNQHs.js")
  })

  it("returns null when the page references no bundle", () => {
    expect(findAssetPath("<html></html>")).toBeNull()
  })
})

describe("CHECKS", () => {
  const byPath = (p) => CHECKS.filter((c) => c.path === p)

  it("covers the post-deploy list in docs/DEPLOYMENT.md section 5", () => {
    for (const p of ["/", "/work", "/services/web-design", "/login", "/app", "/robots.txt", "/llms.txt", "/sitemap.xml"]) {
      expect(byPath(p).some((c) => c.status === 200), p).toBe(true)
    }
    for (const p of ["/config.php", "/README.md", "/config.php.bak"]) {
      expect(byPath(p).some((c) => c.status === 403), p).toBe(true)
    }
    for (const p of ["/assets/", "/uploads/"]) {
      expect(byPath(p).some((c) => c.status === 404), p).toBe(true)
    }
  })

  it("expects the security headers on the home page and none that reveal PHP on the API", () => {
    const home = byPath("/").find((c) => c.present)
    expect(home.present).toEqual(expect.arrayContaining(["content-security-policy", "strict-transport-security"]))
    expect(byPath("/api.php").find((c) => c.absent).absent).toContain("x-powered-by")
  })

  it("requires the hashed bundle to be cached for a year and immutable", () => {
    const bundle = CHECKS.find((c) => c.name === "hashed bundle is cached for a year")
    expect(bundle.includes["cache-control"]).toEqual(expect.arrayContaining(["max-age=31536000", "immutable"]))
  })

  it("only ever reads: no check carries a method other than GET", () => {
    expect(CHECKS.every((c) => (c.method ?? "GET") === "GET")).toBe(true)
  })
})

describe("runChecks", () => {
  const home = '<script src="/assets/index-ABC123.js"></script>'
  const fakeFetch = (table) => async (url) => {
    const path = new URL(url).pathname + new URL(url).search
    const hit = table[path]
    if (hit === "throw") throw new Error("connect ECONNREFUSED")
    if (!hit) return { status: 404, headers: new Headers(), text: async () => "" }
    return { status: hit.status, headers: new Headers(hit.headers ?? {}), text: async () => hit.body ?? "" }
  }

  it("fetches the bundle named by the home page and judges its cache headers", async () => {
    const seen = []
    const table = {
      "/": { status: 200, body: home, headers: { "content-security-policy": "x", "strict-transport-security": "y" } },
      "/assets/index-ABC123.js": { status: 200, headers: { "cache-control": "public, max-age=31536000, immutable" } },
    }
    const f = fakeFetch(table)
    const results = await runChecks("https://example.test", async (u, o) => {
      seen.push(new URL(u).pathname)
      return f(u, o)
    })
    expect(seen).toContain("/assets/index-ABC123.js")
    expect(results.find((r) => r.path === "/assets/index-ABC123.js").ok).toBe(true)
  })

  it("reports a network failure as a failed check, not a crash", async () => {
    const results = await runChecks("https://example.test", fakeFetch({ "/": "throw" }))
    const root = results.find((r) => r.path === "/")
    expect(root.ok).toBe(false)
    expect(root.detail).toContain("ECONNREFUSED")
  })

  it("marks the bundle check as failed when the home page names no bundle", async () => {
    const results = await runChecks("https://example.test", fakeFetch({ "/": { status: 200, body: "<html></html>" } }))
    const bundle = results.find((r) => r.name === "hashed bundle is cached for a year")
    expect(bundle.ok).toBe(false)
    expect(bundle.detail).toContain("no /assets/index-")
  })
})
