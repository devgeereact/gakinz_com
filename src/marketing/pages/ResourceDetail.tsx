import { Link, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { insights } from "@/marketing/data/site"
import { PageHero, Section } from "../components/primitives"
import NotFound from "./NotFound"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

export default function ResourceDetail() {
  const { slug } = useParams()
  const post = insights.find((p) => p.slug === slug)
  if (!post) return <NotFound />

  return (
    <>
      <PageHero eyebrow={`${formatDate(post.date)} · ${post.readMins} min read`} title={post.title} />
      <Section>
        <Link to="/resources" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> All insights
        </Link>
        <article className="prose-gakinz mt-6 max-w-2xl space-y-5">
          {post.body.map((para, i) => (
            <p key={i} className="text-lg leading-relaxed text-muted-foreground">
              {para}
            </p>
          ))}
        </article>
        <div className="gk-card mt-12 max-w-2xl p-6">
          <h2 className="font-serif text-xl font-bold">Working on something similar?</h2>
          <p className="mt-2 text-muted-foreground">We would be glad to talk it through.</p>
          <Button asChild className="gk-shine mt-4 shadow-md shadow-primary/20">
            <Link to="/contact">Start a project</Link>
          </Button>
        </div>
      </Section>
    </>
  )
}
