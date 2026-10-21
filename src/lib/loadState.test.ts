import { afterEach, describe, expect, it, vi } from "vitest"
import type { ApiResult } from "@/lib/api"
import { notAvailableYet } from "@/lib/notAvailable"
import {
  LOAD_CRASH_ERROR,
  applyResult,
  crashFailure,
  initialLoad,
  isLoading,
  startLoad,
  updateData,
  viewFor,
  type KeyedLoad,
  type Settled,
} from "./loadState"

// A request the test answers by hand, so the order of responses is controlled.
function deferred<R>() {
  let resolve!: (r: R) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<R>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
const flush = () => new Promise((r) => setTimeout(r, 0))
const EMPTY: string[] = []
const never = () => {
  throw new Error("fail should not be called")
}

describe("applyResult", () => {
  it("replaces the data and clears an earlier error on success", () => {
    const failed: KeyedLoad<number[]> = { key: null, data: [1], error: "Server error", failure: { ok: false, error: "Server error", status: 500 } }
    expect(applyResult(failed, { ok: true, data: [2, 3] }, null, [])).toEqual({ key: null, data: [2, 3], error: null, failure: null })
  })

  it("keeps the data already shown and records the error on failure", () => {
    const shown = initialLoad(["a", "b"], null)
    const next = applyResult(shown, { ok: false, error: "Network error" }, null, EMPTY)
    expect(next.data).toBe(shown.data)
    expect(next.error).toBe("Network error")
  })

  it("passes the full failure through, so a 503 still reads as not available yet", () => {
    const res: ApiResult<string[]> = { ok: false, error: "Service unavailable", status: 503 }
    const next = applyResult(initialLoad(EMPTY, null), res, null, EMPTY)
    expect(next.failure).toBe(res)
    expect(next.failure && notAvailableYet(next.failure)).toBe(true)
  })

  it("keeps a record-level 404 with a JSON body as a real failure", () => {
    const res: ApiResult<string[]> = { ok: false, error: "Client not found.", status: 404, details: { error: "Client not found." } }
    const next = applyResult(initialLoad(EMPTY, null), res, null, EMPTY)
    expect(next.failure && notAvailableYet(next.failure)).toBe(false)
  })
})

describe("data and error belong to their key", () => {
  // Project 1's tasks are on screen; the board switches to project 2.
  const project1: KeyedLoad<string[]> = { key: 1, data: ["p1 task"], error: null, failure: null }

  it("shows the initial value, not the previous key's data, while the new key loads", () => {
    expect(viewFor(project1, 2, EMPTY)).toEqual({ data: EMPTY, error: null, failure: null })
  })

  it("does not show the previous key's error after a key change", () => {
    const failed1: KeyedLoad<string[]> = { ...project1, error: "Down", failure: { ok: false, error: "Down" } }
    expect(viewFor(failed1, 2, EMPTY).error).toBeNull()
  })

  it("shows the new key's data once its load succeeds", () => {
    const next = applyResult(project1, { ok: true, data: ["p2 task"] }, 2, EMPTY)
    expect(viewFor(next, 2, EMPTY).data).toEqual(["p2 task"])
  })

  it("shows the initial value with the error when the new key's load fails", () => {
    const next = applyResult(project1, { ok: false, error: "Network error" }, 2, EMPTY)
    expect(viewFor(next, 2, EMPTY)).toEqual({ data: EMPTY, error: "Network error", failure: { ok: false, error: "Network error" } })
  })

  it("applies an optimistic edit to the current key's data and keeps its error", () => {
    const failed: KeyedLoad<string[]> = { key: 1, data: ["a"], error: "Down", failure: { ok: false, error: "Down" } }
    expect(updateData(failed, 1, EMPTY, (xs) => [...xs, "b"])).toEqual({ ...failed, data: ["a", "b"] })
  })

  it("applies an optimistic edit after a key change to the initial value, not the old data", () => {
    expect(updateData(project1, 2, EMPTY, (xs) => [...xs, "new"])).toEqual({ key: 2, data: ["new"], error: null, failure: null })
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
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("settles with the result of the request", async () => {
    const got: string[] = []
    startLoad(async () => "ok", (r) => got.push(r), never)
    await flush()
    expect(got).toEqual(["ok"])
  })

  it("settles a failed api result like any other result", async () => {
    const got: ApiResult<number>[] = []
    startLoad(async (): Promise<ApiResult<number>> => ({ ok: false, error: "Down" }), (r) => got.push(r), never)
    await flush()
    expect(got).toEqual([{ ok: false, error: "Down" }])
  })

  it("applies nothing after cancel, as on unmount", async () => {
    const req = deferred<string>()
    const got: string[] = []
    const cancel = startLoad(() => req.promise, (r) => got.push(r), never)
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
    const cancelFirst = startLoad(() => first.promise, (r) => got.push(r), never)
    cancelFirst()
    startLoad(() => second.promise, (r) => got.push(r), never)
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
      never,
    )
    cancel()
    req.resolve()
    await flush()
    expect(seen).toEqual([true, false])
  })

  it("ends a load whose request rejects, logging the error once", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const failed: unknown[] = []
    const req = deferred<string>()
    startLoad(() => req.promise, () => {}, (e) => failed.push(e))
    const boom = new Error("offline")
    req.reject(boom)
    await flush()
    expect(failed).toEqual([boom])
    expect(log).toHaveBeenCalledTimes(1)
  })

  it("ends a load whose run throws before returning a promise", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const failed: unknown[] = []
    startLoad(
      () => {
        throw new Error("bad")
      },
      () => {},
      (e) => failed.push(e),
    )
    await flush()
    expect(failed).toHaveLength(1)
  })

  it("ends a load whose apply step throws", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const failed: unknown[] = []
    startLoad(
      async () => "ok",
      () => {
        throw new Error("apply broke")
      },
      (e) => failed.push(e),
    )
    await flush()
    expect(failed).toHaveLength(1)
    expect(log).toHaveBeenCalledTimes(1)
  })

  it("reports nothing for a rejection that arrives after cancel", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const req = deferred<string>()
    const cancel = startLoad(() => req.promise, () => {}, never)
    cancel()
    req.reject(new Error("late"))
    await flush()
    expect(log).not.toHaveBeenCalled()
  })

  it("turns a crash into a failure the error UI can show", () => {
    const next = applyResult(initialLoad(["kept"], null), crashFailure(), null, EMPTY)
    expect(next.error).toBe(LOAD_CRASH_ERROR)
    expect(next.data).toEqual(["kept"])
    expect(next.failure && notAvailableYet(next.failure)).toBe(false)
  })
})
