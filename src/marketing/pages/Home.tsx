import { Link } from "react-router-dom"
import { ArrowRight, Check, Users, ShieldCheck, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { services, sectors, work, whyOneTeam } from "@/marketing/data/site"
import { useMarketingBlog } from "@/marketing/data/blog"
import FadeIn from "../components/FadeIn"
import CountUp from "../components/CountUp"
import SiteMockup, { variantForSector } from "../components/SiteMockup"
import Testimonials from "../components/Testimonials"
import {
  Section,
  Split,
  IndexList,
  IndexRow,
  FeatureRow,
  RuleEyebrow,
  GradientText,
  QuoteBand,
  CtaBand,
} from "../components/primitives"

const promises = [
  { icon: Users, t: "One team, end to end", d: "The people who design your site are the people who build it. Nothing is lost in a handoff." },
  { icon: ShieldCheck, t: "Accessible by default", d: "Built to WCAG 2.1 AA and tested on real devices — not bolted on at the end." },
  { icon: Wallet, t: "Fixed price, clear scope", d: "A short discovery call, then a fixed number before any work begins. No surprises." },
]

const steps = [
  { n: "01", t: "Discover", d: "We learn the business, the audience and what the site has to achieve." },
  { n: "02", t: "Design", d: "We draw the screens and you sign them off before any code is written." },
  { n: "03", t: "Build", d: "The same team turns the design into a fast, accessible, standards-based site." },
  { n: "04", t: "Launch & care", d: "We go live, then keep the site healthy, secure and improving." },
]

const heroFacts = ["One team — design + build", "WCAG 2.1 AA", "Fixed price, fixed scope"]

const trusted = ["Professional services", "Healthcare", "Retail & ecommerce", "Startups", "Charities", "Hospitality"]

function MiniStat({ to, suffix = "", label }: { to: number; suffix?: string; label: string }) {
  return (
    <div>
      <div className="font-serif text-4xl font-extrabold sm:text-5xl">
        <GradientText>
          <CountUp to={to} suffix={suffix} />
        </GradientText>
      </div>
      <div className="mt-2 text-sm text-muted-foreground">{label}</div>
    </div>
  )
}

export default function Home() {
  const { posts } = useMarketingBlog()
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="gk-aurora" aria-hidden />
        <div className="absolute inset-0 gk-grid" aria-hidden />
        <span className="gk-grain" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-20 sm:px-6 sm:pb-20 sm:pt-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <FadeIn>
              <RuleEyebrow>Web design &amp; development studio</RuleEyebrow>
              <h1 className="mt-6 max-w-2xl font-serif text-[2.85rem] font-bold leading-[1.0] tracking-tight sm:text-6xl lg:text-[4.4rem]">
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
              {/* hairline fact row (replaces star rating) */}
              <dl className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-[hsl(var(--gk-indigo)/0.14)] pt-6">
                {heroFacts.map((f, i) => (
                  <div key={f} className="flex items-center gap-7">
                    {i > 0 && <span className="hidden h-1 w-1 rounded-full bg-[hsl(var(--gk-violet))] sm:block" aria-hidden />}
                    <dt className="text-sm font-medium text-foreground">{f}</dt>
                  </div>
                ))}
              </dl>
            </FadeIn>

            {/* Hero visual */}
            <FadeIn delay={0.12}>
              <div className="gk-float relative">
                <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--gk-indigo)/0.1)] shadow-2xl shadow-[hsl(var(--gk-violet)/0.18)]">
                  <div className="aspect-[4/3] w-full">
                    <SiteMockup variant="studio" />
                  </div>
                </div>
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

        {/* hairline sector ticker */}
        <div className="relative border-t border-border/70 bg-muted/20 py-5">
          <div className="gk-marquee-mask mx-auto max-w-6xl px-4 sm:px-6">
            <div className="gk-marquee gap-10">
              {[...trusted, ...trusted].map((t, i) => (
                <span key={i} className="flex items-center gap-10 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t}
                  <span className="h-1 w-1 rounded-full bg-[hsl(var(--gk-violet)/0.5)]" aria-hidden />
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Manifesto (3 columns, hairline-ruled, no boxes) ──────────────── */}
      <Section>
        <FadeIn>
          <p className="max-w-4xl font-serif text-2xl font-medium leading-snug tracking-tight sm:text-[2rem] sm:leading-[1.25]">
            We design and build under one roof — so the version you{" "}
            <GradientText soft>approve is the version you get.</GradientText>
          </p>
        </FadeIn>
        <div className="mt-12 grid gap-px overflow-hidden border-y border-[hsl(var(--gk-indigo)/0.14)] sm:grid-cols-3 sm:gap-0">
          {promises.map((p, i) => {
            const Icon = p.icon
            return (
              <FadeIn key={p.t} delay={i * 0.06}>
                <div className={cnCol(i)}>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--gk-violet)/0.1)] text-[hsl(var(--gk-violet))]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 font-serif text-lg font-bold">{p.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.d}</p>
                </div>
              </FadeIn>
            )
          })}
        </div>
      </Section>

      {/* ── Services — index list ────────────────────────────────────────── */}
      <Section muted>
        <Split
          label="What we do"
          title={<>Design and build, <GradientText soft>under one roof</GradientText></>}
          intro="Four ways we help. Every one starts with the same team and ends with a site you can actually run."
          sticky
          aside={
            <Button asChild variant="outline">
              <Link to="/services">All services <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          }
        >
          <IndexList>
            {services.map((s, i) => (
              <IndexRow
                key={s.slug}
                index={i + 1}
                title={s.title}
                to={`/services/${s.slug}`}
                meta={`${s.deliverables.length} deliverables`}
              >
                {s.summary}
              </IndexRow>
            ))}
          </IndexList>
        </Split>
      </Section>

      {/* ── Why one team — bento ─────────────────────────────────────────── */}
      <Section>
        <RuleEyebrow>Why GAkinz</RuleEyebrow>
        <h2 className="mt-4 max-w-2xl font-serif text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
          No handoff. <GradientText soft>No gaps.</GradientText>
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* tall dark tile */}
          <FadeIn className="sm:col-span-2 lg:col-span-1 lg:row-span-2">
            <div className="gk-glow relative flex h-full flex-col overflow-hidden rounded-2xl bg-foreground p-7 text-background">
              <span className="gk-grain" aria-hidden />
              <p className="relative text-sm leading-relaxed text-background/75">
                Most web projects lose time and quality in the gap between the designer and the
                developer. We do both, so decisions made in the design carry straight into the code.
              </p>
              <ul className="relative mt-6 space-y-4">
                {whyOneTeam.map((r) => (
                  <li key={r.title} className="border-t border-background/15 pt-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Check className="h-4 w-4 text-[hsl(var(--gk-violet))]" /> {r.title}
                    </div>
                    <p className="mt-1 pl-6 text-sm text-background/65">{r.detail}</p>
                  </li>
                ))}
              </ul>
              <Link to="/about" className="relative mt-auto inline-flex items-center gap-1 pt-6 text-sm font-medium text-background hover:text-[hsl(var(--gk-violet))]">
                More about the studio <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeIn>
          {/* wide mockup tile */}
          <FadeIn delay={0.05} className="sm:col-span-2">
            <div className="relative h-full min-h-[14rem] overflow-hidden rounded-2xl border border-[hsl(var(--gk-indigo)/0.1)]">
              <SiteMockup variant="health" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-foreground/45 to-transparent px-5 pb-4 pt-12">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/90">Designed &amp; built by one team</span>
              </div>
            </div>
          </FadeIn>
          {/* two stat tiles */}
          <FadeIn delay={0.1}>
            <div className="flex h-full flex-col justify-center rounded-2xl border border-[hsl(var(--gk-indigo)/0.12)] p-7">
              <MiniStat to={100} suffix="%" label="Accessible — WCAG 2.1 AA" />
            </div>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="flex h-full flex-col justify-center rounded-2xl border border-[hsl(var(--gk-indigo)/0.12)] p-7">
              <MiniStat to={5} label="Stages, sketch to launch" />
            </div>
          </FadeIn>
        </div>
      </Section>

      {/* ── Process — horizontal steps ───────────────────────────────────── */}
      <Section muted>
        <RuleEyebrow>How we work</RuleEyebrow>
        <h2 className="mt-4 max-w-2xl font-serif text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
          A clear path from first call to launch
        </h2>
        <div className="mt-12 grid border-t border-[hsl(var(--gk-indigo)/0.14)] sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <FadeIn key={step.n} delay={i * 0.05}>
              <div className="h-full border-b border-[hsl(var(--gk-indigo)/0.14)] py-7 sm:border-b-0 sm:px-7 sm:py-0 lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:border-[hsl(var(--gk-indigo)/0.14)] sm:[&:nth-child(odd)]:pl-0 lg:[&:nth-child(odd)]:pl-7 lg:first:pl-0">
                <span className="font-serif text-5xl font-extrabold text-[hsl(var(--gk-indigo)/0.12)]">{step.n}</span>
                <h3 className="mt-3 text-lg font-semibold">{step.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.d}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ── Sectors — compact hairline list ──────────────────────────────── */}
      <Section>
        <Split
          label="Who we serve"
          title="Studios, shops, clinics and causes"
          intro="We work across sectors, but the through-line is the same: businesses that care how their site looks and behaves."
          sticky
          aside={
            <Button asChild variant="outline">
              <Link to="/sectors">All sectors <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          }
        >
          <div className="grid border-t border-[hsl(var(--gk-indigo)/0.14)] sm:grid-cols-2 sm:gap-x-12">
            {sectors.slice(0, 6).map((sec, i) => (
              <FadeIn key={sec.title} delay={i * 0.04}>
                <div className="flex items-start gap-4 border-b border-[hsl(var(--gk-indigo)/0.14)] py-5">
                  <span className="font-serif text-sm font-bold text-[hsl(var(--gk-violet))]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-serif text-base font-bold">{sec.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{sec.blurb}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </Split>
      </Section>

      {/* ── Work — alternating feature rows ──────────────────────────────── */}
      <Section muted>
        <div className="flex items-end justify-between gap-4">
          <div>
            <RuleEyebrow>Selected work</RuleEyebrow>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
              A look at what we have built
            </h2>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/work">All work <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="mt-12">
          {work.map((w, i) => (
            <FadeIn key={w.title}>
              <FeatureRow
                index={String(i + 1).padStart(2, "0")}
                eyebrow={w.sector}
                flip={i % 2 === 1}
                title={w.title}
                media={
                  <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--gk-indigo)/0.1)] shadow-xl shadow-[hsl(var(--gk-violet)/0.12)]">
                    <div className="aspect-[16/10] w-full">
                      <SiteMockup variant={variantForSector(w.sector)} />
                    </div>
                  </div>
                }
                footer={
                  <Button asChild variant="ghost" className="px-0 hover:bg-transparent hover:text-[hsl(var(--gk-violet))]">
                    <Link to="/work">View case study <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                }
              >
                <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">{w.summary}</p>
                <p className="mt-4 flex items-center gap-2 text-sm font-medium">
                  <Check className="h-4 w-4 text-emerald-500" /> {w.result}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {w.services.map((s) => (
                    <span key={s} className="rounded-full border border-[hsl(var(--gk-violet)/0.25)] px-2.5 py-1 text-xs font-medium text-[hsl(var(--gk-violet))]">
                      {s}
                    </span>
                  ))}
                </div>
              </FeatureRow>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ── Testimonials (CMS-curated; hidden until any exist) ───────────── */}
      <Testimonials muted />

      {/* ── Brand pull-quote ─────────────────────────────────────────────── */}
      <QuoteBand
        quote="One team that draws the vision and builds it properly — so the version you approve is the version you get."
        attribution="The GAkinz promise"
      />

      {/* ── Insights — index list ────────────────────────────────────────── */}
      <Section>
        <Split
          label="Insights"
          title="Notes from the studio"
          sticky
          aside={
            <Button asChild variant="outline">
              <Link to="/resources">All insights <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          }
        >
          <IndexList>
            {posts.slice(0, 3).map((post, i) => (
              <IndexRow
                key={post.slug}
                index={i + 1}
                title={post.title}
                to={`/resources/${post.slug}`}
                meta={`${post.readMins} min read`}
              >
                {post.excerpt}
              </IndexRow>
            ))}
          </IndexList>
        </Split>
      </Section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <CtaBand
        title="Have a project in mind?"
        intro="Tell us what you are building. We will come back with a clear next step, not a hard sell."
      />
    </>
  )
}

// Manifesto column: vertical hairline between columns on sm+, padding rhythm.
function cnCol(i: number) {
  return [
    "h-full bg-background px-0 py-8 sm:px-7",
    i === 0 ? "sm:pl-0" : "",
    i > 0 ? "sm:border-l sm:border-[hsl(var(--gk-indigo)/0.14)]" : "",
    "border-b border-[hsl(var(--gk-indigo)/0.14)] sm:border-b-0",
  ].join(" ")
}
