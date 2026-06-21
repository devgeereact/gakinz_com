import { Check } from "lucide-react"
import { work, processStages } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import SiteMockup, { variantForSector } from "../components/SiteMockup"
import { PageHero, Section, FeatureRow, RuleEyebrow, CtaBand } from "../components/primitives"

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

      {/* Stat row */}
      <Section>
        <div className="grid border-t border-[hsl(var(--gk-indigo)/0.14)] sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <FadeIn key={s.k}>
              <div className="border-b border-[hsl(var(--gk-indigo)/0.14)] py-8 sm:px-7 lg:border-b-0 lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:border-[hsl(var(--gk-indigo)/0.14)] lg:first:pl-0">
                <div className="font-serif text-2xl font-bold sm:text-[1.7rem]">{s.v}</div>
                <div className="mt-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{s.k}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* Case studies */}
      <Section muted>
        <RuleEyebrow>Selected work</RuleEyebrow>
        <h2 className="mt-4 max-w-2xl font-serif text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
          The challenge, the approach, the result
        </h2>
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
              >
                <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">{w.summary}</p>
                <dl className="mt-6 space-y-4 border-t border-[hsl(var(--gk-indigo)/0.14)] pt-5">
                  <div className="grid grid-cols-[6.5rem_1fr] gap-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Challenge</dt>
                    <dd className="text-sm text-foreground">{w.challenge}</dd>
                  </div>
                  <div className="grid grid-cols-[6.5rem_1fr] gap-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Approach</dt>
                    <dd className="text-sm text-foreground">{w.approach}</dd>
                  </div>
                  <div className="grid grid-cols-[6.5rem_1fr] gap-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[hsl(var(--gk-violet))]">Result</dt>
                    <dd className="flex items-start gap-2 text-sm font-medium text-foreground">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" /> {w.result}
                    </dd>
                  </div>
                </dl>
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

      {/* Process recap */}
      <Section>
        <RuleEyebrow>How every project runs</RuleEyebrow>
        <h2 className="mt-4 max-w-2xl font-serif text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
          A clear path, every time
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

      <CtaBand
        title="Want a project like one of these?"
        intro="Tell us about your business and where you want it to go. We'll show you what a site built by one team can do."
        cta="Get in touch"
      />
    </>
  )
}
