import { useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { site } from "@/marketing/data/site"
import { KIND_LABELS, type WorkRecord } from "@/marketing/data/work"
import { StartProject } from "./PublicNavbar"
import { Action, DemoTag, Label, Measure, Placeholder } from "./primitives"

/**
 * The home hero: the claim, then the work, on the first screen.
 *
 * Pattern taken from the 21st.dev "Featured Project Hero" (Waqar H. Syed,
 * ibrandify, MIT): headline and standfirst split across the top, a numbered
 * row of project tabs, and one project at a time in a large frame beside its
 * summary and a single action. Rebuilt in the D-037 tokens with CSS motion
 * only (DESIGN-SYSTEM 10.4 and 10.5); no animation library.
 *
 * The frame shows the record's cover screenshot when one exists, otherwise a
 * labelled placeholder: no stock image and no invented interface stands in
 * for a real project (D-027). In development the demo fixtures pass a drawn
 * screen as `media`; that never happens in a production build.
 *
 * The tabs follow the ARIA tabs pattern: one tab stop, arrow keys, Home and
 * End move between them, and the panel is labelled by its tab. Nothing
 * rotates on its own.
 */

export type FeaturedItem = {
  record: WorkRecord
  tags: string[]
  /** The picture for the frame. `null` renders the labelled placeholder. */
  media: ReactNode | null
}

const delay = (ms: number) => ({ "--gk-delay": `${ms}ms` }) as CSSProperties

export default function HomeHero({ items }: { items: FeaturedItem[] }) {
  const [active, setActive] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const base = useId()
  const index = Math.min(active, items.length - 1)
  const current = items[index]

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = items.length - 1
    const next =
      e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null
    if (next === null) return
    e.preventDefault()
    setActive(next)
    tabs.current[next]?.focus()
  }

  return (
    <div className="overflow-x-clip">
      <Measure className="pb-16 pt-12 sm:pb-24 sm:pt-16 lg:pt-20">
        {/* ── Claim ──────────────────────────────────────────────────── */}
        <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-end lg:gap-16">
          <div className="min-w-0">
            <div className="gk-rise">
              <Label dot>
                {site.role} · {site.location}
              </Label>
            </div>
            <h1
              className="gk-rise mt-6 max-w-[17ch] font-display text-t2 text-gk-ink sm:text-t1 lg:text-display"
              style={delay(80)}
            >
              A website is part of how a business runs, not a brochure it keeps.
            </h1>
          </div>
          <div className="gk-rise lg:pb-2" style={delay(160)}>
            <p className="text-lede text-gk-ink-soft">
              I am {site.name}. I draw the thing and then I build it, and I stay on afterwards so it
              keeps working.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <StartProject />
              <Action to="/work">See all work</Action>
            </div>
          </div>
        </div>

        {/* ── Featured work ──────────────────────────────────────────── */}
        {current && (
          <div className="gk-rise mt-16 lg:mt-20" style={delay(240)}>
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gk-rule pb-4">
              <div
                role="tablist"
                aria-label="Featured work"
                onKeyDown={onKey}
                className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 py-1"
              >
                {items.map((it, i) => {
                  const selected = i === index
                  return (
                    <button
                      key={it.record.slug}
                      ref={(el) => {
                        tabs.current[i] = el
                      }}
                      id={`${base}-tab-${i}`}
                      role="tab"
                      type="button"
                      aria-selected={selected}
                      aria-controls={`${base}-panel`}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setActive(i)}
                      className={cn(
                        "inline-flex min-h-[2.75rem] shrink-0 items-center gap-3 rounded-full border-[1.5px] py-1.5 pl-1.5 pr-5 text-body font-medium tracking-[-0.02em] transition-colors duration-150",
                        selected
                          ? "border-gk-ink bg-gk-white text-gk-ink"
                          : "border-transparent text-gk-ink-soft hover:text-gk-ink",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-full font-data text-[0.75rem]",
                          selected ? "bg-gk-ink text-gk-on-dark" : "bg-gk-sunk text-gk-ink-mute",
                        )}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {it.record.title}
                    </button>
                  )
                })}
              </div>
              <p className="font-data text-label uppercase text-gk-ink-mute">
                Selected work · {String(items.length).padStart(2, "0")}
              </p>
            </div>

            <div
              key={current.record.slug}
              id={`${base}-panel`}
              role="tabpanel"
              aria-labelledby={`${base}-tab-${index}`}
              className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16"
            >
              <figure className="gk-media-in relative">
                <div className="relative flex aspect-[4/3] flex-col overflow-hidden rounded-media bg-gk-sunk p-5 sm:p-8">
                  <figcaption className="relative z-10 flex items-center justify-between gap-4 pb-4 sm:pb-6">
                    <span className="truncate text-body font-medium text-gk-ink">{current.record.title}</span>
                    <span className="shrink-0 font-data text-[0.75rem] uppercase tracking-[0.04em] text-gk-ink-mute">
                      {KIND_LABELS[current.record.kind].name} / {String(index + 1).padStart(2, "0")}
                    </span>
                  </figcaption>
                  <div className="relative z-10 min-h-0 flex-1">
                    {current.media ?? (
                      <Placeholder
                        className="h-full !aspect-auto"
                        label="Project screenshot, to supply"
                        detail="A real capture of this project. No stock image stands in for the work."
                      />
                    )}
                  </div>
                </div>
              </figure>

              <div className="gk-rise min-w-0" style={delay(80)}>
                <p className="flex flex-wrap items-center gap-3 font-data text-label uppercase text-gk-ink-mute">
                  {[current.record.sector, current.record.year].filter(Boolean).join(" · ")}
                  {current.record.demo && <DemoTag />}
                </p>
                <h2 className="mt-4 font-display text-t2 text-gk-ink sm:text-t1">{current.record.title}</h2>
                {current.record.summary && (
                  <p className="mt-5 max-w-xl text-lede text-gk-ink-soft">{current.record.summary}</p>
                )}
                {current.tags.length > 0 && (
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {current.tags.map((t) => (
                      <li
                        key={t}
                        className="rounded-full border border-gk-rule bg-gk-white px-3 py-1 text-[0.875rem] text-gk-ink-soft"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  to={`/work/${current.record.slug}`}
                  className="gk-arrow-link mt-8 inline-flex min-h-[2.75rem] items-center gap-2 border-b-[1.5px] border-gk-ink text-body font-medium text-gk-ink"
                >
                  Read the record
                  <ArrowUpRight aria-hidden className="gk-arrow h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </Measure>
    </div>
  )
}
