import { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import FadeIn from "./FadeIn"

export function Section({
  children,
  className,
  muted = false,
  id,
}: {
  children: ReactNode
  className?: string
  muted?: boolean
  id?: string
}) {
  return (
    <section id={id} className={cn("relative", muted && "bg-muted/40", className)}>
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">{children}</div>
    </section>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="gk-pill">{children}</span>
}

export function GradientText({
  children,
  soft = false,
  className,
}: {
  children: ReactNode
  soft?: boolean
  className?: string
}) {
  return <span className={cn(soft ? "gk-grad-text-soft" : "gk-grad-text", className)}>{children}</span>
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  center = false,
}: {
  eyebrow?: string
  title: ReactNode
  intro?: string
  center?: boolean
}) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.1]">
        {title}
      </h2>
      {intro && <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{intro}</p>}
    </div>
  )
}

// Compact hero for inner pages — aurora backdrop + grid + gradient accent.
export function PageHero({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string
  title: ReactNode
  intro?: string
  children?: ReactNode
}) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div className="gk-aurora" aria-hidden />
      <div className="absolute inset-0 gk-grid" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <FadeIn>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-5 max-w-3xl font-serif text-4xl font-bold tracking-tight sm:text-6xl sm:leading-[1.05]">
            {title}
          </h1>
          {intro && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">{intro}</p>}
          {children && <div className="mt-8">{children}</div>}
        </FadeIn>
      </div>
    </section>
  )
}

// Stat tile.
export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="gk-card p-6">
      <div className="font-serif text-3xl font-bold">
        <GradientText>{value}</GradientText>
      </div>
      <div className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  )
}

// Faux browser window — wraps any preview content.
export function BrowserFrame({ url = "gakinz.com", children }: { url?: string; children: ReactNode }) {
  return (
    <div className="gk-ring overflow-hidden shadow-2xl shadow-primary/10">
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/60 px-4 py-3">
        <span className="gk-browser-dot bg-red-400/80" />
        <span className="gk-browser-dot bg-amber-400/80" />
        <span className="gk-browser-dot bg-emerald-400/80" />
        <div className="ml-3 flex-1">
          <div className="mx-auto w-fit rounded-md bg-background/70 px-3 py-1 text-xs text-muted-foreground">
            {url}
          </div>
        </div>
      </div>
      <div className="bg-background">{children}</div>
    </div>
  )
}

// Gradient call-to-action band — used at the foot of marketing pages.
export function CtaBand({
  title,
  intro,
  cta = "Start a project",
  to = "/contact",
}: {
  title: string
  intro: string
  cta?: string
  to?: string
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Dark-forest editorial accent band — grain texture over a deep green
           gradient, cream type. See DESIGN-SYSTEM.md §2/§7. */}
        <div className="gk-glow relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(130_18%_12%)] via-[hsl(98_24%_24%)] to-[hsl(91_18%_36%)] px-6 py-16 text-center text-[hsl(47_42%_91%)] sm:py-20">
          <span className="gk-grain" aria-hidden />
          <div className="absolute inset-0 gk-dots opacity-20" aria-hidden />
          <FadeIn>
            <h2 className="relative font-serif text-3xl font-bold sm:text-4xl">{title}</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-[hsl(47_42%_91%)]/80">{intro}</p>
            <div className="relative mt-8">
              <Button asChild size="lg" variant="secondary" className="gk-shine shadow-xl">
                <Link to={to}>
                  {cta} <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}
