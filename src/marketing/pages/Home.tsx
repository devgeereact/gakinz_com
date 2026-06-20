import { Link } from "react-router-dom"
import {
  ArrowRight,
  PenTool,
  Code2,
  ShoppingCart,
  LifeBuoy,
  Check,
  Users,
  ShieldCheck,
  Wallet,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { services, sectors, work, whyOneTeam, insights } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import SiteMockup, { variantForSector } from "../components/SiteMockup"
import {
  Section,
  SectionHeading,
  RuleEyebrow,
  GradientText,
  CounterStat,
  ServiceTile,
  QuoteBand,
  BrowserFrame,
  CtaBand,
} from "../components/primitives"

const serviceIcons: Record<string, typeof PenTool> = {
  "web-design": PenTool,
  "web-development": Code2,
  ecommerce: ShoppingCart,
  "care-and-support": LifeBuoy,
}

const promises = [
  {
    icon: Users,
    t: "One team, end to end",
    d: "The people who design your site are the people who build it. Nothing is lost in a handoff.",
  },
  {
    icon: ShieldCheck,
    t: "Accessible by default",
    d: "Built to WCAG 2.1 AA and tested on real devices — not bolted on at the end.",
  },
  {
    icon: Wallet,
    t: "Fixed price, clear scope",
    d: "A short discovery call, then a fixed number before any work begins. No surprises.",
  },
]

const counters = [
  { to: 1, label: "Team — design + build" },
  { to: 4, label: "Core services, one roof" },
  { to: 5, label: "Stage process" },
  { to: 100, suffix: "%", label: "WCAG 2.1 AA accessible" },
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
        <span className="gk-grain" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-20 sm:px-6 sm:pb-16 sm:pt-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <FadeIn>
              <RuleEyebrow>Web design &amp; development studio</RuleEyebrow>
              <h1 className="mt-6 max-w-2xl font-serif text-[2.85rem] font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-[4.3rem]">
                One team that draws the vision and <GradientText>builds it properly.</GradientText>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                GAkinz sits at the crossroads of design and development. One studio designs your site
                and builds it — so it looks right, works right, and never falls through the gap between
                the two.
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
                      <div className="mt-2.5 h-7 w-1/2 rounded-md bg-[hsl(var(--gk-violet)/0.35)]" />
                      <div className="mt-5 space-y-2">
                        <div className="h-2.5 w-full rounded-full bg-foreground/[0.08]" />
                        <div className="h-2.5 w-5/6 rounded-full bg-foreground/[0.08]" />
                      </div>
                      <div className="mt-6 grid grid-cols-3 gap-3">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="gk-card p-3">
                            <div className="h-7 w-7 rounded-lg bg-[hsl(var(--gk-violet)/0.18)]" />
                            <div className="mt-3 h-2 w-full rounded-full bg-foreground/10" />
                            <div className="mt-1.5 h-2 w-2/3 rounded-full bg-foreground/[0.08]" />
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

        {/* Trust marquee — brand strip */}
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

      {/* ── Promise banner (3-up dark cards) ─────────────────────────────── */}
      <Section>
        <div className="grid gap-5 lg:grid-cols-3">
          {promises.map((p, i) => {
            const Icon = p.icon
            return (
              <FadeIn key={p.t} delay={i * 0.06}>
                <div className="gk-glow relative h-full overflow-hidden rounded-2xl bg-foreground p-7 text-background">
                  <span className="gk-grain" aria-hidden />
                  <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--gk-violet))] to-[hsl(var(--gk-sky))] text-white shadow-lg">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="relative mt-5 font-serif text-xl font-bold">{p.t}</h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-background/70">{p.d}</p>
                </div>
              </FadeIn>
            )
          })}
        </div>
      </Section>

      {/* ── Services ─────────────────────────────────────────────────────── */}
      <Section muted>
        <SectionHeading
          eyebrow="What we do"
          title={
            <>
              Design and build, <GradientText soft>under one roof</GradientText>
            </>
          }
          intro="Four ways we help. Every one starts with the same team and ends with a site you can actually run."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s, i) => (
            <FadeIn key={s.slug} delay={i * 0.05}>
              <ServiceTile
                to={`/services/${s.slug}`}
                title={s.title}
                summary={s.summary}
                icon={serviceIcons[s.slug] ?? Code2}
                index={i + 1}
              />
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ── About / why one team (with badge) ────────────────────────────── */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Visual + experience badge */}
          <FadeIn>
            <div className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-[hsl(var(--gk-indigo)/0.08)] shadow-xl shadow-[hsl(var(--gk-violet)/0.15)]">
                <SiteMockup variant="health" />
                <div className="gk-glass absolute inset-x-6 bottom-6 rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--gk-violet))]" /> Sketch
                    <ArrowRight className="h-3.5 w-3.5" /> Build <ArrowRight className="h-3.5 w-3.5" /> Launch
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-foreground/10">
                    <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[hsl(var(--gk-violet))] to-[hsl(var(--gk-sky))]" />
                  </div>
                </div>
              </div>
              {/* badge */}
              <div className="gk-card absolute -right-3 -top-6 flex items-center gap-3 p-4 sm:-right-6">
                <span className="font-serif text-5xl font-extrabold leading-none">
                  <GradientText>100%</GradientText>
                </span>
                <span className="text-xs font-medium leading-tight text-muted-foreground">
                  One team,
                  <br />
                  design + build
                </span>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <SectionHeading
              eyebrow="Why GAkinz"
              title={
                <>
                  No handoff. <GradientText soft>No gaps.</GradientText>
                </>
              }
              intro="Most web projects lose time and quality in the gap between the designer and the developer. We do both, so decisions made in the design carry straight into the code."
            />
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {whyOneTeam.map((r) => (
                <li key={r.title} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--gk-violet)/0.12)] text-[hsl(var(--gk-violet))]">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{r.title}</div>
                    <div className="mt-0.5 text-sm text-muted-foreground">{r.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8">
              <Link to="/about">
                More about the studio <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </FadeIn>
        </div>
      </Section>

      {/* ── Counters ─────────────────────────────────────────────────────── */}
      <Section muted>
        <div className="grid gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {counters.map((c, i) => (
            <FadeIn key={c.label} delay={i * 0.05}>
              <CounterStat to={c.to} suffix={c.suffix} label={c.label} />
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ── Sectors ──────────────────────────────────────────────────────── */}
      <Section>
        <SectionHeading
          eyebrow="Who we serve"
          title="Studios, shops, clinics and causes"
          intro="We work across sectors, but the through-line is the same: businesses that care how their site looks and behaves."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.slice(0, 6).map((sec, i) => (
            <FadeIn key={sec.title} delay={i * 0.04}>
              <div className="gk-card group h-full p-6">
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-semibold">{sec.title}</h3>
                  <span className="font-serif text-2xl font-extrabold text-[hsl(var(--gk-indigo)/0.10)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{sec.blurb}</p>
              </div>
            </FadeIn>
          ))}
        </div>
        <div className="mt-8">
          <Button asChild variant="ghost">
            <Link to="/sectors">
              All sectors <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Section>

      {/* ── Work preview (image-forward, hover lift) ─────────────────────── */}
      <Section muted>
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
              <Link
                to="/work"
                className="group relative block h-80 overflow-hidden rounded-2xl border border-[hsl(var(--gk-indigo)/0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="absolute inset-0">
                  <SiteMockup variant={variantForSector(w.sector)} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/35 via-transparent to-transparent" aria-hidden />
                <span className="absolute left-5 top-5 rounded-full bg-background/85 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--gk-violet))] backdrop-blur">
                  {w.sector}
                </span>
                {/* sliding content panel */}
                <div className="absolute inset-x-4 bottom-4 translate-y-3 rounded-2xl bg-white/90 p-5 shadow-xl backdrop-blur transition-transform duration-300 group-hover:translate-y-0">
                  <h3 className="font-serif text-lg font-bold">{w.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{w.summary}</p>
                  <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Check className="h-4 w-4 text-emerald-500" /> {w.result}
                  </p>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ── Brand pull-quote ─────────────────────────────────────────────── */}
      <QuoteBand
        quote="One team that draws the vision and builds it properly — so the version you approve is the version you get."
        attribution="The GAkinz promise"
      />

      {/* ── Latest insights ──────────────────────────────────────────────── */}
      <Section>
        <div className="flex items-end justify-between gap-4">
          <SectionHeading eyebrow="Insights" title="Notes from the studio" />
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/resources">
              All insights <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {insights.slice(0, 3).map((post, i) => (
            <FadeIn key={post.slug} delay={i * 0.05}>
              <Link
                to={`/resources/${post.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[hsl(var(--gk-indigo)/0.08)] bg-white shadow-[0_1px_2px_hsl(var(--gk-indigo)/0.05),0_10px_30px_-18px_hsl(var(--gk-indigo)/0.18)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_-20px_hsl(var(--gk-violet)/0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="relative h-36 overflow-hidden border-b border-[hsl(var(--gk-indigo)/0.06)]">
                  <SiteMockup variant="article" />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--gk-violet))]">
                    {post.readMins} min read
                  </div>
                  <h3 className="mt-2 font-serif text-lg font-bold leading-snug">{post.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
                  <span className="mt-4 inline-flex items-center border-t border-border pt-4 text-sm font-medium text-foreground">
                    Read the piece
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
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
