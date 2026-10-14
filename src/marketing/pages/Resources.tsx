import { Link } from "react-router-dom"
import Seo from "@/marketing/components/Seo"
import { IArrow, PageHead } from "@/marketing/components/site-ui"
import { useMarketingBlog } from "@/marketing/data/blog"

function readableDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

/** Writing (D-046). Posts come from the CMS Blog, with the built-in pieces as fallback. */
export default function Resources() {
  const { posts, loading } = useMarketingBlog()
  return (
    <>
      <Seo title="Writing" description="Short pieces on the parts of a project nobody demonstrates." path="/resources" />
      <PageHead crumbs={[[null, "Writing"]]} title="Notes from the build." lede="Short pieces on the parts of a project nobody demonstrates." />
      <section className="sec wrap" style={{ paddingTop: 48 }}>
        {posts.length > 0 ? (
          <div className="posts">
            {posts.map((p) => (
              <Link key={p.slug} className="post" to={`/resources/${p.slug}`}>
                <span className="mono mute">{readableDate(p.date)}</span>
                <h3>{p.title}</h3>
                <p>{p.excerpt}</p>
                <span className="link">
                  Read <IArrow />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          !loading && <p className="lede">Nothing published yet. The first piece is on its way.</p>
        )}
      </section>
    </>
  )
}
