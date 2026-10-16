import { useState } from "react"
import Seo from "@/marketing/components/Seo"
import { CtaBand, PageHead, ProjectCard } from "@/marketing/components/site-ui"
import { useProjects, type Project } from "@/marketing/data/showcase"

type Filter = "all" | "client" | "product" | "Live" | "In build"
const FILTERS: [Filter, string][] = [
  ["all", "All"],
  ["client", "Client sites"],
  ["product", "Own products"],
  ["Live", "Live"],
  ["In build", "In build"],
]
const match = (p: Project, f: Filter) => f === "all" || p.kind === f || p.status === f

/** Every project, filterable. Counts are computed, never written as copy. */
export default function Work() {
  const { projects } = useProjects()
  const [f, setF] = useState<Filter>("all")
  const list = projects.filter((p) => match(p, f))

  return (
    <>
      <Seo title="Work" description="Client sites, and products I build and run, with what was built and where each one stands." path="/work" />
      <PageHead
        crumbs={[[null, "Work"]]}
        title={
          <>
            Every project,
            <br />
            all of them real.
          </>
        }
        lede="Client sites, and products I build and run. Filter by kind, or by where each one stands today."
      />
      <section className="sec wrap" style={{ paddingTop: 40 }}>
        <div className="filters" role="group" aria-label="Filter projects">
          {FILTERS.map(([k, label]) => (
            <button key={k} className="chip" type="button" aria-pressed={f === k} onClick={() => setF(k)}>
              {label}
              <span>{projects.filter((p) => match(p, k)).length}</span>
            </button>
          ))}
        </div>
        <p className="sr" aria-live="polite">
          {list.length} projects shown
        </p>
        <div className="grid-work">
          {list.map((p) => (
            <ProjectCard key={p.slug} p={p} level={2} />
          ))}
        </div>
      </section>
      <section className="sec wrap">
        <CtaBand projects={projects} />
      </section>
    </>
  )
}
