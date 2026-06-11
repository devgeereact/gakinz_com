import { Link } from "react-router-dom"
import { ArrowRight, PenTool, Code2, ShoppingCart, LifeBuoy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { services, sectors, work, packages } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import { Section, SectionHeading, Eyebrow } from "../components/primitives"

const serviceIcons: Record<string, typeof PenTool> = {
  "web-design": PenTool,
  "web-development": Code2,
  ecommerce: ShoppingCart,
  "care-and-support": LifeBuoy,
}

const steps = [
  { n: "01", t: "Discover", d: "We learn the business, the audience and what the site has to achieve." },
  { n: "02", t: "Design", d: "We draw the screens and you sign them off before any code is written." },
  { n: "03", t: "Build", d: "The same team turns the design into a fast, accessible, standards-based site." },
  { n: "04", t: "Launch & care", d: "We go live, then keep the site healthy, secure and improving." },
]

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <FadeIn>
            <Eyebrow>Web design &amp; development studio</Eyebrow>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              One team that draws the vision and{" "}
              <span className="text-primary">builds it properly.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              GAkinz sits at the crossroads of design and development. You get one studio that designs
              your site and builds it, so it looks right, works right, and never falls through the gap
              between the two.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/contact">
                  Start a project <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/work">See our work</Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Services */}
      <Section>
        <SectionHeading
          eyebrow="What we do"
          title="Design and build, under one roof"
          intro="Four ways we help. Every one starts with the same team and ends with a site you can actually run."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s, i) => {
            const Icon = serviceIcons[s.slug] ?? Code2
            return (
              <FadeIn key={s.slug} delay={i * 0.05}>
                <Link
                  to={`/services/${s.slug}`}
                  className="group block h-full rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.summary}</p>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                    Learn more
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </FadeIn>
            )
          })}
        </div>
      </Section>

      {/* Why one team */}
      <Section muted>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <FadeIn>
            <SectionHeading
              eyebrow="Why GAkinz"
              title="No handoff, no gaps"
              intro="Most web projects lose time and quality in the gap between the designer and the developer. We do both, so decisions made in the design carry straight into the code."
            />
            <ul className="mt-6 space-y-3">
              {[
                "One team accountable from sketch to launch",
                "Hard-to-build ideas caught while they are still cheap to change",
                "Built to web standards and WCAG 2.1 AA accessibility",
                "A site you can update yourself after we hand it over",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm text-foreground">{point}</span>
                </li>
              ))}
            </ul>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="grid grid-cols-2 gap-4">
              {[
                { k: "Design + build", v: "One team" },
                { k: "Accessibility", v: "WCAG 2.1 AA" },
                { k: "Tested on", v: "Real devices" },
                { k: "After launch", v: "Care plans" },
              ].map((stat) => (
                <div key={stat.k} className="rounded-xl border border-border bg-background p-6">
                  <div className="font-serif text-2xl font-bold text-primary">{stat.v}</div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {stat.k}
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </Section>

      {/* Process */}
      <Section>
        <SectionHeading eyebrow="How we work" title="A clear path from first call to launch" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <FadeIn key={step.n} delay={i * 0.05}>
              <div className="h-full rounded-xl border border-border bg-card p-6">
                <span className="font-serif text-3xl font-bold text-primary/30">{step.n}</span>
                <h3 className="mt-2 text-base font-semibold">{step.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.d}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* Sectors */}
      <Section muted>
        <SectionHeading
          eyebrow="Who we serve"
          title="Studios, shops, clinics and causes"
          intro="We work across sectors, but the through-line is the same: businesses that care how their site looks and behaves."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.slice(0, 6).map((sec, i) => (
            <FadeIn key={sec.title} delay={i * 0.04}>
              <div className="h-full rounded-xl border border-border bg-background p-6">
                <h3 className="text-base font-semibold">{sec.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{sec.blurb}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* Work preview */}
      <Section>
        <div className="flex items-end justify-between gap-4">
          <SectionHeading eyebrow="Selected work" title="A look at what we have built" />
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/work">
              All work <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {work.map((w, i) => (
            <FadeIn key={w.title} delay={i * 0.05}>
              <div className="h-full rounded-xl border border-border bg-card p-6">
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {w.sector}
                </span>
                <h3 className="mt-2 text-base font-semibold">{w.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{w.summary}</p>
                <p className="mt-3 text-sm font-medium text-foreground">{w.result}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* Pricing teaser */}
      <Section muted>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Pricing"
            title="Clear packages, no surprises"
            intro="Starting points, not final quotes. After a short discovery call we send a fixed price, so you know the number before any work begins."
          />
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/pricing">
              See full pricing <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {packages.slice(0, 3).map((p, i) => (
            <FadeIn key={p.name} delay={i * 0.05}>
              <Link
                to="/pricing"
                className="group block h-full rounded-xl border border-border bg-background p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <h3 className="text-base font-semibold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.best}</p>
                <div className="mt-4">
                  <span className="text-sm text-muted-foreground">from </span>
                  <span className="font-serif text-2xl font-bold text-primary">{p.price}</span>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <FadeIn>
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">Have a project in mind?</h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/85">
              Tell us what you are building. We will come back with a clear next step, not a hard sell.
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
