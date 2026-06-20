import { Layers, Eye, Sprout, Gem } from "lucide-react"
import FadeIn from "../components/FadeIn"
import { PageHero, Section, SectionHeading, GradientText, QuoteBand, CtaBand } from "../components/primitives"

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
            <SectionHeading eyebrow="Our story" title="We built GAkinz to close a gap" />
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

      {/* What we stand for — pillars */}
      <Section muted>
        <SectionHeading eyebrow="What we stand for" title="Four things we hold to" center />
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {pillars.map((p, i) => {
            const Icon = p.icon
            return (
              <FadeIn key={p.t} delay={i * 0.05}>
                <div className="gk-card flex h-full items-start gap-4 p-6">
                  <span className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--gk-violet))] to-[hsl(var(--gk-sky))] text-white shadow-md">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold">{p.t}</h3>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{p.d}</p>
                  </div>
                  <span className="ml-auto font-serif text-3xl font-extrabold text-[hsl(var(--gk-indigo)/0.08)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
              </FadeIn>
            )
          })}
        </div>
      </Section>

      {/* Mission + vision */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-2">
          <FadeIn>
            <SectionHeading eyebrow="Our mission" title="One team for both design and build" />
            <p className="mt-4 text-muted-foreground">
              GAkinz exists to give businesses one team for both design and build, so their website looks
              right and works right, without the handoff gaps that slow most projects down.
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <SectionHeading eyebrow="Our vision" title="Sketch to launch, never falling between" />
            <p className="mt-4 text-muted-foreground">
              A web where any business can hand its whole site to one studio and watch it move from sketch
              to launch without ever falling between design and code.
            </p>
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

      {/* What we believe */}
      <Section muted>
        <SectionHeading eyebrow="What we believe" title="The thinking behind the work" center />
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {beliefs.map((b, i) => (
            <FadeIn key={b.t} delay={i * 0.05}>
              <div className="gk-card h-full p-6">
                <span className="font-serif text-3xl font-extrabold text-[hsl(var(--gk-indigo)/0.10)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-base font-semibold">{b.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.d}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Want to work with us?"
        intro="We take on a handful of projects at a time so each gets proper attention. Tell us about yours."
      />
    </>
  )
}
