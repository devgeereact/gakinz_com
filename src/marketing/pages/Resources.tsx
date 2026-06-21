import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMarketingBlog } from "@/marketing/data/blog"
import FadeIn from "../components/FadeIn"
import SiteMockup from "../components/SiteMockup"
import { PageHero, Section, Split, IndexList, IndexRow, FeatureRow, CtaBand } from "../components/primitives"

function formatDate(iso: string) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

const topics = ["Design", "Development", "Performance", "Accessibility", "SEO", "Process"]

export default function Resources() {
  const { posts } = useMarketingBlog()
  const [featured, ...rest] = posts

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
            <FeatureRow
              index="01"
              eyebrow="Featured"
              title={featured.title}
              media={
                <Link
                  to={`/resources/${featured.slug}`}
                  className="relative block overflow-hidden rounded-2xl border border-[hsl(var(--gk-indigo)/0.1)] shadow-xl shadow-[hsl(var(--gk-violet)/0.12)]"
                >
                  <div className="aspect-[16/10] w-full">
                    <SiteMockup variant={featured.cover} url="gakinz.com/insights" />
                  </div>
                </Link>
              }
              footer={
                <Button asChild variant="outline">
                  <Link to={`/resources/${featured.slug}`}>Read the piece <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              }
            >
              <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">{featured.excerpt}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {formatDate(featured.date)} · {featured.readMins} min read
              </p>
            </FeatureRow>
          </FadeIn>
        </Section>
      )}

      {/* More from the studio — index */}
      <Section muted>
        <Split
          label="Browse"
          title="More from the studio"
          sticky
          aside={
            <div className="flex flex-wrap gap-2">
              {topics.map((t) => (
                <span key={t} className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
          }
        >
          <IndexList>
            {rest.map((post, i) => (
              <IndexRow
                key={post.slug}
                index={i + 2}
                title={post.title}
                to={`/resources/${post.slug}`}
                meta={`${formatDate(post.date)} · ${post.readMins} min read`}
              >
                {post.excerpt}
              </IndexRow>
            ))}
          </IndexList>
        </Split>
      </Section>

      <CtaBand
        title="Rather talk than read?"
        intro="If something here sounds like a project you have in mind, tell us about it. We reply within one working day."
      />
    </>
  )
}
