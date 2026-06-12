import { Briefcase, HeartPulse, ShoppingBag, Rocket, HandHeart, Store, Check } from "lucide-react"
import { sectors, whyOneTeam } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import { PageHero, Section, SectionHeading, CtaBand } from "../components/primitives"

const sectorIcons = [Briefcase, HeartPulse, ShoppingBag, Rocket, HandHeart, Store]

export default function Sectors() {
  return (
    <>
      <PageHero
        eyebrow="Who we serve"
        title="The businesses we build for"
        intro="We work across sectors, but the clients who get the most from us share one thing: they care how their site looks and behaves, not just that it exists. Whatever the field, the work is the same — one team, design and build, from sketch to launch."
      />

      {/* Sector cards */}
      <Section>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sectors.map((s, i) => {
            const Icon = sectorIcons[i % sectorIcons.length]
            return (
              <FadeIn key={s.title} delay={i * 0.04}>
                <div className="gk-card flex h-full flex-col p-6">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/10">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-4 text-base font-semibold">{s.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{s.blurb}</p>
                  <ul className="mt-4 space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
                    {s.needs.map((n) => (
                      <li key={n} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            )
          })}
        </div>
      </Section>

      {/* Why one team matters */}
      <Section muted>
        <SectionHeading
          eyebrow="Whatever the sector"
          title="Why one team matters"
          intro="The field changes; the way we work doesn't. The same people design and build, so quality holds all the way through."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {whyOneTeam.map((r, i) => (
            <FadeIn key={r.title} delay={i * 0.05}>
              <div className="gk-card h-full p-6">
                <h3 className="text-base font-semibold">{r.title}</h3>
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
