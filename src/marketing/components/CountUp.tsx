import { useEffect, useRef, useState } from "react"

// Counts from 0 → `to` once the element scrolls into view. Resting state shows
// the final value (so it's correct without JS / with reduced motion); the count
// is a progressive enhancement, mirroring FadeIn's philosophy.
export default function CountUp({
  to,
  duration = 1800,
  suffix = "",
  prefix = "",
}: {
  to: number
  duration?: number
  suffix?: string
  prefix?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(to)
  const ran = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) return

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry.isIntersecting || ran.current) return
        ran.current = true
        io.disconnect()
        const start = performance.now()
        setValue(0)
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration)
          // easeOutCubic
          const eased = 1 - Math.pow(1 - p, 3)
          setValue(Math.round(eased * to))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [to, duration])

  return (
    <span ref={ref}>
      {prefix}
      {value}
      {suffix}
    </span>
  )
}
