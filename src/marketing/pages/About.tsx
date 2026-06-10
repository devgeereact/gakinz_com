import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import FadeIn from "../components/FadeIn"
import { PageHero, Section, SectionHeading } from "../components/primitives"

const values = [
  { t: "Care over speed", d: "We would rather ship something considered than something rushed. The details are the work." },
  { t: "One team, one owner", d: "Design and build sit together, so there is always one team accountable for the result." },
  { t: "Plain dealing", d: "Clear scope, clear prices, clear updates. No jargon, no surprises on the invoice." },
  { t: "Built to last", d: "We write to standards and hand over a site you can run, not one that needs us forever." },
]

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="About GAkinz"
        title="A studio at the crossroads of design and development"
        intro="GAkinz takes pride in work crafted with care, from the look of a site to how it behaves in a visitor's hands. We draw the vision and we build it, so clients get one team for the whole job."
      />

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

      <Section muted>
        <SectionHeading eyebrow="How we think" title="What we hold to" center />
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {values.map((v, i) => (
            <FadeIn key={v.t} delay={i * 0.05}>
              <div className="h-full rounded-xl border border-border bg-background p-6">
                <h3 className="text-base font-semibold">{v.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.d}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      <Section>
        <div className="rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
          <h2 className="font-serif text-2xl font-bold sm:text-3xl">Want to work with us?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            We take on a handful of projects at a time so each gets proper attention. Tell us about yours.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/contact">Start a project</Link>
          </Button>
        </div>
      </Section>
    </>
  )
}
