import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { insights } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import { PageHero, Section } from "../components/primitives"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

export default function Resources() {
  return (
    <>
      <PageHero
        eyebrow="Insights"
        title="Notes on design, build and the web"
        intro="Short, practical pieces on how we work and what makes a website worth having."
      />
      <Section>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {insights.map((post, i) => (
            <FadeIn key={post.slug} delay={i * 0.05}>
              <Link
                to={`/resources/${post.slug}`}
                className="group flex h-full flex-col rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
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
    </>
  )
}
