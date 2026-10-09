import type { ReactNode, ElementType } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import FadeIn from "./FadeIn"

/**
 * The public design system.
 *
 * Direction C with direction A's colour, per
 * docs/design/2026-09-22-directions/direction-approved.md.
 *
 * The governing idea is that the page is a document, not a landing page.
 * Typography, spacing and rules carry the hierarchy. What was removed, and
 * must not come back:
 *
 *   - the aurora-and-grid hero that ran on all eight pages
 *   - the animated indigo-to-lavender-to-rose gradient, which was the only
 *     brand gesture the old site had
 *   - ghost numerals standing in for hierarchy
 *   - the HAIR hairline literal, inlined roughly forty times
 *   - blur blobs, glow, shine sweeps and the rounded-3xl card idiom
 *
 * TYPE: every size comes from the nine-value scale in tailwind.config.js —
 * label, body, lede, t4, t3, t2, t1, display, hero. There is no arbitrary
 * size anywhere in this file and there must not be one in a page either. The
 * old site's eight ad-hoc heading sizes were the clearest signal that it had
 * been assembled rather than designed.
 *
 * COLOUR: two chromatics, each with a job. `gk-set` (navy) marks what is
 * settled. `gk-come` (red oxide) marks a gap awaiting real material. Neither
 * is decoration.
 */

// ── Layout ──────────────────────────────────────────────────────────────────

/** The one horizontal measure. Every band uses it; nothing sets its own. */
export function Measure({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[76rem] px-5 sm:px-8", className)}>{children}</div>
}

/**
 * A horizontal band of the document.
 *
 * `tone` replaces the old `muted` boolean. "paper" is the page, "sunk" is a
 * half-step down for a quiet interlude, "ink" is the dark band used once or
 * twice per page at most.
 */
export function Section({
  children,
  className,
  tone = "paper",
  muted,
  id,
}: {
  children: ReactNode
  className?: string
  tone?: "paper" | "sunk" | "ink"
  /** @deprecated Use `tone="sunk"`. Kept so existing pages keep compiling. */
  muted?: boolean
  id?: string
}) {
  const resolved = muted ? "sunk" : tone
  return (
    <section
      id={id}
      className={cn(
        "py-16 sm:py-24",
        resolved === "sunk" && "bg-gk-sunk",
        resolved === "ink" && "bg-gk-ink text-gk-on-dark",
        className,
      )}
    >
      <Measure>{children}</Measure>
    </section>
  )
}

/** A full-width rule. Structural, so it uses the 3.29:1 edge colour, not the hairline. */
export function Rule({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-gk-edge", className)} />
}

// ── Micro type ──────────────────────────────────────────────────────────────

/**
 * The small uppercase label that names a section or a field.
 * Mono, because these sit beside record data and should align with it.
 */
export function Label({
  children,
  className,
  as: As = "p",
}: {
  children: ReactNode
  className?: string
  as?: ElementType
}) {
  return (
    <As className={cn("font-data text-label uppercase text-gk-ink-mute", className)}>{children}</As>
  )
}

/** @deprecated Use `Label`. Kept for pages not yet migrated. */
export function RuleEyebrow({
  children,
  center,
  className,
}: {
  children: ReactNode
  center?: boolean
  className?: string
}) {
  return <Label className={cn(center && "text-center", className)}>{children}</Label>
}

/**
 * @deprecated The animated gradient did not survive the relaunch. This renders
 * plain ink and exists only so call sites outside the marketing tree keep
 * compiling. Delete it once nothing imports it.
 */
export function GradientText({ children, className }: { children: ReactNode; soft?: boolean; className?: string }) {
  return <span className={className}>{children}</span>
}

// ── Actions ─────────────────────────────────────────────────────────────────

/**
 * A typographic action. Not a pill, not a shadow, not a gradient.
 *
 * "strong" is a filled navy block for the one primary action on a page.
 * "plain" is a ruled link. Both are ≥44px tall, clearing WCAG 2.5.8 twice
 * over, and both get the global focus ring from index.css.
 */
export function Action({
  to,
  href,
  children,
  variant = "plain",
  className,
  onDark = false,
}: {
  to?: string
  href?: string
  children: ReactNode
  variant?: "strong" | "plain"
  className?: string
  onDark?: boolean
}) {
  const base =
    "inline-flex min-h-[2.75rem] items-center gap-2 px-5 py-2.5 text-body font-medium transition-colors"
  const look =
    variant === "strong"
      ? onDark
        ? "bg-gk-paper text-gk-ink hover:bg-gk-on-dark-soft"
        : "bg-gk-set text-gk-paper hover:bg-gk-ink"
      : onDark
        ? "border border-gk-on-dark-soft text-gk-on-dark hover:bg-gk-paper hover:text-gk-ink"
        : "border border-gk-edge text-gk-ink hover:border-gk-ink hover:bg-gk-sunk"
  const cls = cn(base, look, className)

  if (href) {
    const external = /^https?:/.test(href)
    return (
      <a className={cls} href={href} {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}>
        {children}
      </a>
    )
  }
  return (
    <Link className={cls} to={to ?? "/"}>
      {children}
    </Link>
  )
}

// ── Page header ─────────────────────────────────────────────────────────────

/**
 * The masthead for an inner page.
 *
 * No backdrop of any kind. The old PageHero stacked an aurora, a grid and a
 * grain overlay behind every one of eight pages, which is why they all read
 * as the same page.
 */
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
    <header className="border-b border-gk-edge">
      <Measure className="pb-12 pt-12 sm:pb-16 sm:pt-20">
        {breadcrumb && (
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-2 font-data text-label uppercase text-gk-ink-mute">
              <li>
                <Link to="/" className="hover:text-gk-ink">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-gk-ink">
                {breadcrumb}
              </li>
            </ol>
          </nav>
        )}
        <Label>{eyebrow}</Label>
        <h1 className="mt-5 max-w-4xl font-display text-t2 font-normal text-gk-ink lg:text-t1">{title}</h1>
        {intro && <p className="mt-6 max-w-2xl text-lede text-gk-ink-soft">{intro}</p>}
        {children && <div className="mt-8">{children}</div>}
      </Measure>
    </header>
  )
}

