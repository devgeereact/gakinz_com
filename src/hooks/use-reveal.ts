import { useEffect, useEffectEvent, useRef } from "react"
import { isNewLink, type LinkMark } from "@/lib/deepLink"

/**
 * Scrolls the element with `elementId` into view once, the first time it is
 * on the page while `ready` is true. Used for deep-linked records (see
 * src/lib/deepLink.ts). A record that never appears is left alone. A new
 * `revision` (see linkRevision) scrolls to the same element again, so a link
 * re-applied from the search is not ignored.
 */
export function useReveal(elementId: string | null, ready: boolean, revision = "") {
  const done = useRef<string | null>(null)
  useEffect(() => {
    const key = elementId ? `${elementId}|${revision}` : null
    if (!key || !ready || done.current === key) return
    const frame = requestAnimationFrame(() => {
      const el = document.getElementById(elementId as string)
      if (!el) return
      done.current = key
      el.scrollIntoView?.({ behavior: "smooth", block: "center" })
    })
    return () => cancelAnimationFrame(frame)
  }, [elementId, ready, revision])
}

/**
 * Calls `apply` when the screen is `ready` and `mark` is a link it has not
 * applied yet (isNewLink). Runs on mount and whenever the link or its nonce
 * changes, never on an ordinary re-render, so closing what a link opened sticks.
 */
export function useApplyLink(mark: LinkMark, ready: boolean, apply: () => void) {
  const last = useRef<LinkMark | null>(null)
  // `apply` is a fresh closure each render. As an effect event it always sees
  // the latest render's values without being a dependency, so the effect runs
  // only when the link, its nonce or readiness changes.
  const onLink = useEffectEvent(apply)
  const { value, nonce } = mark
  useEffect(() => {
    const next: LinkMark = { value, nonce }
    if (!ready || !isNewLink(last.current, next)) return
    last.current = next
    onLink()
  }, [ready, value, nonce])
}
