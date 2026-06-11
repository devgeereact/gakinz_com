import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { insights } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import { PageHero, Section, SectionHeading } from "../components/primitives"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

const topics = ["Design", "Development", "Performance", "Accessibility", "SEO", "Process"]

export default function Resources() {
  const [featured, ...rest] = insights

  return (
    <>
      <PageHero
        eyebrow="Insights"
        title="Notes on design, build and the web"
        intro="Short, practical pieces on how we work and what makes a website worth having. No hype, no filler — the same plain way we talk to clients across a table."
      />

      {/* Featured */}
      {featured && (
        <Section>
          <FadeIn>
            <Link
              to={`/resources/${featured.slug}`}
              className="group grid gap-8 overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-md sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-center"
            >
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Featured
                </span>
                <h2 className="mt-3 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
                  {featured.title}
                </h2>
                <p className="mt-3 text-muted-foreground">{featured.excerpt}</p>
                <div className="mt-4 text-xs text-muted-foreground">
                  {formatDate(featured.date)} · {featured.readMins} min read
                </div>
                <span className="mt-5 inline-flex items-center text-sm font-medium text-primary">
                  Read the piece
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
              <div className="aspect-[4/3] w-full rounded-xl bg-gradient-to-br from-primary/15 to-primary/5" />
            </Link>
          </FadeIn>
        </Section>
      )}

      {/* Topics + grid */}
      <Section muted>
        <SectionHeading eyebrow="Browse" title="More from the studio" />
        <div className="mt-6 flex flex-wrap gap-2">
          {topics.map((t) => (
            <span
              key={t}
              className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((post, i) => (
            <FadeIn key={post.slug} delay={i * 0.05}>
              <Link
                to={`/resources/${post.slug}`}
                className="group flex h-full flex-col rounded-xl border border-border bg-background p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="text-xs text-muted-foreground">
                  {formatDate(post.date)} · {post.readMins} min read
                </div>
                <h2 className="mt-2 text-lg font-semibold">{post.title}</h2>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{post.excerpt}</p>
                <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                  Read <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section>
        <div className="rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
          <h2 className="font-serif text-2xl font-bold sm:text-3xl">Rather talk than read?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            If something here sounds like a project you have in mind, tell us about it. We reply within
            one working day.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/contact">Start a project</Link>
          </Button>
        </div>
      </Section>
    </>
  )
}
