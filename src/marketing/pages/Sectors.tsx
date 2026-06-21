import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { sectors, whyOneTeam } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import CountUp from "../components/CountUp"
import SiteMockup from "../components/SiteMockup"
import { PageHero, Section, Split, IndexList, IndexRow, GradientText, CtaBand } from "../components/primitives"

const counters = [
  { to: 6, label: "Sectors we build for" },
  { to: 4, label: "Core services" },
  { to: 5, label: "Stage process" },
  { to: 1, label: "Team, start to finish" },
]

export default function Sectors() {
  return (
    <>
      <PageHero
        eyebrow="Who we serve"
        title="The businesses we build for"
        intro="We work across sectors, but the clients who get the most from us share one thing: they care how their site looks and behaves, not just that it exists. Whatever the field, the work is the same — one team, design and build, from sketch to launch."
        breadcrumb="Sectors"
      />

      {/* Sector index */}
      <Section>
        <Split
          label="Who we serve"
          title="Six fields, one way of working"
          sticky
          aside={
            <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--gk-indigo)/0.1)] shadow-lg shadow-[hsl(var(--gk-violet)/0.12)]">
              <div className="aspect-[16/11] w-full">
                <SiteMockup variant="studio" />
              </div>
            </div>
          }
        >
          <IndexList>
            {sectors.map((s, i) => (
              <IndexRow key={s.title} index={i + 1} title={s.title} meta={s.needs.join("  ·  ")}>
                {s.blurb}
              </IndexRow>
            ))}
          </IndexList>
        </Split>
      </Section>

      {/* Stat row */}
      <Section muted>
        <div className="grid border-t border-[hsl(var(--gk-indigo)/0.14)] sm:grid-cols-2 lg:grid-cols-4">
          {counters.map((c) => (
            <FadeIn key={c.label}>
              <div className="border-b border-[hsl(var(--gk-indigo)/0.14)] py-8 sm:px-7 lg:border-b-0 lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:border-[hsl(var(--gk-indigo)/0.14)] lg:first:pl-0">
                <div className="font-serif text-5xl font-extrabold">
                  <GradientText>
                    <CountUp to={c.to} />
                  </GradientText>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">{c.label}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* Why one team matters */}
      <Section>
        <Split
          label="Whatever the sector"
          title="Why one team matters"
          intro="The field changes; the way we work doesn't. The same people design and build, so quality holds all the way through."
          sticky
        >
          <IndexList>
            {whyOneTeam.map((r, i) => (
              <IndexRow key={r.title} index={i + 1} title={r.title}>
                {r.detail}
              </IndexRow>
            ))}
          </IndexList>
        </Split>
      </Section>

      <CtaBand
        title="Not sure if we are a fit?"
        intro="Tell us about the project. If we are not the right studio for it, we will say so."
        cta="Start a conversation"
      />
    </>
  )
}
