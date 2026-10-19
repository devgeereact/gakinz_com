import { Link } from "react-router-dom"
import Seo from "@/marketing/components/Seo"
import { CtaBand, IArrow, PageHead, Ticks } from "@/marketing/components/site-ui"
import { groupServices, useSiteCopy } from "@/marketing/data/content"
import { useProjects } from "@/marketing/data/showcase"
import { alwaysIncluded } from "@/marketing/data/site"

const pad = (n: number) => String(n).padStart(2, "0")

/**
 * What I do, from the editable copy (D-046): six services in two groups (D-038).
 * Numbers come from the list, not the copy, and start again in each group.
 */
export default function Services() {
  const copy = useSiteCopy()
  const { projects } = useProjects()
  return (
    <>
      <Seo title="Services" description="Websites and everyday IT support for small businesses: design, build, shops, care afterwards, IT help and straight IT advice." path="/services" />
      <PageHead
        crumbs={[[null, "Services"]]}
        title={
          <>
            What I do,
            <br />
            start to finish.
          </>
        }
        lede="Websites, from the design to the care afterwards, and everyday IT support. The same person carries each job from the first call to the last fix."
      />
      {groupServices(copy.services).map((g) => (
        <section key={g.key} className="sec wrap" aria-labelledby={`grp-${g.key}`}>
          <div className="sec__head">
            <div>
              <p className="eyebrow mono">What I do</p>
              <h2 className="h-l" id={`grp-${g.key}`}>
                {g.label}
              </h2>
            </div>
          </div>
          <div className="svc-list">
            {g.items.map((s, i) => (
              <article key={s.slug}>
                <span className="n">{pad(i + 1)}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.hook}</p>
                  <p style={{ marginTop: 12 }}>{s.summary}</p>
                  <p style={{ marginTop: 16 }}>
                    <Link className="link" to={`/services/${s.slug}`}>
                      More on {s.title.toLowerCase()} <IArrow />
                    </Link>
                  </p>
                </div>
                <Ticks items={s.deliverables} />
              </article>
            ))}
          </div>
        </section>
      ))}
      <section className="sec wrap">
        <div className="sec__head">
          <div>
            <p className="eyebrow mono">Process</p>
            <h2 className="h-l">How a project runs, in order.</h2>
          </div>
        </div>
        <ol className="steps" style={{ marginTop: 0 }}>
          {copy.process.map((s) => (
            <li key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.detail}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="sec wrap">
        <div className="two">
          <div>
            <p className="eyebrow mono">Always included</p>
            <h2 className="h-l">With every website, whatever its size.</h2>
          </div>
          <Ticks items={alwaysIncluded} />
        </div>
      </section>
      <section className="sec wrap">
        <CtaBand projects={projects} />
      </section>
    </>
  )
}