// ── Contents ────────────────────────────────────────────────────────────────

/**
 * The numbered contents list that stands in for a navigation bar on the first
 * screen, per direction C. A real ordered list of real links, so it is
 * navigable by keyboard and by landmark without any ARIA.
 */
export function Contents({ items }: { items: { href: string; title: string; note?: string }[] }) {
  return (
    <nav aria-label="Contents">
      <ol className="border-t border-gk-edge">
        {items.map((item, i) => (
          <li key={item.href} className="border-b border-gk-edge">
            <a
              href={item.href}
              className="group grid grid-cols-[2.5rem_1fr] items-baseline gap-4 py-4 hover:bg-gk-sunk sm:grid-cols-[3.5rem_1fr_auto] sm:gap-6"
            >
              <span className="font-data text-label text-gk-ink-mute">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-display text-t4 text-gk-ink group-hover:underline">{item.title}</span>
              {item.note && (
                <span className="col-start-2 font-data text-label text-gk-ink-mute sm:col-start-3">
                  {item.note}
                </span>
              )}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

// ── Index list ──────────────────────────────────────────────────────────────

export function IndexList({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn("border-t border-gk-edge", className)}>{children}</ul>
}

export function IndexRow({
  index,
  title,
  children,
  to,
  meta,
  as: As = "h3",
}: {
  index: string | number
  title: ReactNode
  children?: ReactNode
  to?: string
  meta?: ReactNode
  /** Set to "h2" where this row is the first heading under the page h1. */
  as?: "h2" | "h3"
}) {
  const body = (
    <div className="grid grid-cols-[2.5rem_1fr] items-baseline gap-4 sm:grid-cols-[3.5rem_1fr_auto] sm:gap-6">
      <span className="font-data text-label text-gk-ink-mute">{index}</span>
      <div className="min-w-0">
        <As className="font-display text-t4 text-gk-ink">{title}</As>
        {children && <div className="mt-2 max-w-2xl text-body text-gk-ink-soft">{children}</div>}
      </div>
      {meta && <div className="col-start-2 font-data text-label text-gk-ink-mute sm:col-start-3">{meta}</div>}
    </div>
  )
  return (
    <li className="border-b border-gk-edge">
      {to ? (
        <Link to={to} className="block py-6 hover:bg-gk-sunk">
          {body}
        </Link>
      ) : (
        <div className="py-6">{body}</div>
      )}
    </li>
  )
}

// ── Feature row ─────────────────────────────────────────────────────────────

export function FeatureRow({
  index,
  eyebrow,
  title,
  media,
  flip = false,
  children,
  footer,
  as: As = "h2",
}: {
  index: string
  eyebrow: string
  title: ReactNode
  media: ReactNode
  flip?: boolean
  children?: ReactNode
  footer?: ReactNode
  /**
   * Defaults to h2. The old default of h3 produced an h1 → h3 level skip on
   * Services, Resources, Home and Contact, because these rows are the first
   * heading under the page title.
   */
  as?: "h2" | "h3"
}) {
  return (
    <div className="grid items-start gap-8 border-t border-gk-edge py-12 first:border-t-0 first:pt-0 lg:grid-cols-2 lg:gap-16">
      <div className={cn("min-w-0", flip ? "lg:order-2" : "lg:order-1")}>{media}</div>
      <div className={cn("min-w-0", flip ? "lg:order-1" : "lg:order-2")}>
        <div className="flex items-baseline gap-4">
          <span className="font-data text-label text-gk-ink-mute">{index}</span>
          <Label>{eyebrow}</Label>
        </div>
        <As className="mt-4 font-display text-t3 text-gk-ink">{title}</As>
        {children && <div className="mt-4 max-w-2xl text-body text-gk-ink-soft">{children}</div>}
        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  )
}

// ── Split ───────────────────────────────────────────────────────────────────

export function Split({
  label,
  title,
  intro,
  children,
  sticky = true,
}: {
  label?: string
  title?: ReactNode
  intro?: string
  children: ReactNode
  sticky?: boolean
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-[22rem_1fr] lg:gap-16">
      <div className={cn(sticky && "lg:sticky lg:top-24 lg:self-start")}>
        {label && <Label>{label}</Label>}
        {title && <h2 className="mt-4 font-display text-t3 text-gk-ink">{title}</h2>}
        {intro && <p className="mt-4 text-body text-gk-ink-soft">{intro}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

// ── Honest gaps ─────────────────────────────────────────────────────────────

/**
 * A designed, labelled placeholder for material the owner has not supplied.
 *
 * This is deliberately a visible, composed element rather than a grey box with
 * an image icon, because it ships to real visitors and should read as a
 * deliberate state. It carries the red oxide that means "awaiting material".
 *
 * Nothing invented ever goes in this slot. A labelled gap is honest; a stock
 * photograph of a stranger on a personal site, or an invented client on a
 * portfolio, is not.
 */
export function Placeholder({
  label,
  detail,
  ratio = "4 / 5",
  className,
}: {
  label: string
  detail?: string
  ratio?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 border border-dashed border-gk-come/60 bg-gk-sunk p-6 text-center",
        className,
      )}
      style={{ aspectRatio: ratio }}
    >
      <span className="font-data text-label uppercase text-gk-come">{label}</span>
      {detail && <span className="max-w-[24ch] text-body text-gk-ink-mute">{detail}</span>}
    </div>
  )
}

/** An inline "to supply" marker for a missing value inside a line of text. */
export function Gap({ children }: { children: ReactNode }) {
  return (
    <span className="font-data text-label uppercase text-gk-come">[{children}]</span>
  )
}

// ── Quote ───────────────────────────────────────────────────────────────────

export function QuoteBand({ quote, attribution }: { quote: ReactNode; attribution: string }) {
  return (
    <figure className="border-y border-gk-edge py-14">
      <blockquote className="max-w-4xl font-display text-t3 text-gk-ink">{quote}</blockquote>
      <figcaption className="mt-6 font-data text-label uppercase text-gk-ink-mute">{attribution}</figcaption>
    </figure>
  )
}

// ── Closing action ──────────────────────────────────────────────────────────

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
    <section className="bg-gk-ink text-gk-on-dark">
      <Measure className="py-16 sm:py-24">
        <FadeIn>
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <div className="max-w-2xl">
              <h2 className="font-display text-t2 text-gk-on-dark">{title}</h2>
              <p className="mt-5 text-lede text-gk-on-dark-soft">{intro}</p>
            </div>
            <Action to={to} variant="strong" onDark>
              {cta}
            </Action>
          </div>
        </FadeIn>
      </Measure>
    </section>
  )
}
