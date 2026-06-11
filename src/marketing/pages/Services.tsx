import { Link } from "react-router-dom"
import { ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { services, processStages, alwaysIncluded } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import { PageHero, Section, SectionHeading } from "../components/primitives"

export default function Services() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Everything your website needs, from one studio"
        intro="You don't have to coordinate a designer and a developer. We do both, and we do them together — from the first sketch through to launch and the care that follows."
      />

      {/* Service cards */}
      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          {services.map((s, i) => (
            <FadeIn key={s.slug} delay={i * 0.05}>
              <div className="flex h-full flex-col rounded-xl border border-border bg-card p-7">
                <h2 className="text-xl font-semibold">{s.title}</h2>
                <p className="mt-2 text-muted-foreground">{s.detail}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  {s.deliverables.map((d) => (
                    <li key={d} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      {d}
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/services/${s.slug}`}
                  className="mt-6 inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
                  {s.title} in detail <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* How we work — 5 named stages */}
      <Section muted>
        <SectionHeading
          eyebrow="How we work"
          title="A simple path from first call to a live site"
          intro="Five clear stages. You always know what stage you're at and what happens next."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {processStages.map((stage, i) => (
            <FadeIn key={stage.n} delay={i * 0.05}>
              <div className="h-full rounded-xl border border-border bg-background p-6">
                <span className="font-serif text-3xl font-bold text-primary/30">{stage.n}</span>
                <h3 className="mt-2 text-base font-semibold">{stage.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{stage.what}</p>
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-primary">
                  You get: {stage.get}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* What's always included */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <FadeIn>
            <SectionHeading
              eyebrow="Every project"
              title="What's always included"
              intro="Whichever service you choose, these come as standard — not as extras."
            />
            <Button asChild className="mt-6">
              <Link to="/pricing">
                See packages &amp; pricing <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </FadeIn>
          <FadeIn delay={0.1}>
            <ul className="grid gap-4 sm:grid-cols-2">
              {alwaysIncluded.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>
      </Section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <FadeIn>
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">Not sure which you need?</h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/85">
              Book a short call and we'll point you the right way.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" variant="secondary">
                <Link to="/contact">
                  Start a project <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  )
}
