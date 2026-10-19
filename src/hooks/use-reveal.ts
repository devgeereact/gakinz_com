import { useEffect, useRef } from "react"

/**
 * Scrolls the element with `elementId` into view once, the first time it is
 * on the page while `ready` is true. Used for deep-linked records (see
 * src/lib/deepLink.ts). A record that never appears is left alone.
 */
export function useReveal(elementId: string | null, ready: boolean) {
  const done = useRef<string | null>(null)
  useEffect(() => {
    if (!elementId || !ready || done.current === elementId) return
    const frame = requestAnimationFrame(() => {
      const el = document.getElementById(elementId)
      if (!el) return
      done.current = elementId
      el.scrollIntoView?.({ behavior: "smooth", block: "center" })
    })
    return () => cancelAnimationFrame(frame)
  }, [elementId, ready])
}
