import { useCallback, useEffect, useEffectEvent, useState, type SetStateAction } from "react"
import type { ApiResult } from "@/lib/api"
import {
  applyResult,
  crashFailure,
  initialLoad,
  isLoading,
  startLoad,
  updateData,
  viewFor,
  type KeyedLoad,
  type LoadKey,
  type LoadView,
  type Settled,
} from "@/lib/loadState"

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
 * the result of the current load only, with the key it was loaded for. `key`
 * starts a new load when it changes, as a dependency would. If the load
 * throws, the error is logged, `onError` is called and loading ends.
 */
export function useLoader<R>(
  run: (active: () => boolean) => Promise<R>,
  apply: (result: R, key: LoadKey) => void,
  key: LoadKey = null,
  onError?: (error: unknown, key: LoadKey) => void,
): { loading: boolean; reload: () => void } {
  const [nonce, setNonce] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)
  const runLoad = useEffectEvent((active: () => boolean) => run(active))
  const applyLoad = useEffectEvent((result: R, loadKey: LoadKey) => apply(result, loadKey))
  const failLoad = useEffectEvent((error: unknown, loadKey: LoadKey) => onError?.(error, loadKey))

  useEffect(
    () =>
      startLoad(
        (active) => runLoad(active),
        (result) => {
          applyLoad(result, key)
          setSettled({ nonce, key })
        },
        (error) => {
          setSettled({ nonce, key })
          failLoad(error, key)
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
 * `failure`, the full result for notAvailableYet). Data and error belong to
 * the key they were loaded for: after a key change the screen sees `initial`
 * and no error until the new key's load answers.
 *
 * `setData` is for optimistic updates. An edit made while a load is in
 * flight is overwritten by that load's result, as it was before the hook; a
 * screen that must keep such an edit should call `reload` after saving it.
 */
export function useLoad<T>(
  fetcher: () => Promise<ApiResult<T>>,
  initial: T,
  key: LoadKey = null,
): LoadView<T> & { loading: boolean; reload: () => void; setData: (update: SetStateAction<T>) => void } {
  // The first `initial` is kept, so a literal such as [] keeps one identity.
  const [initialData] = useState(initial)
  const [state, setState] = useState<KeyedLoad<T>>(() => initialLoad(initialData, key))
  const { loading, reload } = useLoader(
    () => fetcher(),
    (res, loadKey) => setState((s) => applyResult(s, res, loadKey, initialData)),
    key,
    (_error, loadKey) => setState((s) => applyResult(s, crashFailure(), loadKey, initialData)),
  )
  const setData = useCallback(
    (update: SetStateAction<T>) => setState((s) => updateData(s, key, initialData, update)),
    [key, initialData],
  )
  return { ...viewFor(state, key, initialData), loading, reload, setData }
}
