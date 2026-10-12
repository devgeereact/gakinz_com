import type { CSSProperties, ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Check } from "lucide-react"
import { site } from "@/marketing/data/site"
import { StartProject } from "./PublicNavbar"
import { Action } from "./primitives"

/**
 * The home hero (D-047).
 *
 * Pattern taken from the 21st.dev "SaaS Template" hero (waleedkibhen, MIT),
 * as the owner chose: a dark stage, a small announcement pill, a centred
 * two-line headline whose second line fades, one standfirst, the actions, a
 * warm glow under them, and a large product frame rising out of the stage.
 * Rebuilt in the D-037 tokens (ink stage, cream type, decorative orange glow)
 * with CSS motion only and no new dependency.
 *
 * The frame is for GAkinzOS, the owner's own system, because it is the one
 * product this site can show without anyone's permission. Until a real
 * capture exists the frame holds a labelled placeholder: no stock image and
 * no invented dashboard stands in for it (D-027). In development the demo
 * fixtures pass a drawn screen as `screen`; that never happens in a
 * production build.
 *
 * The trust line repeats only what the site already states as fact.
 */

const delay = (ms: number) => ({ "--gk-delay": `${ms}ms` }) as CSSProperties

const PROMISES = ["Designed and built by one person", "Looked after once it is live", `Based in ${site.location}`]

export default function HomeHero({ screen = null }: { screen?: ReactNode }) {
  return (
    <div className="px-3 pt-3 sm:px-6 sm:pt-6">
      <section
        aria-labelledby="hero-heading"
        className="relative mx-auto max-w-[90rem] overflow-hidden rounded-media bg-gk-ink px-4 pt-14 text-center sm:px-8 sm:pt-20 lg:pt-24"
      >
        {/* The glow: decorative, behind everything, no meaning. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[38%] h-[28rem] w-[56rem] max-w-[140%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(243,115,56,0.32),rgba(243,115,56,0.08)_55%,transparent)] blur-2xl"
        />

        <div className="relative mx-auto max-w-4xl">
          <div className="gk-rise">
            <Link
              to="/work/gakinzos"
              className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-gk-on-dark/20 bg-gk-on-dark/5 px-4 text-[0.875rem] text-gk-on-dark-soft transition-colors duration-150 hover:border-gk-on-dark/40 hover:text-gk-on-dark"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gk-orange" aria-hidden />
              GAkinzOS runs this studio
              <span className="inline-flex items-center gap-1 font-medium text-gk-on-dark">
                See how <ArrowRight aria-hidden className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>

          <h1
            id="hero-heading"
            className="gk-rise mx-auto mt-8 max-w-[18ch] font-display text-[2.5rem] font-medium leading-[1.04] tracking-[-0.03em] text-gk-on-dark sm:text-t1 lg:text-[4.5rem]"
            style={delay(80)}
          >
            A website is part of how a business runs,{" "}
            <span className="bg-gradient-to-b from-gk-on-dark to-gk-on-dark-soft/70 bg-clip-text text-transparent">
              not a brochure it keeps.
            </span>
          </h1>

          <p className="gk-rise mx-auto mt-7 max-w-2xl text-lede text-gk-on-dark-soft" style={delay(160)}>
            I am {site.name}, a {site.role.toLowerCase()} in {site.location}. I draw the thing, build it,
            and stay on afterwards so it keeps working.
          </p>

          <div className="gk-rise mt-10 flex flex-wrap items-center justify-center gap-3" style={delay(240)}>
            <StartProject onDark />
            <Action to="/work" onDark>
              See the work
            </Action>
          </div>

          <ul
            className="gk-rise mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[0.875rem] text-gk-on-dark-soft"
            style={delay(300)}
          >
            {PROMISES.map((p) => (
              <li key={p} className="inline-flex items-center gap-2">
                <Check aria-hidden className="h-4 w-4 text-gk-come-on-dark" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* The product frame: rises from the stage and is cut by its foot. */}
        <figure className="gk-media-in relative mx-auto mt-14 max-w-5xl sm:mt-16" style={delay(360)}>
          <div className="rounded-t-[1.5rem] border border-b-0 border-gk-on-dark/15 bg-gk-on-dark/[0.06] p-2 pb-0 sm:p-3 sm:pb-0">
            <div className="flex items-center gap-2 px-2 pb-2 sm:pb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-gk-on-dark/25" />
              <span className="h-2.5 w-2.5 rounded-full bg-gk-on-dark/25" />
              <span className="h-2.5 w-2.5 rounded-full bg-gk-on-dark/25" />
              <span className="ml-3 truncate font-data text-[0.75rem] text-gk-on-dark-soft">GAkinzOS</span>
            </div>
            <div className="aspect-[4/3] overflow-hidden rounded-t-[1rem] bg-gk-sunk sm:aspect-[16/8]">
              {screen ?? (
                <div className="flex h-full flex-col items-center justify-center gap-2 border-[1.5px] border-b-0 border-dashed border-gk-come/60 px-6 text-center">
                  <span className="font-data text-label font-bold uppercase text-gk-come">GAkinzOS screenshot, to supply</span>
                  <span className="max-w-[40ch] text-body text-gk-ink-mute">
                    A real capture of the studio system, with no client data in it.
                  </span>
                </div>
              )}
            </div>
          </div>
          <figcaption className="sr-only">GAkinzOS, the system this studio runs on.</figcaption>
        </figure>
      </section>
    </div>
  )
}
