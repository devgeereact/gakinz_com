import { Briefcase, HeartPulse, ShoppingBag, Rocket, HandHeart, Store, Check } from "lucide-react"
import { sectors, whyOneTeam } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import SiteMockup, { variantForSector } from "../components/SiteMockup"
import { PageHero, Section, SectionHeading, CounterStat, CtaBand } from "../components/primitives"

const sectorIcons = [Briefcase, HeartPulse, ShoppingBag, Rocket, HandHeart, Store]

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

      {/* Sector cards */}
      <Section>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sectors.map((s, i) => {
            const Icon = sectorIcons[i % sectorIcons.length]
            return (
              <FadeIn key={s.title} delay={i * 0.04}>
                <div className="gk-card flex h-full flex-col overflow-hidden">
                  <div className="relative h-32 overflow-hidden border-b border-[hsl(var(--gk-indigo)/0.06)]">
                    <SiteMockup variant={variantForSector(s.title)} />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/10 to-transparent" aria-hidden />
                    <span className="absolute left-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--gk-violet))] to-[hsl(var(--gk-sky))] text-white shadow-lg">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="absolute right-4 top-2 font-serif text-3xl font-extrabold text-white/70 drop-shadow">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h2 className="text-base font-semibold">{s.title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{s.blurb}</p>
                    <ul className="mt-4 space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
                      {s.needs.map((n) => (
                        <li key={n} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[hsl(var(--gk-violet))]" />
                          {n}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </FadeIn>
            )
          })}
        </div>
      </Section>

      {/* Counters */}
      <Section muted>
        <div className="grid gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {counters.map((c, i) => (
            <FadeIn key={c.label} delay={i * 0.05}>
              <CounterStat to={c.to} label={c.label} />
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* Why one team matters */}
      <Section>
        <SectionHeading
          eyebrow="Whatever the sector"
          title="Why one team matters"
          intro="The field changes; the way we work doesn't. The same people design and build, so quality holds all the way through."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {whyOneTeam.map((r, i) => (
            <FadeIn key={r.title} delay={i * 0.05}>
              <div className="gk-card h-full p-6">
                <span className="font-serif text-3xl font-extrabold text-[hsl(var(--gk-indigo)/0.10)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-base font-semibold">{r.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{r.detail}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Not sure if we are a fit?"
        intro="Tell us about the project. If we are not the right studio for it, we will say so."
        cta="Start a conversation"
      />
    </>
  )
}
