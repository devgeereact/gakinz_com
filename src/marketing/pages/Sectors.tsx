import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { sectors } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import { PageHero, Section } from "../components/primitives"

export default function Sectors() {
  return (
    <>
      <PageHero
        eyebrow="Who we serve"
        title="The businesses we build for"
        intro="We work across sectors, but the clients who get the most from us share one thing: they care how their site looks and behaves, not just that it exists."
      />
      <Section>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.map((s, i) => (
            <FadeIn key={s.title} delay={i * 0.04}>
              <div className="h-full rounded-xl border border-border bg-card p-6">
                <h2 className="text-base font-semibold">{s.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{s.blurb}</p>
              </div>
            </FadeIn>
          ))}
        </div>
        <div className="mt-12 rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
          <h2 className="font-serif text-2xl font-bold sm:text-3xl">Not sure if we are a fit?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Tell us about the project. If we are not the right studio for it, we will say so.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/contact">Start a conversation</Link>
          </Button>
        </div>
      </Section>
    </>
  )
}
