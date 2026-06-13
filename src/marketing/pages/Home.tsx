import { Link } from "react-router-dom"
import {
  ArrowRight,
  PenTool,
  Code2,
  ShoppingCart,
  LifeBuoy,
  Check,
  Sparkles,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { services, sectors, work, packages } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import { Section, SectionHeading, GradientText, Stat, BrowserFrame, CtaBand } from "../components/primitives"

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

const trusted = [
  "Professional services",
  "Healthcare",
  "Retail & ecommerce",
  "Startups",
  "Charities",
  "Hospitality",
]

export default function Home() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="gk-aurora" aria-hidden />
        <div className="absolute inset-0 gk-grid" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-20 sm:px-6 sm:pb-16 sm:pt-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <FadeIn>
              <span className="gk-pill">
                <Sparkles className="h-3.5 w-3.5" /> Web design &amp; development studio
              </span>
              <h1 className="mt-6 max-w-2xl font-serif text-[2.75rem] font-bold leading-[1.04] tracking-tight sm:text-6xl">
                One team that draws the vision and{" "}
                <GradientText>builds it properly.</GradientText>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                GAkinz sits at the crossroads of design and development. One studio designs your site
                and builds it — so it looks right, works right, and never falls through the gap
                between the two.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button asChild size="lg" className="gk-shine shadow-lg shadow-primary/25">
                  <Link to="/contact">
                    Start a project <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/work">See our work</Link>
                </Button>
              </div>
              <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex text-amber-400" aria-hidden>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <span>Trusted by studios, shops, clinics and causes</span>
              </div>
            </FadeIn>

            {/* Hero visual — browser frame previewing the brand */}
            <FadeIn delay={0.12}>
              <div className="gk-float relative">
                <BrowserFrame>
                  <div className="relative overflow-hidden p-7">
                    <div className="gk-aurora" aria-hidden />
                    <div className="relative">
                      <div className="h-2.5 w-24 rounded-full bg-primary/30" />
                      <div className="mt-5 h-7 w-3/4 rounded-md bg-foreground/10" />
                      <div className="mt-2.5 h-7 w-1/2 rounded-md bg-primary/25" />
                      <div className="mt-5 space-y-2">
                        <div className="h-2.5 w-full rounded-full bg-foreground/8" />
                        <div className="h-2.5 w-5/6 rounded-full bg-foreground/8" />
                      </div>
                      <div className="mt-6 grid grid-cols-3 gap-3">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="gk-card p-3">
                            <div className="h-7 w-7 rounded-lg bg-primary/15" />
                            <div className="mt-3 h-2 w-full rounded-full bg-foreground/10" />
                            <div className="mt-1.5 h-2 w-2/3 rounded-full bg-foreground/8" />
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 flex gap-2">
                        <div className="h-8 w-28 rounded-lg bg-primary" />
                        <div className="h-8 w-20 rounded-lg border border-border" />
                      </div>
                    </div>
                  </div>
                </BrowserFrame>
                {/* floating accent card */}
                <div className="gk-glass absolute -bottom-5 -left-5 hidden rounded-xl p-3 shadow-xl sm:flex sm:items-center sm:gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
                    <Check className="h-4 w-4" />
                  </span>
                  <div className="text-xs leading-tight">
                    <div className="font-semibold text-foreground">WCAG 2.1 AA</div>
                    <div className="text-muted-foreground">Accessible by default</div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>

        {/* Trust marquee */}
        <div className="relative border-t border-border/60 bg-muted/30 py-6">
          <div className="gk-marquee-mask mx-auto max-w-6xl px-4 sm:px-6">
            <div className="gk-marquee gap-12">
              {[...trusted, ...trusted].map((t, i) => (
                <span
                  key={i}
                  className="whitespace-nowrap text-sm font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────────────────── */}
      <Section>
        <SectionHeading
          eyebrow="What we do"
          title={<>Design and build, <GradientText soft>under one roof</GradientText></>}
          intro="Four ways we help. Every one starts with the same team and ends with a site you can actually run."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s, i) => {
            const Icon = serviceIcons[s.slug] ?? Code2
            return (
              <FadeIn key={s.slug} delay={i * 0.05}>
                <Link
                  to={`/services/${s.slug}`}
                  className="gk-card group block h-full p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/10">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-base font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.summary}</p>
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

      {/* ── Why one team ─────────────────────────────────────────────────── */}
      <Section muted>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <FadeIn>
            <SectionHeading
              eyebrow="Why GAkinz"
              title={<>No handoff. <GradientText soft>No gaps.</GradientText></>}
              intro="Most web projects lose time and quality in the gap between the designer and the developer. We do both, so decisions made in the design carry straight into the code."
            />
            <ul className="mt-8 space-y-3.5">
              {[
                "One team accountable from sketch to launch",
                "Hard-to-build ideas caught while they are still cheap to change",
                "Built to web standards and WCAG 2.1 AA accessibility",
                "A site you can update yourself after we hand it over",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[0.95rem] text-foreground">{point}</span>
                </li>
              ))}
            </ul>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="grid grid-cols-2 gap-4">
              <Stat value="One team" label="Design + build" />
              <Stat value="WCAG 2.1 AA" label="Accessibility" />
              <Stat value="Real devices" label="Tested on" />
              <Stat value="Care plans" label="After launch" />
            </div>
          </FadeIn>
        </div>
      </Section>

      {/* ── Process ──────────────────────────────────────────────────────── */}
      <Section>
        <SectionHeading eyebrow="How we work" title="A clear path from first call to launch" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <FadeIn key={step.n} delay={i * 0.05}>
              <div className="gk-card h-full p-6">
                <span className="font-serif text-4xl font-bold text-primary/25">{step.n}</span>
                <h3 className="mt-3 text-base font-semibold">{step.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.d}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ── Sectors ──────────────────────────────────────────────────────── */}
      <Section muted>
        <SectionHeading
          eyebrow="Who we serve"
          title="Studios, shops, clinics and causes"
          intro="We work across sectors, but the through-line is the same: businesses that care how their site looks and behaves."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.slice(0, 6).map((sec, i) => (
            <FadeIn key={sec.title} delay={i * 0.04}>
              <div className="gk-card h-full p-6">
                <h3 className="text-base font-semibold">{sec.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{sec.blurb}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ── Work preview ─────────────────────────────────────────────────── */}
      <Section>
        <div className="flex items-end justify-between gap-4">
          <SectionHeading eyebrow="Selected work" title="A look at what we have built" />
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/work">
              All work <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {work.map((w, i) => (
            <FadeIn key={w.title} delay={i * 0.05}>
              <div className="gk-card group h-full overflow-hidden">
                <div className="relative h-40 overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
                  <div className="absolute inset-0 gk-dots" aria-hidden />
                  <span className="absolute left-5 top-5 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary backdrop-blur">
                    {w.sector}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="text-base font-semibold">{w.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{w.summary}</p>
                  <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Check className="h-4 w-4 text-emerald-500" /> {w.result}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ── Pricing teaser ───────────────────────────────────────────────── */}
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
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {packages.slice(0, 3).map((p, i) => (
            <FadeIn key={p.name} delay={i * 0.05}>
              <Link
                to="/pricing"
                className="gk-card group block h-full p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <h3 className="text-base font-semibold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.best}</p>
                <div className="mt-5">
                  <span className="text-sm text-muted-foreground">from </span>
                  <span className="font-serif text-3xl font-bold">
                    <GradientText>{p.price}</GradientText>
                  </span>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <CtaBand
        title="Have a project in mind?"
        intro="Tell us what you are building. We will come back with a clear next step, not a hard sell."
      />
    </>
  )
}
