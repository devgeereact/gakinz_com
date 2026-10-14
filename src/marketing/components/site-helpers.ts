import { createContext, useContext, useEffect, type CSSProperties } from "react"
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
