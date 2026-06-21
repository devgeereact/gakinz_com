import { ComponentType, ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import FadeIn from "./FadeIn"
import CountUp from "./CountUp"

const HAIR = "border-[hsl(var(--gk-indigo)/0.14)]"

// Brand accent helpers — in the public theme `--primary` is near-black ink, so
// the *colour* identity lives in the lavender (--gk-violet) + rose (--gk-sky)
// pair. These read better than `text-primary` for the Oxybuild accent moments.
const ACCENT_TEXT = "text-[hsl(var(--gk-violet))]"
const ACCENT_BAR = "bg-gradient-to-r from-[hsl(var(--gk-violet))] to-[hsl(var(--gk-sky))]"

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

// Pill eyebrow (rounded chip) — kept for spots that want a badge look.
export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="gk-pill">{children}</span>
}

// Oxybuild signature eyebrow — a short gradient rule followed by tracked caps.
export function RuleEyebrow({
  children,
  center = false,
  className,
}: {
  children: ReactNode
  center?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em]",
        ACCENT_TEXT,
        center && "justify-center",
        className,
      )}
    >
      <span className={cn("h-[2px] w-8 rounded-full", ACCENT_BAR)} aria-hidden />
      {children}
    </span>
  )
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
      {eyebrow && <RuleEyebrow center={center}>{eyebrow}</RuleEyebrow>}
      <h2 className="mt-5 font-serif text-3xl font-bold tracking-tight sm:text-[2.7rem] sm:leading-[1.08]">
        {title}
      </h2>
      {intro && <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{intro}</p>}
    </div>
  )
}

