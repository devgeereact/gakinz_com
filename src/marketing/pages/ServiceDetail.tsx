import { Link, useParams } from "react-router-dom"
import Seo from "@/marketing/components/Seo"
import { IArrow, PageHead, ProjectCard, Ticks } from "@/marketing/components/site-ui"
import { useSiteCopy } from "@/marketing/data/content"
import { useProjects } from "@/marketing/data/showcase"
import NotFound from "./NotFound"

/** Projects that show each service in practice. Missing slugs fall back to the first projects. */
const RELATED: Record<string, string[]> = {
  "web-design": ["harni", "priya"],
  "web-development": ["rotaflow", "vitalcare"],
  ecommerce: ["heritage", "mimmycare"],
  "care-and-support": ["ritagreen", "gakinzos"],
}

export default function ServiceDetail() {
  const { slug } = useParams()
  const copy = useSiteCopy()
  const { projects } = useProjects()
  const s = copy.services.find((x) => x.slug === slug)
  if (!s) return <NotFound />
  const picked = (RELATED[s.slug] ?? []).map((id) => projects.find((p) => p.slug === id)).filter((p) => p !== undefined)
  const related = picked.length >= 2 ? picked : projects.slice(0, 2)

  return (
    <>
      <Seo title={s.title} description={s.summary} path={`/services/${s.slug}`} />
      <PageHead crumbs={[["/services", "Services"], [null, s.title]]} title={s.title} lede={s.summary} />
      <section className="sec wrap">
        <div className="two">
          <div>
            <p className="lede" style={{ maxWidth: "56ch", color: "var(--fg)" }}>
              {s.detail}
            </p>
            <div className="hero__actions" style={{ marginTop: 32 }}>
              <Link className="btn btn--main" to="/contact">
                Start a project <IArrow />
              </Link>
              <Link className="btn" to="/pricing">
                See prices
              </Link>
            </div>
          </div>
          {s.deliverables.length > 0 && (
            <div>
              <p className="eyebrow mono">What you get</p>
              <Ticks items={s.deliverables} />
            </div>
          )}
        </div>
      </section>
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
    </>
  )
}
