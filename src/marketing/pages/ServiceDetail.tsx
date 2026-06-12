import { Link, useParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { services, processStages, alwaysIncluded } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import { PageHero, Section, SectionHeading, CtaBand } from "../components/primitives"
import NotFound from "./NotFound"

export default function ServiceDetail() {
  const { slug } = useParams()
  const service = services.find((s) => s.slug === slug)
  if (!service) return <NotFound />

  const others = services.filter((s) => s.slug !== service.slug)

  return (
    <>
      <PageHero eyebrow="Service" title={service.title} intro={service.summary} />
      <Section>
        <Link
          to="/services"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> All services
        </Link>
        <div className="mt-6 grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          <FadeIn>
            <p className="text-lg text-muted-foreground">{service.detail}</p>
            <h2 className="mt-8 text-lg font-semibold">What you get</h2>
            <ul className="mt-4 space-y-3">
              {service.deliverables.map((d) => (
                <li key={d} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm text-foreground">{d}</span>
                </li>
              ))}
            </ul>
            <Button asChild className="gk-shine mt-8 shadow-md shadow-primary/20">
              <Link to="/contact">
                Talk to us about {service.title.toLowerCase()} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="gk-card p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Other services
              </h3>
              <ul className="mt-4 space-y-3">
                {others.map((o) => (
                  <li key={o.slug}>
                    <Link
                      to={`/services/${o.slug}`}
                      className="flex items-center justify-between rounded-lg p-2 text-sm hover:bg-accent"
                    >
                      {o.title}
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="gk-card mt-5 p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Pricing
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Every project is fixed-price after a short discovery call, so you know the number before
                any work begins.
              </p>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link to="/pricing">
                  See packages <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </Section>

      {/* How we work */}
      <Section muted>
        <SectionHeading
          eyebrow="How we work"
          title="A simple path from first call to a live site"
          intro="Five clear stages. You always know what stage you're at and what happens next."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {processStages.map((stage, i) => (
            <FadeIn key={stage.n} delay={i * 0.05}>
              <div className="gk-card h-full p-6">
                <span className="font-serif text-3xl font-bold text-primary/30">{stage.n}</span>
                <h3 className="mt-2 text-base font-semibold">{stage.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{stage.what}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* Always included */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <FadeIn>
            <SectionHeading eyebrow="Every project" title="What's always included" />
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

      <CtaBand
        title={`Ready to talk ${service.title.toLowerCase()}?`}
        intro="Tell us what you are building. We will come back with a clear next step and a fixed price."
      />
    </>
  )
}
