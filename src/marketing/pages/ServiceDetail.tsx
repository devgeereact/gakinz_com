import { Link, useParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { services } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import { PageHero, Section } from "../components/primitives"
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
            <Button asChild className="mt-8">
              <Link to="/contact">
                Talk to us about {service.title.toLowerCase()} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="rounded-xl border border-border bg-card p-6">
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
          </FadeIn>
        </div>
      </Section>
    </>
  )
}
