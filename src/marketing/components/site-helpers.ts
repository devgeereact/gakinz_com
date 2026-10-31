import { createContext, useContext, useEffect, useRef, useState, type CSSProperties } from "react"
import type { Project } from "@/marketing/data/showcase"

/** Non-component helpers for the public site, kept apart so fast refresh works on site-ui.tsx. */

export const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties

export const host = (p: Project) => p.url || `${p.name.toLowerCase().replace(/[^a-z]+/g, "")}.local`

export type Tone = { on: string; bg: string } | null
export const ToneCtx = createContext<(t: Tone) => void>(() => {})

/** Puts the nav in a page's colours while the page's coloured header is under it. */
export function useNavTone(on: string | null, bg: string | null) {
  const set = useContext(ToneCtx)
  useEffect(() => {
    set(on && bg ? { on, bg } : null)
    return () => set(null)
  }, [on, bg, set])
}

/** A tel: address for a published number: digits, with a leading + kept. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`

/**
 * Full rows at every width (D-053, K-112 P2 and P4). The card grid has six
 * tracks (three cards a row), two below 1100px and one below 560px. A short
 * last row is given to the top as wider feature cards: at three a row, one
 * left over makes the first card full width and two left over make the first
 * two half width; at two a row, an odd count makes the first card full width.
 * The track count is read from the rendered grid, so the rule follows the CSS.
 * The first render assumes six tracks, which is what the prerendered page has.
 */
export function useBalancedGrid(count: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [tracks, setTracks] = useState(6)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => setTracks(getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const layout = (i: number): CardLayout => {
    if (tracks >= 6) {
      const r = count % 3
      if (r === 1 && i === 0) return "full"
      if (r === 2 && i < 2) return "half"
      return ""
    }
    if (tracks === 2 && count % 2 === 1 && i === 0) return "full"
    return ""
  }
  return { ref, layout }
}

export type CardLayout = "" | "half" | "full"
