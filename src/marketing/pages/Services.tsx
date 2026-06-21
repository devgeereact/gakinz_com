import { Link } from "react-router-dom"
import { ArrowRight, Check, PenTool, Code2, ShoppingCart, LifeBuoy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { services, processStages, alwaysIncluded } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import SiteMockup, { variantForService } from "../components/SiteMockup"
import { PageHero, Section, Split, FeatureRow, RuleEyebrow, CtaBand } from "../components/primitives"

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

      {/* Service feature spreads */}
      <Section>
        {services.map((s, i) => {
          const Icon = serviceIcons[s.slug] ?? Code2
          return (
            <FadeIn key={s.slug}>
              <FeatureRow
                index={String(i + 1).padStart(2, "0")}
                eyebrow={s.title}
                flip={i % 2 === 1}
                title={s.title}
                media={
                  <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--gk-indigo)/0.1)] shadow-xl shadow-[hsl(var(--gk-violet)/0.12)]">
                    <div className="aspect-[16/10] w-full">
                      <SiteMockup variant={variantForService(s.slug)} url={`${s.slug.replace(/-/g, "")}.example`} />
                    </div>
                    <span className="absolute left-5 top-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--gk-violet))] to-[hsl(var(--gk-sky))] text-white shadow-lg">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                }
                footer={
                  <Button asChild variant="outline">
                    <Link to={`/services/${s.slug}`}>
                      {s.title} in detail <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                }
              >
                <p className="mt-4 leading-relaxed text-muted-foreground">{s.detail}</p>
                <ul className="mt-5 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {s.deliverables.map((d) => (
                    <li key={d} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[hsl(var(--gk-violet))]" />
                      <span className="text-foreground">{d}</span>
                    </li>
                  ))}
                </ul>
              </FeatureRow>
            </FadeIn>
          )
        })}
      </Section>

      {/* Process — horizontal steps */}
      <Section muted>
        <RuleEyebrow>How we work</RuleEyebrow>
        <h2 className="mt-4 max-w-2xl font-serif text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
          A simple path from first call to a live site
        </h2>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Five clear stages. You always know what stage you're at and what happens next.
        </p>
        <div className="mt-12 grid grid-cols-1 border-t border-[hsl(var(--gk-indigo)/0.14)] lg:grid-cols-5">
          {processStages.map((stage) => (
            <div
              key={stage.n}
              className="border-b border-[hsl(var(--gk-indigo)/0.14)] py-7 lg:border-b-0 lg:px-6 lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:border-[hsl(var(--gk-indigo)/0.14)] lg:first:pl-0"
            >
              <span className="font-serif text-4xl font-extrabold text-[hsl(var(--gk-indigo)/0.12)]">{stage.n}</span>
              <h3 className="mt-3 text-base font-semibold">{stage.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{stage.what}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-[hsl(var(--gk-violet))]">
                {stage.get}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* What's always included */}
      <Section>
        <Split
          label="Every project"
          title="What's always included"
          intro="Whichever service you choose, these come as standard — not as extras."
          sticky
          aside={
            <Button asChild>
              <Link to="/pricing">See packages &amp; pricing <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          }
        >
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

      <CtaBand title="Not sure which you need?" intro="Book a short call and we'll point you the right way." />
    </>
  )
}