// ── Editorial system ────────────────────────────────────────────────────────
// Asymmetric spread: a sticky label/heading column on the left, free content on
// the right. The backbone of the Swiss layout (replaces "heading then grid").
export function Split({
  label,
  title,
  intro,
  children,
  sticky = false,
  aside,
}: {
  label?: string
  title?: ReactNode
  intro?: string
  children: ReactNode
  sticky?: boolean
  aside?: ReactNode
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-[19rem_1fr] lg:gap-16">
      <div className={cn(sticky && "lg:sticky lg:top-24 lg:self-start")}>
        {label && <RuleEyebrow>{label}</RuleEyebrow>}
        {title && (
          <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight sm:text-[2.5rem] sm:leading-[1.05]">
            {title}
          </h2>
        )}
        {intro && <p className="mt-5 max-w-sm leading-relaxed text-muted-foreground">{intro}</p>}
        {aside && <div className="mt-7">{aside}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

// Numbered hairline index — the signature device that replaces card grids.
export function IndexList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("border-t", HAIR, className)}>{children}</div>
}

export function IndexRow({
  index,
  title,
  children,
  to,
  meta,
}: {
  index: string | number
  title: ReactNode
  children?: ReactNode
  to?: string
  meta?: ReactNode
}) {
  const inner = (
    <div
      className={cn(
        "group grid grid-cols-[2.5rem_1fr] items-baseline gap-x-5 gap-y-1 border-b py-7 transition-colors sm:grid-cols-[4rem_1fr_auto] sm:gap-x-8 sm:py-8",
        HAIR,
        to && "hover:bg-[hsl(var(--gk-violet)/0.04)]",
      )}
    >
      <span className="font-serif text-xl font-bold tabular-nums text-[hsl(var(--gk-violet))] sm:text-2xl">
        {typeof index === "number" ? String(index).padStart(2, "0") : index}
      </span>
      <div>
        <h3 className="font-serif text-xl font-bold tracking-tight sm:text-[1.7rem] sm:leading-tight">
          {title}
        </h3>
        {children && <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">{children}</p>}
        {meta && (
          <div className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{meta}</div>
        )}
      </div>
      {to && (
        <ArrowUpRight className="col-start-2 mt-2 h-6 w-6 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-[hsl(var(--gk-violet))] sm:col-start-3 sm:mt-0 sm:self-center" />
      )}
    </div>
  )
  return to ? (
    <Link to={to} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {inner}
    </Link>
  ) : (
    inner
  )
}

// Full-width alternating feature spread (media + editorial text).
export function FeatureRow({
  index,
  eyebrow,
  title,
  media,
  flip = false,
  children,
  footer,
}: {
  index: string
  eyebrow: string
  title: ReactNode
  media: ReactNode
  flip?: boolean
  children?: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className={cn("grid items-center gap-8 border-t py-12 first:border-t-0 first:pt-0 lg:grid-cols-2 lg:gap-16", HAIR)}>
      <div className={cn("min-w-0", flip ? "lg:order-2" : "lg:order-1")}>{media}</div>
      <div className={cn("min-w-0", flip ? "lg:order-1" : "lg:order-2")}>
        <div className="flex items-baseline gap-4">
          <span className="font-serif text-2xl font-bold text-[hsl(var(--gk-indigo)/0.18)]">{index}</span>
          <RuleEyebrow>{eyebrow}</RuleEyebrow>
        </div>
        <h3 className="mt-4 font-serif text-2xl font-bold tracking-tight sm:text-3xl">{title}</h3>
        {children}
        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  )
}

// Banner-style page header for inner pages — aurora + grid + grain backdrop,
// rule eyebrow, oversized title, optional breadcrumb trail (Oxybuild page-banner).
export function PageHero({
  eyebrow,
  title,
  intro,
  children,
  breadcrumb,
}: {
  eyebrow: string
  title: ReactNode
  intro?: string
  children?: ReactNode
  breadcrumb?: string
}) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div className="gk-aurora" aria-hidden />
      <div className="absolute inset-0 gk-grid" aria-hidden />
      <span className="gk-grain" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <FadeIn>
          <RuleEyebrow>{eyebrow}</RuleEyebrow>
          <h1 className="mt-5 max-w-4xl font-serif text-[2.6rem] font-bold leading-[1.03] tracking-tight sm:text-6xl lg:text-[4.1rem]">
            {title}
          </h1>
          {intro && (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">{intro}</p>
          )}
          {children && <div className="mt-8">{children}</div>}
          {breadcrumb && (
            <nav
              className="mt-9 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground"
              aria-label="Breadcrumb"
            >
              <Link to="/" className="transition-colors hover:text-foreground">
                Home
              </Link>
              <span className={ACCENT_TEXT}>/</span>
              <span className="text-foreground">{breadcrumb}</span>
            </nav>
          )}
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

// Animated counter with a ghost-stroke number behind (Oxybuild counter device).
export function CounterStat({
  to,
  label,
  suffix = "",
  prefix = "",
}: {
  to: number
  label: string
  suffix?: string
  prefix?: string
}) {
  return (
    <div className="relative px-2 text-center">
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-[56%] font-serif text-[5.5rem] font-extrabold leading-none text-transparent [-webkit-text-stroke:1.5px_hsl(var(--gk-indigo)/0.09)] sm:text-[7rem]"
      >
        {prefix}
        {to}
        {suffix}
      </span>
      <div className="relative">
        <div className="font-serif text-4xl font-extrabold sm:text-5xl">
          <GradientText>
            <CountUp to={to} suffix={suffix} prefix={prefix} />
          </GradientText>
        </div>
        <div className="mt-2.5 text-sm font-medium text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

// Service/feature tile with a dark action bar (Oxybuild service card).
export function ServiceTile({
  to,
  title,
  summary,
  icon: Icon,
  index,
}: {
  to: string
  title: string
  summary: string
  icon: ComponentType<{ className?: string }>
  index: number
}) {
  return (
    <Link
      to={to}
      className="group relative block overflow-hidden rounded-2xl border border-[hsl(var(--gk-indigo)/0.08)] bg-white shadow-[0_1px_2px_hsl(var(--gk-indigo)/0.05),0_10px_30px_-18px_hsl(var(--gk-indigo)/0.18)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_-20px_hsl(var(--gk-violet)/0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-[hsl(var(--gk-violet)/0.16)] via-[hsl(var(--gk-sky)/0.07)] to-transparent">
        <div className="absolute inset-0 gk-dots" aria-hidden />
        <span className="absolute left-5 top-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/70 text-[hsl(var(--gk-violet))] shadow-sm ring-1 ring-[hsl(var(--gk-violet)/0.15)] backdrop-blur">
          <Icon className="h-5 w-5" />
        </span>
        <span className="pointer-events-none absolute right-5 top-3 font-serif text-6xl font-extrabold text-[hsl(var(--gk-indigo)/0.06)]">
          {String(index).padStart(2, "0")}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 bg-foreground px-5 py-4 text-background">
        <div className="min-w-0">
          <h3 className="font-serif text-lg font-bold">{title}</h3>
          <p className="mt-0.5 truncate text-xs text-background/60">{summary}</p>
        </div>
        <span
          className={cn(
            "inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-white transition-transform group-hover:translate-x-0.5",
            ACCENT_BAR,
          )}
        >
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
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

// Brand pull-quote band with an oversized quotation mark (Oxybuild testimonial
// device, used for the studio's own words — no fabricated client quotes).
export function QuoteBand({ quote, attribution }: { quote: ReactNode; attribution: string }) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-[hsl(var(--gk-indigo)/0.07)] bg-muted/40 px-6 py-14 text-center sm:px-16 sm:py-20">
          <span
            aria-hidden
            className="pointer-events-none absolute left-6 top-1 font-serif text-[8rem] leading-none text-[hsl(var(--gk-violet)/0.16)] sm:left-12"
          >
            &ldquo;
          </span>
          <FadeIn>
            <blockquote className="relative mx-auto max-w-3xl font-serif text-2xl font-bold leading-snug tracking-tight sm:text-[2rem]">
              {quote}
            </blockquote>
            <div className="relative mt-6 text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {attribution}
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

// Full-width call-to-action band — dark ink panel with grain + lavender/rose
// glow, big heading left of a divider, action right (Oxybuild newsletter band).
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
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="gk-glow relative overflow-hidden rounded-3xl bg-foreground px-6 py-14 text-background sm:px-12 sm:py-16">
          <span className="gk-grain" aria-hidden />
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[hsl(var(--gk-violet)/0.40)] blur-3xl" aria-hidden />
          <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-[hsl(var(--gk-sky)/0.30)] blur-3xl" aria-hidden />
          <FadeIn>
            <div className="relative flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
              <div className="md:max-w-xl md:border-r md:border-background/15 md:pr-10">
                <h2 className="font-serif text-3xl font-bold sm:text-4xl">{title}</h2>
                <p className="mt-4 text-background/70">{intro}</p>
              </div>
              <Button asChild size="lg" variant="secondary" className="gk-shine flex-shrink-0 shadow-xl">
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
