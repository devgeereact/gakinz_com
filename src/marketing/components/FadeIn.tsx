import { ReactNode, CSSProperties, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

// A single entrance, once. The resting state is VISIBLE (opacity 1), so
// content is never hidden if the animation is throttled (background tabs),
// disabled (prefers-reduced-motion), or JavaScript never runs.
//
// With JavaScript, an element that starts below the fold is upgraded to a
// viewport reveal: it is marked `data-reveal="pending"` (hidden by CSS) only
// in the same step that starts observing it, then flipped to "in" when it
// enters the viewport and left alone. Without an observer nothing is ever
// marked, so nothing is ever hidden. See the motion block in index.css.
export default function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return
    if (el.getBoundingClientRect().top < window.innerHeight) return

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset.reveal = "in"
          io.disconnect()
        }
      },
      // The root reaches far above the viewport, so an element the reader
      // jumped past (an anchor link, the End key) still counts as seen and is
      // revealed, rather than staying hidden above the fold.
      { rootMargin: "100000px 0px -10% 0px" },
    )
    el.dataset.reveal = "pending"
    io.observe(el)
    return () => {
      io.disconnect()
      // Never leave an element hidden behind a torn-down observer.
      if (el.dataset.reveal === "pending") el.dataset.reveal = "in"
    }
  }, [])

  return (
    <div ref={ref} className={cn("gk-fadein", className)} style={{ "--gk-delay": `${delay}s` } as CSSProperties}>
      {children}
    </div>
  )
}
