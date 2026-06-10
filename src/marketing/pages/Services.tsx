import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { services } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import { PageHero, Section } from "../components/primitives"

export default function Services() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Design, build, sell, and keep it running"
        intro="Four ways we help businesses online. Each one is run by the same team, from the first sketch through to launch and beyond."
      />
      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          {services.map((s, i) => (
            <FadeIn key={s.slug} delay={i * 0.05}>
              <div className="flex h-full flex-col rounded-xl border border-border bg-card p-7">
                <h2 className="text-xl font-semibold">{s.title}</h2>
                <p className="mt-2 text-muted-foreground">{s.detail}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  {s.deliverables.map((d) => (
                    <li key={d} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      {d}
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/services/${s.slug}`}
                  className="mt-6 inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
                  {s.title} in detail <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>
    </>
  )
}
