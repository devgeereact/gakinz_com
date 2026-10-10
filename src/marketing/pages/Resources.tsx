import { useMemo, useState } from "react"
import Seo from "@/marketing/components/Seo"
import { useMarketingBlog } from "@/marketing/data/blog"
import { CtaBand, IndexList, IndexRow, Label, PageHero, Section } from "../components/primitives"
import { cn } from "@/lib/utils"

/**
 * /resources: the writing index.
 *
 * RECORDED FINDING, now fixed: this page rendered six topic
 * chips (Design, Development, Performance, Accessibility, SEO, Process) as inert
 * <span>s styled to look like filters. They were not buttons, they held no
 * state, and nothing on the page changed when you clicked one. Worse, the six
 * names were a hard-coded list that had no relationship to the posts: not one
 * of them matched the `category` the CMS actually stores.
 *
 * They are now real <button>s driving real state, and the list of topics is
 * derived from the categories present in the posts, so it can never again
 * offer a filter that matches nothing. This is the same pattern /work uses.
 *
 * Also fixed here: the page had no per-route metadata at all, so it shared the
 * site's single static title, and its first heading was an h3 under the h1
 * (WCAG 1.3.1) because the featured FeatureRow defaulted to h3.
 *
 * No cover images. The generated SVG wireframes that stood in for article
 * covers are retired, and the list is designed to read as a contents page, so
 * it needs no picture to look finished.
 */

function formatDate(iso: string) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

export default function Resources() {
  const { posts, loading } = useMarketingBlog()
  const [topic, setTopic] = useState<string>("all")

  // The filter list is whatever the posts actually carry, in first-seen order.
  const topics = useMemo(() => {
    const seen: string[] = []
    for (const p of posts) if (p.category && !seen.includes(p.category)) seen.push(p.category)
    return seen
  }, [posts])

  const shown = topic === "all" ? posts : posts.filter((p) => p.category === topic)

  return (
    <>
      <Seo
        title="Writing"
        description="Short pieces on designing and building websites: what makes one fast, why one person drawing and building beats a handover, and what accessibility costs if you leave it to the end."
        path="/resources"
      />

      <PageHero
        eyebrow="Writing"
        breadcrumb="Writing"
        title="Notes on designing and building the web."
        intro="Pieces about the parts of a build nobody demonstrates. I write one when I have actually learned something, which is why there are not many of them."
      />

      <Section>
        <div className="grid gap-6 pb-10 md:grid-cols-[1fr_24rem] md:items-end">
          <h2 className="font-display text-t2 text-gk-ink">Everything, newest first</h2>
          <p className="text-body text-gk-ink-soft">
            Each piece argues one thing. If you would rather ask me directly, the contact page is at
            the foot of this one.
          </p>
        </div>

        {topics.length > 1 && (
          <div className="pb-10">
            <Label className="mb-4">Filter by topic</Label>
            {/* The visible label above and this group's accessible name are
                the same words on purpose (WCAG 2.5.3). `Label` renders a <p>
                and takes no id, so the name is set here rather than with
                aria-labelledby. */}
            <div role="group" aria-label="Filter by topic" className="flex flex-wrap gap-2">
              {["all", ...topics].map((t) => {
                const active = topic === t
                const count = t === "all" ? posts.length : posts.filter((p) => p.category === t).length
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTopic(t)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex min-h-[2.75rem] items-center gap-2 border px-4 text-body",
                      active
                        ? "border-gk-set bg-gk-set text-gk-paper"
                        : "border-gk-edge text-gk-ink-soft hover:border-gk-ink hover:text-gk-ink",
                    )}
                  >
                    {t === "all" ? "Everything" : t}
                    <span className="font-data text-label">{count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div aria-live="polite" aria-busy={loading}>
          {shown.length > 0 ? (
            <IndexList>
              {shown.map((post, i) => (
                <IndexRow
                  key={post.slug}
                  index={String(i + 1).padStart(2, "0")}
                  title={post.title}
                  to={`/resources/${post.slug}`}
                  meta={
                    post.date ? (
                      <time dateTime={post.date} className="uppercase">
                        {formatDate(post.date)}
                      </time>
                    ) : null
                  }
                >
                  {post.excerpt}
                </IndexRow>
              ))}
            </IndexList>
          ) : (
            <p className="border-y border-gk-edge py-12 text-lede text-gk-ink-soft">
              {loading ? "Loading the writing…" : topic === "all" ? "Nothing published yet." : "Nothing under that topic yet."}
            </p>
          )}
        </div>
      </Section>

      <CtaBand
        title="Rather talk than read?"
        intro="If something here sounds like the project you have in mind, tell me about it. I read every message myself and aim to reply the next working day."
      />
    </>
  )
}
