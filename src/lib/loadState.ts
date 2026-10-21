/**
 * The pure state logic behind useLoad and useLoader (src/hooks/use-load.ts).
 * Kept apart from React so it can be unit tested directly.
 *
 * The rule the hooks follow (react-hooks/set-state-in-effect, and
 * react.dev "You Might Not Need an Effect", "Fetching data"): an effect never
 * sets state synchronously. "Loading" is therefore derived, not stored: a load
 * is in progress until a result has settled for the current request, which is
 * the pair (nonce, key). Reload bumps the nonce in an event handler; a new key
 * starts a new load. State is only set when a response answers, and only for
 * the request that is still current. Data and error are stored with the key
 * they belong to, so a screen never shows another key's data or error.
 */
import type { ApiResult } from "@/lib/api"
import type { ApiFailure } from "@/lib/notAvailable"

/** What a load can be keyed on: a primitive, compared with Object.is. */
export type LoadKey = string | number | boolean | null | undefined

/** The request whose result last reached the screen. */
export type Settled = { nonce: number; key: LoadKey }

/** True until a result has settled for the request (nonce, key). */
export function isLoading(settled: Settled | null, nonce: number, key: LoadKey): boolean {
  return settled === null || settled.nonce !== nonce || !Object.is(settled.key, key)
}

/** What the error UI shows when a load throws instead of answering. */
export const LOAD_CRASH_ERROR = "Something went wrong while loading"

/** A load that threw, as a failure the screens' error UI already handles. */
export function crashFailure(): ApiFailure {
  return { ok: false, error: LOAD_CRASH_ERROR }
}

/**
 * Starts one load and returns its cancel function. `run` is told whether the
 * load is still current, for screens that apply part of a result early.
 * `settle` is called once with the result unless cancel was called first:
 * the effect cleanup cancels on unmount and before a later request starts, so
 * a stale response can never overwrite a newer one. If `run` throws or
 * rejects, or `settle` throws, the error is logged once and `fail` is called,
 * so the load still ends.
 */
export function startLoad<R>(
  run: (active: () => boolean) => Promise<R>,
  settle: (result: R) => void,
  fail: (error: unknown) => void,
): () => void {
  let active = true
  const report = (error: unknown) => {
    console.error("Load failed:", error)
    fail(error)
  }
  let pending: Promise<R>
  try {
    pending = run(() => active)
  } catch (error) {
    pending = Promise.reject(error)
  }
  pending.then(
    (result) => {
      if (!active) return
      try {
        settle(result)
      } catch (error) {
        report(error)
      }
    },
    (error) => {
      if (active) report(error)
    },
  )
  return () => {
    active = false
  }
}

/** What useLoad stores for one api.ts list or record, with its key. */
export type KeyedLoad<T> = {
  key: LoadKey
  data: T
  /** The last load's error message, null once a load succeeds. */
  error: string | null
  /**
   * The last failed result in full (status, details), so a screen can tell
   * "not on the server yet" (notAvailableYet) from a real failure.
   */
  failure: ApiFailure | null
}

/** What a screen reads: the stored load if it is for this key, else nothing yet. */
export type LoadView<T> = Omit<KeyedLoad<T>, "key">

export function initialLoad<T>(data: T, key: LoadKey): KeyedLoad<T> {
  return { key, data, error: null, failure: null }
}

/** The data and error for `key`; another key's data or error is never shown. */
export function viewFor<T>(state: KeyedLoad<T>, key: LoadKey, initial: T): LoadView<T> {
  if (Object.is(state.key, key)) return { data: state.data, error: state.error, failure: state.failure }
  return { data: initial, error: null, failure: null }
}

/**
 * Applies one api.ts result for `key`. Success replaces the data and clears
 * the error; failure keeps the data already shown for that key (or `initial`
 * for a new key) and records the error, which is what every screen did by
 * hand before the hook.
 */
export function applyResult<T>(state: KeyedLoad<T>, res: ApiResult<T>, key: LoadKey, initial: T): KeyedLoad<T> {
  if (res.ok) return { key, data: res.data, error: null, failure: null }
  return { key, data: viewFor(state, key, initial).data, error: res.error, failure: res }
}

/** Replaces or updates the data for `key` (optimistic edits), keeping that key's error. */
export function updateData<T>(state: KeyedLoad<T>, key: LoadKey, initial: T, update: T | ((prev: T) => T)): KeyedLoad<T> {
  const view = viewFor(state, key, initial)
  const data = typeof update === "function" ? (update as (prev: T) => T)(view.data) : update
  return { key, ...view, data }
}
