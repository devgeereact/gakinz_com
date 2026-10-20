import { describe, expect, it } from "vitest"
import type { ApiResult } from "@/lib/api"
import { notAvailableYet } from "@/lib/notAvailable"
import { applyResult, initialLoadData, isLoading, startLoad, type Settled } from "./loadState"

// A request the test answers by hand, so the order of responses is controlled.
function deferred<R>() {
  let resolve!: (r: R) => void
  const promise = new Promise<R>((r) => {
    resolve = r
  })
  return { promise, resolve }
}
const flush = () => new Promise((r) => setTimeout(r, 0))

describe("applyResult", () => {
  it("replaces the data and clears an earlier error on success", () => {
    const failed = { data: [1], error: "Server error", failure: { ok: false as const, error: "Server error", status: 500 } }
    expect(applyResult(failed, { ok: true, data: [2, 3] })).toEqual({ data: [2, 3], error: null, failure: null })
  })

  it("keeps the data already shown and records the error on failure", () => {
    const shown = initialLoadData(["a", "b"])
    const next = applyResult(shown, { ok: false, error: "Network error" })
    expect(next.data).toBe(shown.data)
    expect(next.error).toBe("Network error")
  })

  it("passes the full failure through, so a 503 still reads as not available yet", () => {
    const res: ApiResult<string[]> = { ok: false, error: "Service unavailable", status: 503 }
    const next = applyResult(initialLoadData<string[]>([]), res)
    expect(next.failure).toBe(res)
    expect(next.failure && notAvailableYet(next.failure)).toBe(true)
  })

  it("keeps a record-level 404 with a JSON body as a real failure", () => {
    const res: ApiResult<string[]> = { ok: false, error: "Client not found.", status: 404, details: { error: "Client not found." } }
    const next = applyResult(initialLoadData<string[]>([]), res)
    expect(next.failure && notAvailableYet(next.failure)).toBe(false)
  })
})

describe("isLoading", () => {
  it("is loading before anything has settled", () => {
    expect(isLoading(null, 0, null)).toBe(true)
  })

  it("stops once the current request settles", () => {
    expect(isLoading({ nonce: 0, key: null }, 0, null)).toBe(false)
  })

  it("is loading again at once after reload bumps the nonce", () => {
    const settled: Settled = { nonce: 0, key: null }
    expect(isLoading(settled, 1, null)).toBe(true)
  })

  it("is loading again when the key changes, until the new key settles", () => {
    expect(isLoading({ nonce: 0, key: 7 }, 0, 8)).toBe(true)
    expect(isLoading({ nonce: 0, key: 8 }, 0, 8)).toBe(false)
  })
})

describe("startLoad", () => {
  it("settles with the result of the request", async () => {
    const got: string[] = []
    startLoad(async () => "ok", (r) => got.push(r))
    await flush()
    expect(got).toEqual(["ok"])
  })

  it("settles a failed api result like any other result", async () => {
    const got: ApiResult<number>[] = []
    startLoad(async (): Promise<ApiResult<number>> => ({ ok: false, error: "Down" }), (r) => got.push(r))
    await flush()
    expect(got).toEqual([{ ok: false, error: "Down" }])
  })

  it("applies nothing after cancel, as on unmount", async () => {
    const req = deferred<string>()
    const got: string[] = []
    const cancel = startLoad(() => req.promise, (r) => got.push(r))
    cancel()
    req.resolve("late")
    await flush()
    expect(got).toEqual([])
  })

  it("lets the later reload win when the earlier response arrives last", async () => {
    // The hook's effect cleanup cancels the first load before the second starts.
    const first = deferred<string>()
    const second = deferred<string>()
    const got: string[] = []
    const cancelFirst = startLoad(() => first.promise, (r) => got.push(r))
    cancelFirst()
    startLoad(() => second.promise, (r) => got.push(r))
    second.resolve("new")
    await flush()
    first.resolve("stale")
    await flush()
    expect(got).toEqual(["new"])
  })

  it("tells run whether the load is still current, for results applied early", async () => {
    const seen: boolean[] = []
    const req = deferred<void>()
    const cancel = startLoad(
      async (active) => {
        seen.push(active())
        await req.promise
        seen.push(active())
      },
      () => {},
    )
    cancel()
    req.resolve()
    await flush()
    expect(seen).toEqual([true, false])
  })
})
