import type { ReactNode, ElementType, CSSProperties } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import FadeIn from "./FadeIn"
import { actionClass } from "./action-class"

/**
 * The public design system.
 *
 * D-037: the Mastercard-inspired GetDesign reference
 * (docs/DESIGN-REFERENCE-MASTERCARD.md), followed as closely as possible with
 * only the substitutions in docs/DESIGN-SYSTEM.md section 10.2. Warm cream
 * canvas, one geometric sans, warm-black 20px actions, 40px media frames,
 * circular portraits, a floating pill navigation and a sparse orange orbit.
 *
 * What must never appear: the Mastercard mark colours #EB001B and #F79E1B,
 * any pair of interlocking or overlapping circles, card or payment imagery,
 * and any stock image standing in for real work.
 *
 * TYPE: every size comes from the nine-value scale in tailwind.config.js —
 * label, body, lede, t4, t3, t2, t1, display, hero. There is no arbitrary
 * size anywhere in this file and there must not be one in a page either.
 *
 * COLOUR: ink carries the action. Clay (`gk-come`) still marks a gap
 * awaiting real material. Orange is decoration only: the orbit line and the
 * eyebrow dot, never text and never meaning.
 */

// ── Layout ──────────────────────────────────────────────────────────────────

/** The one horizontal measure. Every band uses it; nothing sets its own. */
export function Measure({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[76rem] px-4 sm:px-8 lg:px-12", className)}>{children}</div>
}

/**
 * A horizontal band of the page.
 *
 * "paper" is the canvas cream, "sunk" is the lifted cream laid on it like
 * paper on paper, "ink" is the warm-black band used once or twice per page
 * at most. Vertical rhythm is the reference's: 64px on phones, 96px, then
 * 128px on desktop.
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
        "py-16 md:py-24 lg:py-32",
        resolved === "sunk" && "bg-gk-sunk",
        resolved === "ink" && "bg-gk-ink text-gk-on-dark",
        className,
      )}
    >
      <Measure>{children}</Measure>
    </section>
  )
}

// ── Micro type ──────────────────────────────────────────────────────────────

/**
 * The small uppercase label: 14px, bold, +4% tracking, the only uppercase
 * the reference allows. With `dot` it becomes the section eyebrow, led by
 * the small signal-orange dot the reference treats as its identity. The dot
 * is decorative and hidden from assistive technology.
 */
export function Label({
  children,
  className,
  as: As = "p",
  dot = false,
}: {
  children: ReactNode
  className?: string
  as?: ElementType
  dot?: boolean
}) {
  return (
    <As
      className={cn(
        "font-data text-label font-bold uppercase text-gk-ink-mute",
        dot && "inline-flex items-center gap-2",
        className,
      )}
    >
      {dot && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-gk-signal" />}
      {children}
    </As>
  )
}

// ── Actions ─────────────────────────────────────────────────────────────────

/** The one action on a public page. Styling lives in ./action-class. */
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
  const cls = actionClass({ variant, onDark, className })

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

// ── Media ───────────────────────────────────────────────────────────────────

/**
 * The 40px rounded media frame, the reference's most recognisable gesture.
 * It clips its child and reserves its own box, so the image area holds its
 * size before the picture loads. Portfolio screenshots stay rectangular
 * inside it so interface evidence is readable (DESIGN-SYSTEM 10.4).
 */
export function MediaFrame({
  children,
  className,
  ratio,
}: {
  children: ReactNode
  className?: string
  ratio?: string
}) {
  return (
    <div
      className={cn(
        "gk-hover-zoom overflow-hidden rounded-media bg-gk-sunk [&>img]:h-full [&>img]:w-full [&>img]:object-cover",
        className,
      )}
      style={ratio ? { aspectRatio: ratio } : undefined}
    >
      {children}
    </div>
  )
}

/** A circular portrait frame. Square source, cropped to a perfect circle. */
export function Portrait({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={cn("gk-hover-zoom aspect-square overflow-hidden rounded-full bg-gk-sunk", className)}>
      <img src={src} alt={alt} width={800} height={800} className="h-full w-full object-cover" />
    </div>
  )
}

/**
 * The orbit: one thin orange arc that sweeps over the top of a circular
 * portrait, drawn once after the content arrives. Decorative only:
 * `aria-hidden`, no meaning, no loop. It is a single open line, slightly
 * off-centre and elliptical so it reads as a trajectory, never a second
 * circle, and never a pair of circles. Removed below 768px, where the
 * reference drops its arcs.
 *
 * Place it inside the `relative` square that holds the portrait; it
 * overhangs that square by a fifth on each side and ignores the pointer, so
 * it can never cover a control.
 */
export function Orbit({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 100 100"
      fill="none"
      className={cn("pointer-events-none absolute -inset-[20%] hidden h-[140%] w-[140%] md:block", className)}
      style={style}
    >
      <path
        className="gk-orbit-path"
        pathLength={1}
        d="M4 70 A 47 43 -10 0 1 96 36"
        stroke="hsl(var(--gk-orange))"
        strokeWidth="0.25"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ── Page header ─────────────────────────────────────────────────────────────

/**
 * The masthead for an inner page: eyebrow, one heading, the purpose, and an
 * optional action. No backdrop and no media, so every inner page reads as
 * itself rather than as a copy of the home hero.
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
    <header>
      <Measure className="pb-12 pt-10 sm:pb-16 sm:pt-16 lg:pt-20">
        {breadcrumb && (
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 font-data text-label font-bold uppercase text-gk-ink-mute">
              <li>
                <Link to="/" className="inline-flex min-h-[1.5rem] items-center hover:text-gk-ink">
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
        <div className="gk-rise">
          <Label dot>{eyebrow}</Label>
        </div>
        <h1
          className="gk-rise mt-5 max-w-4xl font-display text-t2 text-gk-ink sm:text-t1"
          style={{ "--gk-delay": "80ms" } as CSSProperties}
        >
          {title}
        </h1>
        {intro && (
          <p
            className="gk-rise mt-6 max-w-2xl text-lede text-gk-ink-soft"
            style={{ "--gk-delay": "160ms" } as CSSProperties}
          >
            {intro}
          </p>
        )}
        {children && (
          <div className="gk-rise mt-8" style={{ "--gk-delay": "240ms" } as CSSProperties}>
            {children}
          </div>
        )}
      </Measure>
    </header>
  )
}

// ── Contents ────────────────────────────────────────────────────────────────

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
      <div className={cn(sticky && "lg:sticky lg:top-28 lg:self-start")}>
        {label && <Label dot>{label}</Label>}
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
 * It takes the shape the real material will have: the 40px media frame by
 * default, or a circle for a portrait. It reserves the final aspect ratio so
 * nothing moves when the real image arrives, and it carries the clay that
 * means "awaiting material".
 *
 * Nothing invented ever goes in this slot. A labelled gap is honest; a stock
 * photograph of a stranger on a personal site, or an invented client on a
 * portfolio, is not.
 */
export function Placeholder({
  label,
  detail,
  ratio = "4 / 5",
  shape = "frame",
  className,
}: {
  label: string
  detail?: string
  ratio?: string
  shape?: "frame" | "circle"
  className?: string
}) {
  const circle = shape === "circle"
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 border-[1.5px] border-dashed border-gk-come/60 bg-gk-sunk text-center",
        circle ? "rounded-full px-10 py-8 sm:px-14" : "rounded-media p-6 sm:p-8",
        className,
      )}
      style={{ aspectRatio: circle ? "1 / 1" : ratio }}
    >
      <span className="font-data text-label font-bold uppercase text-gk-come">{label}</span>
      {detail && <span className="max-w-[26ch] text-body text-gk-ink-mute">{detail}</span>}
    </div>
  )
}

/** An inline "to supply" marker for a missing value inside a line of text. */
export function Gap({ children }: { children: ReactNode }) {
  return (
    <span className="font-data text-label font-bold uppercase text-gk-come">[{children}]</span>
  )
}

// ── Quote ───────────────────────────────────────────────────────────────────

// ── Closing action ──────────────────────────────────────────────────────────

/**
 * The closing action band. Lifted cream inside a 40px frame rather than a
 * second warm-black slab, because the footer below it is now the ink
 * surface and two dark bands back to back would read as one.
 */
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
    <section className="pb-16 md:pb-24">
      <Measure>
        <FadeIn>
          <div className="grid gap-8 rounded-media bg-gk-sunk px-6 py-12 sm:px-12 sm:py-16 md:grid-cols-[1fr_auto] md:items-end">
            <div className="max-w-2xl">
              <h2 className="font-display text-t2 text-gk-ink">{title}</h2>
              <p className="mt-5 text-lede text-gk-ink-soft">{intro}</p>
            </div>
            <Action to={to} variant="strong">
              {cta}
            </Action>
          </div>
        </FadeIn>
      </Measure>
    </section>
  )
}
