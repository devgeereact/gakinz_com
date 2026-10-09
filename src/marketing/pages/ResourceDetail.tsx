import { Link, useParams } from "react-router-dom"
import Seo, { SITE_URL } from "@/marketing/components/Seo"
import { useMarketingPost } from "@/marketing/data/blog"
import { Action, Label, Measure, Section } from "../components/primitives"
import NotFound from "./NotFound"

/**
 * /resources/:slug: one article.
 *
 * RECORDED FINDING, now fixed: the article body had no headings at all. The
 * only h2 on the page belonged to the closing call to action, so a screen
 * reader pulling up a headings list got the title and an advert. The body is
 * now a real <article> with its own <header>, a machine-readable <time>, and
 * any heading the author wrote in the body rendered as a heading rather than
 * printed as literal "## " text.
 *
 * WHAT WAS NOT DONE: no headings were invented. src/marketing/data/blog.ts
 * splits a post body on blank lines, so a CMS author who writes "## Why this
 * matters" previously got those two hashes on the page. Those now become an
 * h2 or h3 at the level written. The three static fallback pieces contain no
 * such markers, so they render exactly as before, as prose under the title.
 *
 * Structured data: an Article, carrying only fields that are true of the post.
 * No image, no wordCount, no dateModified. The post record holds none of
 * them, and structured data is a machine-readable claim.
 *
 * The generated SVG wireframe that stood in for a cover image is gone with
 * SiteMockup. An article does not need a picture of a pretend website.
 */

function formatDate(iso: string) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

/** `## Heading` / `### Heading` written by a CMS author, or plain prose. */
function blockOf(para: string): { level: 2 | 3; text: string } | null {
  const m = /^(#{2,3})\s+(.+)$/.exec(para)
  if (!m) return null
  return { level: m[1].length === 2 ? 2 : 3, text: m[2].trim() }
}

export default function ResourceDetail() {
  const { slug } = useParams()
  const { post, loading } = useMarketingPost(slug)

  if (loading && !post) {
    return (
      <Measure className="py-24">
        <p aria-live="polite" className="text-lede text-gk-ink-soft">
          Loading the piece…
        </p>
      </Measure>
    )
  }

  if (!post) return <NotFound />

  const published = formatDate(post.date)
  const url = `${SITE_URL}/resources/${post.slug}`

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    ...(post.date ? { datePublished: post.date } : {}),
    ...(post.excerpt ? { description: post.excerpt } : {}),
    author: { "@id": `${SITE_URL}/#person` },
  }

  return (
    <>
      <Seo
        title={post.title}
        description={post.excerpt || `${post.title}. A piece on designing and building websites.`}
        path={`/resources/${post.slug}`}
        type="article"
        jsonLd={jsonLd}
      />

      <article>
        <header className="border-b border-gk-edge">
          <Measure className="pb-12 pt-12 sm:pb-16 sm:pt-20">
            <nav aria-label="Breadcrumb" className="mb-8">
              <ol className="flex items-center gap-2 font-data text-label uppercase text-gk-ink-mute">
                <li>
                  <Link to="/" className="hover:text-gk-ink">
                    Home
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link to="/resources" className="hover:text-gk-ink">
                    Writing
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li aria-current="page" className="text-gk-ink">
                  {post.title}
                </li>
              </ol>
            </nav>

            <Label>{post.category || "Writing"}</Label>
            <h1 className="mt-5 max-w-4xl font-display text-t2 font-normal text-gk-ink lg:text-t1">
              {post.title}
            </h1>
            {post.excerpt && <p className="mt-6 max-w-2xl text-lede text-gk-ink-soft">{post.excerpt}</p>}
            {published && (
              <p className="mt-8 border-t border-gk-rule pt-4 font-data text-label uppercase text-gk-ink-mute">
                Published <time dateTime={post.date}>{published}</time>
              </p>
            )}
          </Measure>
        </header>

        <Section>
          <div className="max-w-2xl">
            {post.bodyParas.map((para, i) => {
              const block = blockOf(para)
              if (block?.level === 2) {
                return (
                  <h2 key={i} className="mt-12 font-display text-t3 text-gk-ink first:mt-0">
                    {block.text}
                  </h2>
                )
              }
              if (block?.level === 3) {
                return (
                  <h3 key={i} className="mt-10 font-display text-t4 text-gk-ink first:mt-0">
                    {block.text}
                  </h3>
                )
              }
              return (
                <p key={i} className="mt-6 text-lede text-gk-ink first:mt-0">
                  {para}
                </p>
              )
            })}
          </div>
        </Section>
      </article>

      <Section tone="sunk">
        <div className="grid max-w-4xl gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <h2 className="font-display text-t3 text-gk-ink">Working on something similar?</h2>
            <p className="mt-4 max-w-xl text-body text-gk-ink-soft">
              Tell me what the site has to do. A paragraph is enough, and if it is not something I
              should take on I will say so.
            </p>
          </div>
          <Action to="/contact" variant="strong">
            Start a project
          </Action>
        </div>
        <p className="mt-10 border-t border-gk-edge pt-6">
          <Link to="/resources" className="text-body text-gk-ink-soft hover:text-gk-ink hover:underline">
            All writing
          </Link>
        </p>
      </Section>
    </>
  )
}
