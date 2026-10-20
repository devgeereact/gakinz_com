import { useCallback, useEffect, useEffectEvent, useState, type SetStateAction } from "react"
import type { ApiResult } from "@/lib/api"
import { applyResult, initialLoadData, isLoading, startLoad, type LoadData, type Settled } from "@/lib/loadState"

// Shared data loading for CMS screens (K-002). Follows react.dev "Synchronizing
// with Effects" (fetch in an effect, ignore the stale response in cleanup) and
// the react-hooks/set-state-in-effect rule: no state is set synchronously in
// the effect, loading is derived (src/lib/loadState.ts), and reload is an
// event that starts a new request. The latest request always wins, and
// nothing is applied after unmount.

/**
 * The general form, for a screen whose load is several requests or applies
 * its result to several pieces of state. `run` makes the requests (it is told
 * whether the load is still current, to apply part of it early); `apply` gets
 * the result of the current load only. `key` (a primitive) starts a new load
 * when it changes, as a dependency would.
 */
export function useLoader<R>(
  run: (active: () => boolean) => Promise<R>,
  apply: (result: R) => void,
  key: unknown = null,
): { loading: boolean; reload: () => void } {
  const [nonce, setNonce] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)
  const runLoad = useEffectEvent((active: () => boolean) => run(active))
  const applyLoad = useEffectEvent((result: R) => apply(result))

  useEffect(
    () =>
      startLoad(
        (active) => runLoad(active),
        (result) => {
          applyLoad(result)
          setSettled({ nonce, key })
        },
      ),
    [nonce, key],
  )

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { loading: isLoading(settled, nonce, key), reload }
}

/**
 * One api.ts request, the usual screen shape. Success replaces `data` and
 * clears `error`; failure keeps the data shown and sets `error` (and
 * `failure`, the full result for notAvailableYet). `setData` is for
 * optimistic updates.
 */
export function useLoad<T>(
  fetcher: () => Promise<ApiResult<T>>,
  initial: T,
  key: unknown = null,
): LoadData<T> & { loading: boolean; reload: () => void; setData: (update: SetStateAction<T>) => void } {
  const [state, setState] = useState<LoadData<T>>(() => initialLoadData(initial))
  const { loading, reload } = useLoader(
    () => fetcher(),
    (res) => setState((s) => applyResult(s, res)),
    key,
  )
  const setData = useCallback(
    (update: SetStateAction<T>) =>
      setState((s) => ({ ...s, data: typeof update === "function" ? (update as (prev: T) => T)(s.data) : update })),
    [],
  )
  return { ...state, loading, reload, setData }
}
