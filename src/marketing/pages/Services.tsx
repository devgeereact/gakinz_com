import { Link } from "react-router-dom"
import Seo from "@/marketing/components/Seo"
import { CtaBand, IArrow, PageHead, Ticks } from "@/marketing/components/site-ui"
import { useSiteCopy } from "@/marketing/data/content"
import { useProjects } from "@/marketing/data/showcase"
import { alwaysIncluded } from "@/marketing/data/site"

const pad = (n: number) => String(n).padStart(2, "0")

/** What I do, from the editable copy (D-046). Numbers come from the list, not the copy. */
export default function Services() {
  const copy = useSiteCopy()
  const { projects } = useProjects()
  return (
    <>
      <Seo title="Services" description="Design, build, shops and the care afterwards, from one person." path="/services" />
      <PageHead
        crumbs={[[null, "Services"]]}
        title={
          <>
            What I do,
            <br />
            start to finish.
          </>
        }
        lede="Design, build, shops and the care afterwards. The same person carries each job from the first call to the last fix."
      />
      <section className="wrap svc-list">
        {copy.services.map((s, i) => (
          <article key={s.slug}>
            <span className="n">{pad(i + 1)}</span>
            <div>
              <h2>{s.title}</h2>
              <p>{s.detail}</p>
              <p style={{ marginTop: 16 }}>
                <Link className="link" to={`/services/${s.slug}`}>
                  More on {s.title.toLowerCase()} <IArrow />
                </Link>
              </p>
            </div>
            {s.deliverables.length > 0 ? <Ticks items={s.deliverables} /> : <p>{s.summary}</p>}
          </article>
        ))}
      </section>
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
            <h2 className="h-l">Whatever the size of the job.</h2>
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
