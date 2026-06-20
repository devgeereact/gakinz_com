import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { insights } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import SiteMockup from "../components/SiteMockup"
import { PageHero, Section, SectionHeading, RuleEyebrow, CtaBand } from "../components/primitives"

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
        breadcrumb="Insights"
      />

      {/* Featured */}
      {featured && (
        <Section>
          <FadeIn>
            <Link
              to={`/resources/${featured.slug}`}
              className="gk-card group grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-center"
            >
              <div>
                <RuleEyebrow>Featured</RuleEyebrow>
                <h2 className="mt-4 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
                  {featured.title}
                </h2>
                <p className="mt-3 text-muted-foreground">{featured.excerpt}</p>
                <div className="mt-4 text-xs text-muted-foreground">
                  {formatDate(featured.date)} · {featured.readMins} min read
                </div>
                <span className="mt-5 inline-flex items-center text-sm font-medium text-[hsl(var(--gk-violet))]">
                  Read the piece
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl ring-1 ring-[hsl(var(--gk-violet)/0.12)]">
                <SiteMockup variant="article" />
              </div>
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
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((post, i) => (
            <FadeIn key={post.slug} delay={i * 0.05}>
              <Link
                to={`/resources/${post.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[hsl(var(--gk-indigo)/0.08)] bg-white shadow-[0_1px_2px_hsl(var(--gk-indigo)/0.05),0_10px_30px_-18px_hsl(var(--gk-indigo)/0.18)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_-20px_hsl(var(--gk-violet)/0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="relative h-32 overflow-hidden border-b border-[hsl(var(--gk-indigo)/0.06)]">
                  <SiteMockup variant="article" />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--gk-violet))]">
                    {formatDate(post.date)} · {post.readMins} min read
                  </div>
                  <h2 className="mt-2 font-serif text-lg font-bold leading-snug">{post.title}</h2>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">{post.excerpt}</p>
                  <span className="mt-4 inline-flex items-center border-t border-border pt-4 text-sm font-medium text-foreground">
                    Read <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Rather talk than read?"
        intro="If something here sounds like a project you have in mind, tell us about it. We reply within one working day."
      />
    </>
  )
}
