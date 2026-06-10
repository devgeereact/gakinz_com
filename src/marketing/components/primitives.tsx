import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import FadeIn from "./FadeIn"

export function Section({
  children,
  className,
  muted = false,
}: {
  children: ReactNode
  className?: string
  muted?: boolean
}) {
  return (
    <section className={cn(muted && "bg-card", className)}>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">{children}</div>
    </section>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-widest text-primary">{children}</span>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  center = false,
}: {
  eyebrow?: string
  title: string
  intro?: string
  center?: boolean
}) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {intro && <p className="mt-4 text-lg text-muted-foreground">{intro}</p>}
    </div>
  )
}

// Compact hero for inner pages.
export function PageHero({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string
  title: string
  intro?: string
}) {
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <FadeIn>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-2 max-w-3xl font-serif text-4xl font-bold tracking-tight sm:text-5xl">
            {title}
          </h1>
          {intro && <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{intro}</p>}
        </FadeIn>
      </div>
    </section>
  )
}
