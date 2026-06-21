import { Link, useParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMarketingPost } from "@/marketing/data/blog"
import SiteMockup from "../components/SiteMockup"
import { PageHero, Section } from "../components/primitives"
import NotFound from "./NotFound"

function formatDate(iso: string) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

export default function ResourceDetail() {
  const { slug } = useParams()
  const { post, loading } = useMarketingPost(slug)

  if (loading && !post) {
    return (
      <Section>
        <div className="flex items-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      </Section>
    )
  }
  if (!post) return <NotFound />

  const meta = [formatDate(post.date), `${post.readMins} min read`].filter(Boolean).join(" · ")

  return (
    <>
      <PageHero eyebrow={meta || "Insight"} title={post.title} breadcrumb="Insights" />
      <Section>
        <Link to="/resources" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> All insights
        </Link>
        <div className="relative mt-6 max-w-2xl overflow-hidden rounded-2xl border border-[hsl(var(--gk-indigo)/0.08)] shadow-xl shadow-[hsl(var(--gk-violet)/0.12)]">
          <div className="aspect-[16/7] w-full">
            <SiteMockup variant={post.cover} url="gakinz.com/insights" />
          </div>
        </div>
        <article className="mt-8 max-w-2xl space-y-5">
          {post.bodyParas.map((para, i) => (
            <p key={i} className="text-lg leading-relaxed text-muted-foreground">
              {para}
            </p>
          ))}
        </article>
        <div className="mt-12 max-w-2xl border-t border-[hsl(var(--gk-indigo)/0.14)] pt-8">
          <h2 className="font-serif text-2xl font-bold tracking-tight">Working on something similar?</h2>
          <p className="mt-2 text-muted-foreground">We would be glad to talk it through.</p>
          <Button asChild className="gk-shine mt-5 shadow-md shadow-primary/20">
            <Link to="/contact">
              Start a project <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Section>
    </>
  )
}
