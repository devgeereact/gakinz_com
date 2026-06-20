import { Link } from "react-router-dom"
import { ArrowRight, Check, PenTool, Code2, ShoppingCart, LifeBuoy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { services, processStages, alwaysIncluded } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import SiteMockup, { variantForService } from "../components/SiteMockup"
import { PageHero, Section, SectionHeading, CtaBand } from "../components/primitives"

const serviceIcons: Record<string, typeof PenTool> = {
  "web-design": PenTool,
  "web-development": Code2,
  ecommerce: ShoppingCart,
  "care-and-support": LifeBuoy,
}

export default function Services() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Everything your website needs, from one studio"
        intro="You don't have to coordinate a designer and a developer. We do both, and we do them together — from the first sketch through to launch and the care that follows."
        breadcrumb="Services"
      />

      {/* Service cards */}
      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          {services.map((s, i) => {
            const Icon = serviceIcons[s.slug] ?? Code2
            return (
              <FadeIn key={s.slug} delay={i * 0.05}>
                <div className="gk-card flex h-full flex-col overflow-hidden">
                  <div className="relative h-40 overflow-hidden border-b border-[hsl(var(--gk-indigo)/0.06)]">
                    <SiteMockup variant={variantForService(s.slug)} url={`${s.slug.replace(/-/g, "")}.example`} />
                    <span className="absolute left-5 top-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--gk-violet))] to-[hsl(var(--gk-sky))] text-white shadow-lg">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="absolute right-5 top-3 font-serif text-5xl font-extrabold text-[hsl(var(--gk-indigo)/0.07)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-7">
                    <h2 className="font-serif text-xl font-bold">{s.title}</h2>
                    <p className="mt-2 text-muted-foreground">{s.detail}</p>
                    <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                      {s.deliverables.map((d) => (
                        <li key={d} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[hsl(var(--gk-violet))]" />
                          {d}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to={`/services/${s.slug}`}
                      className="mt-6 inline-flex items-center text-sm font-medium text-[hsl(var(--gk-violet))] hover:underline"
                    >
                      {s.title} in detail <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </FadeIn>
            )
          })}
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
              <div className="gk-card relative h-full overflow-hidden p-6">
                <span className="font-serif text-4xl font-extrabold text-[hsl(var(--gk-indigo)/0.10)]">
                  {stage.n}
                </span>
                <h3 className="mt-2 text-base font-semibold">{stage.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{stage.what}</p>
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[hsl(var(--gk-violet))]">
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
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--gk-violet)/0.12)] text-[hsl(var(--gk-violet))]">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>
      </Section>

      <CtaBand title="Not sure which you need?" intro="Book a short call and we'll point you the right way." />
    </>
  )
}
