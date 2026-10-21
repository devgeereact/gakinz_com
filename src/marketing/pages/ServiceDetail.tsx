import { Link, useParams } from "react-router-dom"
import Seo from "@/marketing/components/Seo"
import { IArrow, PageHead, ProjectCard, Ticks } from "@/marketing/components/site-ui"
import { useSiteCopy } from "@/marketing/data/content"
import { useProjects } from "@/marketing/data/showcase"
import NotFound from "./NotFound"

/** Projects that show each website service in practice. Missing slugs fall back to the first projects. */
const RELATED: Record<string, string[]> = {
  "web-design": ["harni", "priya"],
  "web-development": ["rotaflow", "vitalcare"],
  ecommerce: ["heritage", "mimmycare"],
  "care-and-support": ["ritagreen", "gakinzos"],
}

/**
 * One service (spec 4.2 and 4.3): the buyer hook, typical needs, what the job
 * includes and leaves out, and how it is priced, with links to pricing, work
 * and an enquiry that already names the service. Website services show related
 * projects; the IT services have no published project to point at, so they
 * show none rather than borrow a website's.
 */
export default function ServiceDetail() {
  const { slug } = useParams()
  const copy = useSiteCopy()
  const { projects } = useProjects()
  const s = copy.services.find((x) => x.slug === slug)
  if (!s) return <NotFound />
  const isWeb = s.group === "websites"
  const picked = (RELATED[s.slug] ?? []).map((id) => projects.find((p) => p.slug === id)).filter((p) => p !== undefined)
  const related = isWeb ? (picked.length >= 2 ? picked : projects.slice(0, 2)) : []

  return (
    <>
      <Seo title={s.title} description={s.summary} path={`/services/${s.slug}`} />
      <PageHead crumbs={[["/services", "Services"], [null, s.title]]} title={s.title} lede={s.hook} />
      <section className="sec wrap">
        <div className="two">
          <div>
            <p className="lede" style={{ maxWidth: "56ch", color: "var(--fg)" }}>
              {s.detail}
            </p>
            <div className="hero__actions" style={{ marginTop: 32 }}>
              <Link className="btn btn--main" to={`/contact?service=${encodeURIComponent(s.slug)}`}>
                {isWeb ? "Start a project" : "Ask for a quote"} <IArrow />
              </Link>
              <Link className="btn" to="/pricing">
                See prices
              </Link>
              <Link className="btn" to="/work">
                See my work
              </Link>
            </div>
          </div>
          {s.needs.length > 0 && (
            <div>
              <p className="eyebrow mono">Typical needs</p>
              <Ticks items={s.needs} />
            </div>
          )}
        </div>
      </section>
      <section className="sec wrap">
        <div className="two">
          {s.deliverables.length > 0 && (
            <div>
              <p className="eyebrow mono">What you get</p>
              <Ticks items={s.deliverables} />
            </div>
          )}
          <div>
            {s.exclusions.length > 0 && (
              <>
                <p className="eyebrow mono">Not included</p>
                <ul className="nots">
                  {s.exclusions.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </>
            )}
            {s.price_basis && (
              <div style={{ marginTop: s.exclusions.length > 0 ? 40 : 0 }}>
                <p className="eyebrow mono">Price</p>
                <p className="h-m">{s.price_basis}</p>
                <p style={{ marginTop: 16 }}>
                  <Link className="link" to="/pricing">
                    How pricing works <IArrow />
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
      {related.length > 0 && (
        <section className="sec wrap">
          <div className="sec__head">
            <div>
              <p className="eyebrow mono">In practice</p>
              <h2 className="h-l">Projects where this mattered.</h2>
            </div>
          </div>
          <div className="grid-work">
            {related.map((p) => (
              <ProjectCard key={p.slug} p={p} wide />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
