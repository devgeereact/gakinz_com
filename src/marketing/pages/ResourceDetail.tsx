import { Fragment } from "react"
import { Link, useParams } from "react-router-dom"
import Seo, { SITE_URL } from "@/marketing/components/Seo"
import { Crumbs, CtaBand, IPrev } from "@/marketing/components/site-ui"
import { delay } from "@/marketing/components/site-helpers"
import { useMarketingPost } from "@/marketing/data/blog"
import { useProjects } from "@/marketing/data/showcase"
import { parseArticle, type Inline } from "@/marketing/lib/articleFormat"
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
 * WHAT WAS NOT DONE: no headings were invented. A CMS author who writes
 * "## Why this matters" gets an h2 at the level written, and nothing else.
 *
 * The body is read by src/marketing/lib/articleFormat.ts, a small safe format:
 * paragraphs, ## and ### headings, bullet and numbered lists, **bold**, and
 * links restricted to https, http and mailto. It is rendered here as React
 * elements, never as HTML. A link off the site opens in a new tab, says so
 * to a screen reader, and carries rel="noopener noreferrer"; one written with
 * {sponsored} also carries rel="sponsored". The three static fallback pieces
 * contain no such markers, so they render exactly as before.
 *
 * Structured data: an Article, carrying only fields that are true of the post.
 * No image, no wordCount, no dateModified. The post record holds none of
 * them, and structured data is a machine-readable claim.
 *
 * D-046: the page uses the public design system in src/marketing/site.css.
 * The body sits in `.article` typography, which styles the headings, lists,
 * bold and links that the format produces.
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

/** Inline text, bold and links from the article format, as React elements. */
function InlineNodes({ nodes }: { nodes: Inline[] }) {
  return nodes.map((n, i) => {
    if (n.type === "text") return <Fragment key={i}>{n.text}</Fragment>
    if (n.type === "bold") {
      return (
        <strong key={i}>
          <InlineNodes nodes={n.children} />
        </strong>
      )
    }
    const rel = n.sponsored ? "sponsored noopener noreferrer" : n.external ? "noopener noreferrer" : undefined
    return (
      <a
        key={i}
        href={n.href}
        rel={rel}
        target={n.external ? "_blank" : undefined}
      >
        <InlineNodes nodes={n.children} />
        {n.external && <span className="sr"> (opens in a new tab)</span>}
      </a>
    )
  })
}

export default function ResourceDetail() {
  const { slug } = useParams()
  const { post, loading } = useMarketingPost(slug)
  const { projects } = useProjects()

  if (loading && !post) {
    return (
      <header className="phead wrap" style={{ minHeight: "50vh" }}>
        <p aria-live="polite" className="lede">
          Loading the piece…
        </p>
      </header>
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
        <header className="phead wrap">
          <Crumbs items={[["/resources", "Writing"], [null, post.title]]} />
          <p className="mono mute" style={{ marginBottom: 16 }}>
            {post.category || "Writing"}
            {published && (
              <>
                {" · "}
                Published <time dateTime={post.date}>{published}</time>
              </>
            )}
          </p>
          <h1 className="h-l rise" style={{ maxWidth: "22ch" }}>
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="lede rise" style={delay(80)}>
              {post.excerpt}
            </p>
          )}
        </header>

        <section className="sec wrap" style={{ paddingTop: 56 }}>
          <div className="article">
            {parseArticle(post.bodyParas.join("\n\n")).map((block, i) => {
              if (block.type === "heading" && block.level === 2) {
                return (
                  <h2 key={i}>
                    <InlineNodes nodes={block.children} />
                  </h2>
                )
              }
              if (block.type === "heading") {
                return (
                  <h3 key={i}>
                    <InlineNodes nodes={block.children} />
                  </h3>
                )
              }
              if (block.type === "list") {
                const List = block.ordered ? "ol" : "ul"
                return (
                  <List key={i} start={block.ordered && block.start !== 1 ? block.start : undefined}>
                    {block.items.map((item, j) => (
                      <li key={j}>
                        <InlineNodes nodes={item} />
                      </li>
                    ))}
                  </List>
                )
              }
              return (
                <p key={i}>
                  <InlineNodes nodes={block.children} />
                </p>
              )
            })}
            <p style={{ marginTop: 40 }}>
              <Link className="link" to="/resources">
                <IPrev /> All writing
              </Link>
            </p>
          </div>
        </section>
      </article>

      <section className="sec wrap">
        <CtaBand
          projects={projects}
          title="Working on something similar?"
          intro="Tell me what the site has to do. A paragraph is enough, and if it is not something I should take on I will say so."
        />
      </section>
    </>
  )
}
