import { useCallback, useEffect, useReducer } from "react"
import { useBlocker } from "react-router-dom"
import { closeReducer, idleClose } from "@/lib/unsaved-guard-model"

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
 *
 * Use ONE guard per mounted page: react-router keeps only the last registered
 * blocker, so two guards on a page would fight. A page with several editors
 * combines their dirty flags into one guard.
 */
export function useUnsavedGuard(dirty: boolean) {
  const blocker = useBlocker(dirty)
  const [{ pending }, dispatch] = useReducer(closeReducer, idleClose)

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  // Forget a waiting close request once there is nothing left to protect.
  useEffect(() => {
    dispatch({ type: "dirty", dirty })
  }, [dirty])

  /** Run `leave` now if the form is clean, otherwise ask first. */
  const requestLeave = useCallback(
    (leave: () => void) => {
      if (dirty) dispatch({ type: "request", dirty, leave })
      else leave()
    },
    [dirty],
  )

  const prompt = {
    open: blocker.state === "blocked" || (dirty && pending !== null),
    onStay: () => {
      dispatch({ type: "stay" })
      if (blocker.state === "blocked") blocker.reset()
    },
    onLeave: () => {
      dispatch({ type: "leave" })
      if (blocker.state === "blocked") blocker.proceed()
      else pending?.()
    },
  }

  return { prompt, requestLeave }
}

export type UnsavedPrompt = ReturnType<typeof useUnsavedGuard>["prompt"]
