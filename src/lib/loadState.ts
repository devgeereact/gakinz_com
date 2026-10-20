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
 * the request that is still current.
 */
import type { ApiResult } from "@/lib/api"
import type { ApiFailure } from "@/lib/notAvailable"

/** The request whose result last reached the screen. */
export type Settled = { nonce: number; key: unknown }

/** True until a result has settled for the request (nonce, key). */
export function isLoading(settled: Settled | null, nonce: number, key: unknown): boolean {
  return settled === null || settled.nonce !== nonce || !Object.is(settled.key, key)
}

/**
 * Starts one load and returns its cancel function. `run` is told whether the
 * load is still current, for screens that apply part of a result early.
 * `settle` is called once with the result unless cancel was called first:
 * the effect cleanup cancels on unmount and before a later request starts, so
 * a stale response can never overwrite a newer one.
 */
export function startLoad<R>(run: (active: () => boolean) => Promise<R>, settle: (result: R) => void): () => void {
  let active = true
  run(() => active).then((result) => {
    if (active) settle(result)
  })
  return () => {
    active = false
  }
}

/** What useLoad keeps for one api.ts list or record. */
export type LoadData<T> = {
  data: T
  /** The last load's error message, null once a load succeeds. */
  error: string | null
  /**
   * The last failed result in full (status, details), so a screen can tell
   * "not on the server yet" (notAvailableYet) from a real failure.
   */
  failure: ApiFailure | null
}

export function initialLoadData<T>(data: T): LoadData<T> {
  return { data, error: null, failure: null }
}

/**
 * Applies one api.ts result. Success replaces the data and clears the error;
 * failure keeps the data already shown and records the error, which is what
 * every screen did by hand before the hook.
 */
export function applyResult<T>(state: LoadData<T>, res: ApiResult<T>): LoadData<T> {
  if (res.ok) return { data: res.data, error: null, failure: null }
  return { data: state.data, error: res.error, failure: res }
}
