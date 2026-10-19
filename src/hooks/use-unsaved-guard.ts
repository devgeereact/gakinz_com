import { useCallback, useEffect, useState } from "react"
import { useBlocker } from "react-router-dom"

/**
 * Unsaved-changes protection for a form.
 *
 * - Tab close and reload: the browser's own beforeunload prompt (the only
 *   place a browser prompt is used; the page cannot style it).
 * - In-app navigation (links, back, forward): react-router `useBlocker`, which
 *   needs the data router created in src/routes/index.tsx.
 * - Closing an editor dialog, Cancel, Escape or an outside click: route the
 *   close through `requestLeave`.
 *
 * Both of the last two show the same in-app dialog, `UnsavedGuardDialog`,
 * driven by `prompt`. Pass `dirty` as "differs from the last saved values"
 * (see src/lib/dirty-model.ts); it must turn false as soon as a save succeeds.
 */
export function useUnsavedGuard(dirty: boolean) {
  const blocker = useBlocker(dirty)
  const [pendingClose, setPendingClose] = useState<(() => void) | null>(null)

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  /** Run `leave` now if the form is clean, otherwise ask first. */
  const requestLeave = useCallback(
    (leave: () => void) => {
      if (dirty) setPendingClose(() => leave)
      else leave()
    },
    [dirty],
  )

  const prompt = {
    // A prompt can only be waiting while there is still something unsaved.
    open: blocker.state === "blocked" || (dirty && pendingClose !== null),
    onStay: () => {
      setPendingClose(null)
      if (blocker.state === "blocked") blocker.reset()
    },
    onLeave: () => {
      const run = pendingClose
      setPendingClose(null)
      if (blocker.state === "blocked") blocker.proceed()
      else run?.()
    },
  }

  return { prompt, requestLeave }
}

export type UnsavedPrompt = ReturnType<typeof useUnsavedGuard>["prompt"]
