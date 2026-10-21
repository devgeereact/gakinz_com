import { describe, expect, it } from "vitest"
import { resolveList, resolveOne } from "./cmsResult"

const double = (n: number) => n * 2

describe("resolveList", () => {
  it("uses the CMS list when the request succeeds", () => {
    expect(resolveList({ ok: true, data: [1, 2] }, double, [9])).toEqual({ items: [2, 4], fromCms: true })
  })

  it("treats a successful empty list as authoritative: nothing is published", () => {
    expect(resolveList({ ok: true, data: [] }, double, [9])).toEqual({ items: [], fromCms: true })
  })

  it("falls back on a network failure", () => {
    expect(resolveList({ ok: false, error: "Network error" }, double, [9])).toEqual({ items: [9], fromCms: false })
  })

  it("falls back on a server error", () => {
    expect(resolveList({ ok: false, error: "x", status: 500 }, double, [9])).toEqual({ items: [9], fromCms: false })
  })

  it("falls back when the request throws", () => {
    expect(resolveList(null, double, [9])).toEqual({ items: [9], fromCms: false })
  })

  it("falls back on a malformed success that is not a list", () => {
    expect(resolveList({ ok: true, data: null as unknown as number[] }, double, [9])).toEqual({
      items: [9],
      fromCms: false,
    })
  })
})

describe("resolveOne", () => {
  const map = (r: { slug: string }) => r.slug.toUpperCase()

  it("uses the CMS record when the request succeeds", () => {
    expect(resolveOne({ ok: true, data: { slug: "a" } }, map, "static")).toBe("A")
  })

  it("is a real not-found when the API answers 404, even if a static record has that slug", () => {
    expect(resolveOne({ ok: false, error: "Post not found.", status: 404 }, map, "static")).toBeNull()
  })

  it("falls back on a network failure", () => {
    expect(resolveOne({ ok: false, error: "Network error" }, map, "static")).toBe("static")
  })

  it("falls back on a server error", () => {
    expect(resolveOne({ ok: false, error: "x", status: 503 }, map, "static")).toBe("static")
  })

  it("falls back when the request throws", () => {
    expect(resolveOne(null, map, "static")).toBe("static")
  })

  it("falls back on a malformed success with no slug", () => {
    expect(resolveOne({ ok: true, data: {} as { slug: string } }, map, "static")).toBe("static")
  })

  it("is not-found on failure when there is no static record either", () => {
    expect(resolveOne({ ok: false, error: "Network error" }, map, null)).toBeNull()
  })
})
