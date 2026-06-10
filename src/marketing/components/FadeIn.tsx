import { ReactNode, CSSProperties } from "react"
import { cn } from "@/lib/utils"

// CSS-driven entrance. The resting state is VISIBLE (opacity 1), so content is
// never hidden if the animation is throttled (background tabs) or disabled
// (prefers-reduced-motion). The fade-in is a progressive enhancement only.
export default function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <div className={cn("gk-fadein", className)} style={{ "--gk-delay": `${delay}s` } as CSSProperties}>
      {children}
    </div>
  )
}
