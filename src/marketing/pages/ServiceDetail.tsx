import { Link, useParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { services, processStages, alwaysIncluded } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import SiteMockup, { variantForService } from "../components/SiteMockup"
import { PageHero, Section, Split, RuleEyebrow, CtaBand } from "../components/primitives"
import NotFound from "./NotFound"

export default function ServiceDetail() {
  const { slug } = useParams()
  const service = services.find((s) => s.slug === slug)
  if (!service) return <NotFound />

  const others = services.filter((s) => s.slug !== service.slug)

  return (
    <>
      <PageHero eyebrow="Service" title={service.title} intro={service.summary} breadcrumb={service.title} />
      <Section>
        <Link
          to="/services"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> All services
        </Link>
        <FadeIn>
          <div className="relative mt-6 overflow-hidden rounded-2xl border border-[hsl(var(--gk-indigo)/0.08)] shadow-xl shadow-[hsl(var(--gk-violet)/0.12)]">
            <div className="aspect-[16/7] w-full">
              <SiteMockup variant={variantForService(service.slug)} url={`${service.slug.replace(/-/g, "")}.example`} />
            </div>
          </div>
        </FadeIn>
        <div className="mt-10 grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          <FadeIn>
            <p className="text-lg text-muted-foreground">{service.detail}</p>
            <h2 className="mt-8 text-lg font-semibold">What you get</h2>
            <ul className="mt-4 space-y-3">
              {service.deliverables.map((d) => (
                <li key={d} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--gk-violet)/0.12)] text-[hsl(var(--gk-violet))]">
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
            <div className="lg:sticky lg:top-24">
              <RuleEyebrow>Other services</RuleEyebrow>
              <div className="mt-5 border-t border-[hsl(var(--gk-indigo)/0.14)]">
                {others.map((o) => (
                  <Link
                    key={o.slug}
                    to={`/services/${o.slug}`}
                    className="group flex items-center justify-between gap-3 border-b border-[hsl(var(--gk-indigo)/0.14)] py-4 transition-colors hover:text-[hsl(var(--gk-violet))]"
                  >
                    <span className="font-serif text-base font-bold">{o.title}</span>
                    <ArrowRight className="h-4 w-4 text-[hsl(var(--gk-violet))] transition-transform group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>

              <div className="mt-10">
                <RuleEyebrow>Pricing</RuleEyebrow>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Every project is fixed-price after a short discovery call, so you know the number before
                  any work begins.
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link to="/pricing">
                    See packages <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </FadeIn>
        </div>
      </Section>

      {/* How we work */}
      <Section muted>
        <RuleEyebrow>How we work</RuleEyebrow>
        <h2 className="mt-4 max-w-2xl font-serif text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
          A simple path from first call to a live site
        </h2>
        <div className="mt-12 grid grid-cols-1 border-t border-[hsl(var(--gk-indigo)/0.14)] lg:grid-cols-5">
          {processStages.map((stage) => (
            <div
              key={stage.n}
              className="border-b border-[hsl(var(--gk-indigo)/0.14)] py-7 lg:border-b-0 lg:px-6 lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:border-[hsl(var(--gk-indigo)/0.14)] lg:first:pl-0"
            >
              <span className="font-serif text-4xl font-extrabold text-[hsl(var(--gk-indigo)/0.12)]">{stage.n}</span>
              <h3 className="mt-3 text-base font-semibold">{stage.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{stage.what}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Always included */}
      <Section>
        <Split label="Every project" title="What's always included" sticky>
          <ul className="grid border-t border-[hsl(var(--gk-indigo)/0.14)] sm:grid-cols-2 sm:gap-x-12">
            {alwaysIncluded.map((item) => (
              <li key={item} className="flex items-start gap-3 border-b border-[hsl(var(--gk-indigo)/0.14)] py-5">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[hsl(var(--gk-violet))]" />
                <span className="text-sm text-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </Split>
      </Section>

      <CtaBand
        title={`Ready to talk ${service.title.toLowerCase()}?`}
        intro="Tell us what you are building. We will come back with a clear next step and a fixed price."
      />
    </>
  )
}
