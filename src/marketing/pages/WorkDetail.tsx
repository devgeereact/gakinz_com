import type { CSSProperties } from "react"
import { Link, useParams } from "react-router-dom"
import Seo from "@/marketing/components/Seo"
import { Crumbs, CtaBand, Devices, IArrow, Pill } from "@/marketing/components/site-ui"
import { delay, useNavTone } from "@/marketing/components/site-helpers"
import { kindName, onColour, useProjects } from "@/marketing/data/showcase"
import NotFound from "./NotFound"

/** One project's write-up, in the client's own colour (D-046). */
export default function WorkDetail() {
  const { slug } = useParams()
  const { projects, loading } = useProjects()
  const n = projects.findIndex((p) => p.slug === slug)
  const p = n >= 0 ? projects[n] : null
  const on = p ? onColour(p.colour) : null
  useNavTone(on, p?.colour ?? null)

  if (!p) return loading ? null : <NotFound />
  const nx = projects[(n + 1) % projects.length]
  const tone = (c: string) => ({ "--cc": c, "--con": onColour(c) }) as CSSProperties

  return (
    <>
      <Seo title={p.name} description={p.line} path={`/work/${p.slug}`} />
      <section className="case-hero" style={tone(p.colour)}>
        <div className="wrap">
          <Crumbs items={[["/work", "Work"], [null, p.name]]} />
          <div className="case-hero__grid">
            <div>
              <p className="mono" style={{ opacity: 0.85, marginBottom: 14 }}>
                {kindName(p.kind)} · {p.sector}
              </p>
              <h1 className="h-xl rise">{p.name}</h1>
            </div>
            <p className="rise" style={{ ...delay(80), fontSize: "1.15rem", opacity: 0.94 }}>
              {p.line}
            </p>
          </div>
          <div className="case-shot">
            {p.desktop ? (
              <div className="stage" aria-hidden="true">
                <Devices list={[p]} />
              </div>
            ) : (
              <div className="card__type" style={{ ...tone(p.colour), aspectRatio: "21/9", borderRadius: 20 }}>
                {p.name}
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="sec wrap" style={{ paddingTop: 56 }}>
        <div className="case-body">
          <div>
            <section>
              <h2>The job</h2>
              <p className="lede" style={{ maxWidth: "60ch" }}>
                {p.problem || p.line}
              </p>
            </section>
            {p.built.length > 0 && (
              <section>
                <h2>What I built</h2>
                <ul className="ticks">
                  {p.built.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <h2>Where it stands</h2>
              <p className="lede" style={{ maxWidth: "60ch", marginBottom: 16 }}>
                {/* One honest line for every unlaunched project: "in final checks"
                    was printed for all of them, a local app included. */}
                {p.status === "Live"
                  ? `Live${p.url ? ` at ${p.url}` : ""}.`
                  : p.status === "Demo"
                    ? "A demo build, made to show the approach. It is not a client's live site."
                    : "In build, and not launched yet."}
              </p>
              {p.outcome ? (
                <p className="lede" style={{ maxWidth: "60ch" }}>
                  {p.outcome}
                </p>
              ) : (
                <span className="gap">Outcome figures: not measured yet. They go here once there is something real to report.</span>
              )}
            </section>
          </div>
          <dl className="facts">
            <div>
              <dt>Kind</dt>
              <dd>{kindName(p.kind)}</dd>
            </div>
            {p.sector && (
              <div>
                <dt>Sector</dt>
                <dd>{p.sector}</dd>
              </div>
            )}
            <div>
              <dt>Status</dt>
              <dd>
                <Pill status={p.status} />
              </dd>
            </div>
            {p.stack.length > 0 && (
              <div>
                <dt>Built with</dt>
                <dd>{p.stack.join(", ")}</dd>
              </div>
            )}
            {p.url && (
              <div>
                <dt>Address</dt>
                <dd>
                  {p.status === "Live" ? (
                    <a href={`https://${p.url}`} target="_blank" rel="noopener noreferrer">
                      {p.url}
                    </a>
                  ) : (
                    p.url
                  )}
                </dd>
              </div>
            )}
          </dl>
        </div>
        {nx && nx.slug !== p.slug && (
          <Link className="next" to={`/work/${nx.slug}`} style={tone(nx.colour)}>
            <div>
              <p className="mono" style={{ opacity: 0.85, marginBottom: 8 }}>
                Next project
              </p>
              <h3>{nx.name}</h3>
            </div>
            <span className="ctrl">
              <IArrow />
            </span>
          </Link>
        )}
      </section>
      <section className="sec wrap">
        <CtaBand projects={projects} />
      </section>
    </>
  )
}
