import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { work } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import { PageHero, Section } from "../components/primitives"

export default function Work() {
  return (
    <>
      <PageHero
        eyebrow="Our work"
        title="Sites we have designed and built"
        intro="A selection of projects. Each was designed and built by the same team, from first sketch to launch."
      />
      <Section>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {work.map((w, i) => (
            <FadeIn key={w.title} delay={i * 0.05}>
              <article className="flex h-full flex-col rounded-xl border border-border bg-card p-6">
                <div className="mb-4 aspect-[4/3] w-full rounded-lg bg-gradient-to-br from-primary/15 to-primary/5" />
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {w.sector}
                </span>
                <h2 className="mt-2 text-lg font-semibold">{w.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{w.summary}</p>
                <p className="mt-3 text-sm font-medium text-foreground">{w.result}</p>
              </article>
            </FadeIn>
          ))}
        </div>
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">Want to see more, or talk through a project like yours?</p>
          <Button asChild size="lg" className="mt-4">
            <Link to="/contact">Get in touch</Link>
          </Button>
        </div>
      </Section>
    </>
  )
}
