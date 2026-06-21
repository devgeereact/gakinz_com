import { Layers, Eye, Sprout, Gem } from "lucide-react"
import FadeIn from "../components/FadeIn"
import Testimonials from "../components/Testimonials"
import { PageHero, Section, Split, IndexList, IndexRow, RuleEyebrow, GradientText, QuoteBand, CtaBand } from "../components/primitives"

const beliefs = [
  { t: "Craft is in the details", d: "The polish a visitor can't name is the part they feel." },
  { t: "Plain beats flashy", d: "A site that's clear and quick beats one that's busy and slow." },
  { t: "Small businesses deserve good work", d: "You shouldn't need a big budget to get a site you're proud of." },
]

const pillars = [
  { icon: Layers, t: "One team, start to finish", d: "Design and development under one roof, so nothing gets lost in translation." },
  { icon: Eye, t: "Looks right and works right", d: "A site has to be good to look at and good to use. We hold both to the same standard." },
  { icon: Sprout, t: "Made for growth", d: "We build for small businesses that want to reach further, not just launch and stall." },
  { icon: Gem, t: "Crafted with care", d: "Details matter. The polish a visitor can't name is the part they feel." },
]

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="About GAkinz"
        title="Design and development, by the same hands"
        intro="GAkinz takes pride in work crafted with care, from the look of a site to how it behaves in a visitor's hands. We draw the vision and we build it, so clients get one team for the whole job."
        breadcrumb="About"
      />

      {/* Our story */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <FadeIn>
            <div className="relative overflow-hidden rounded-3xl border border-[hsl(var(--gk-indigo)/0.08)] bg-gradient-to-br from-[hsl(var(--gk-violet)/0.14)] via-[hsl(var(--gk-sky)/0.06)] to-transparent p-8">
              <div className="absolute inset-0 gk-dots opacity-50" aria-hidden />
              <img
                src="/illustrations/graphic-designer-workplace-1.png"
                alt="A designer at a workstation, designing and building a website"
                className="relative mx-auto w-full max-w-sm"
                loading="lazy"
              />
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <RuleEyebrow>Our story</RuleEyebrow>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight sm:text-[2.5rem] sm:leading-[1.05]">
              We built GAkinz to close a gap
            </h2>
            <div className="mt-5 space-y-4 text-muted-foreground">
              <p>
                GAkinz started from a simple frustration: too many small businesses end up with websites
                that look good but don't work, or work but don't look like much. That gap almost always
                comes from splitting design and development between people who never talk to each other.
              </p>
              <p>
                We built GAkinz to close that gap. We sit at the crossroads of design and development, so
                you get one team that both draws the vision and builds it properly. It's a quieter way to
                work, and it produces sites that feel considered all the way through.
              </p>
            </div>
          </FadeIn>
        </div>
      </Section>

      {/* What we stand for — pillars index */}
      <Section muted>
        <Split label="What we stand for" title="Four things we hold to" sticky>
          <IndexList>
            {pillars.map((p, i) => (
              <IndexRow key={p.t} index={i + 1} title={p.t}>
                {p.d}
              </IndexRow>
            ))}
          </IndexList>
        </Split>
      </Section>

      {/* Mission + vision */}
      <Section>
        <div className="grid gap-px border-y border-[hsl(var(--gk-indigo)/0.14)] sm:grid-cols-2">
          <FadeIn>
            <div className="py-8 sm:pr-10">
              <RuleEyebrow>Our mission</RuleEyebrow>
              <h2 className="mt-4 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
                One team for both design and build
              </h2>
              <p className="mt-4 text-muted-foreground">
                GAkinz exists to give businesses one team for both design and build, so their website looks
                right and works right, without the handoff gaps that slow most projects down.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="border-t border-[hsl(var(--gk-indigo)/0.14)] py-8 sm:border-l sm:border-t-0 sm:pl-10">
              <RuleEyebrow>Our vision</RuleEyebrow>
              <h2 className="mt-4 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
                Sketch to launch, never falling between
              </h2>
              <p className="mt-4 text-muted-foreground">
                A web where any business can hand its whole site to one studio and watch it move from sketch
                to launch without ever falling between design and code.
              </p>
            </div>
          </FadeIn>
        </div>
      </Section>

      {/* Brand pull-quote */}
      <QuoteBand
        quote={
          <>
            Craft is in the details — <GradientText>the polish a visitor can't name is the part they feel.</GradientText>
          </>
        }
        attribution="What we believe"
      />

      {/* What we believe — manifesto columns */}
      <Section muted>
        <RuleEyebrow>What we believe</RuleEyebrow>
        <h2 className="mt-4 max-w-2xl font-serif text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
          The thinking behind the work
        </h2>
        <div className="mt-10 grid border-y border-[hsl(var(--gk-indigo)/0.14)] sm:grid-cols-3">
          {beliefs.map((b, i) => (
            <FadeIn key={b.t} delay={i * 0.05}>
              <div className="border-b border-[hsl(var(--gk-indigo)/0.14)] py-8 sm:border-b-0 sm:px-7 sm:[&:not(:first-child)]:border-l sm:[&:not(:first-child)]:border-[hsl(var(--gk-indigo)/0.14)] sm:first:pl-0">
                <span className="font-serif text-4xl font-extrabold text-[hsl(var(--gk-indigo)/0.12)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-serif text-lg font-bold">{b.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.d}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      <Testimonials muted />

      <CtaBand
        title="Want to work with us?"
        intro="We take on a handful of projects at a time so each gets proper attention. Tell us about yours."
      />
    </>
  )
}
