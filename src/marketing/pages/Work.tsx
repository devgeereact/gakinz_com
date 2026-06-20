import { Check } from "lucide-react"
import { work, processStages } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import SiteMockup, { variantForSector } from "../components/SiteMockup"
import { PageHero, Section, SectionHeading, Stat, CtaBand } from "../components/primitives"

const stats = [
  { v: "One team", k: "Design + build" },
  { v: "WCAG 2.1 AA", k: "Accessibility" },
  { v: "Real devices", k: "Tested on" },
  { v: "Fixed price", k: "Before work starts" },
]

export default function Work() {
  return (
    <>
      <PageHero
        eyebrow="Our work"
        title="Sites we have designed and built"
        intro="A selection of projects. Each was designed and built by the same team, from first sketch to launch — and each is a site the client can run, not one that needs us forever."
        breadcrumb="Work"
      />

      {/* Stats strip */}
      <Section>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s, i) => (
            <FadeIn key={s.k} delay={i * 0.05}>
              <Stat value={s.v} label={s.k} />
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* Case studies */}
      <Section muted>
        <SectionHeading eyebrow="Selected work" title="The challenge, the approach, the result" />
        <div className="mt-10 space-y-6">
          {work.map((w, i) => (
            <FadeIn key={w.title} delay={i * 0.05}>
              <article className="gk-card grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_1.6fr]">
                {/* Left — title + visual */}
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--gk-violet))]">
                      {w.sector}
                    </span>
                    <span className="font-serif text-3xl font-extrabold text-[hsl(var(--gk-indigo)/0.08)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-2 font-serif text-xl font-bold">{w.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{w.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {w.services.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-[hsl(var(--gk-violet)/0.10)] px-2.5 py-1 text-xs font-medium text-[hsl(var(--gk-violet))]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="relative mt-5 aspect-[4/3] w-full overflow-hidden rounded-xl ring-1 ring-[hsl(var(--gk-violet)/0.12)]">
                    <SiteMockup variant={variantForSector(w.sector)} />
                  </div>
                </div>
                {/* Right — challenge / approach / result */}
                <dl className="grid gap-5 sm:grid-cols-3 lg:gap-6">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Challenge</dt>
                    <dd className="mt-2 text-sm text-foreground">{w.challenge}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Approach</dt>
                    <dd className="mt-2 text-sm text-foreground">{w.approach}</dd>
                  </div>
                  <div className="rounded-lg bg-[hsl(var(--gk-violet)/0.06)] p-4 sm:bg-transparent sm:p-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--gk-violet))]">Result</dt>
                    <dd className="mt-2 flex items-start gap-1.5 text-sm font-medium text-foreground">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" /> {w.result}
                    </dd>
                  </div>
                </dl>
              </article>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* Process recap */}
      <Section>
        <SectionHeading
          eyebrow="How every project runs"
          title="A clear path, every time"
          intro="Whatever we build, the route is the same — and you always know what stage you're at."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {processStages.map((stage, i) => (
            <FadeIn key={stage.n} delay={i * 0.05}>
              <div className="gk-card h-full p-6">
                <span className="font-serif text-4xl font-extrabold text-[hsl(var(--gk-indigo)/0.10)]">
                  {stage.n}
                </span>
                <h3 className="mt-2 text-base font-semibold">{stage.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{stage.what}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Want a project like one of these?"
        intro="Tell us about your business and where you want it to go. We'll show you what a site built by one team can do."
        cta="Get in touch"
      />
    </>
  )
}
