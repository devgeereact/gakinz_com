import { useState } from "react"
import Seo from "@/marketing/components/Seo"
import { CtaBand, PageHead, WorkGrid, type RailFact } from "@/marketing/components/site-ui"
import { useProjects, type Project } from "@/marketing/data/showcase"

type Filter = "all" | "client" | "product" | "Live" | "In build" | "Demo"
const FILTERS: [Filter, string][] = [
  ["all", "All"],
  ["client", "Client sites"],
  ["product", "Own products"],
  ["Live", "Live"],
  ["In build", "In build"],
  ["Demo", "Demos"],
]
// A demo is never counted as a client site, so "Client sites" lists only real clients.
const match = (p: Project, f: Filter) =>
  f === "all" || p.status === f || (p.kind === f && !(f === "client" && p.status === "Demo"))

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
            each one labelled.
          </>
        }
        lede="Client sites, products I build and run, and a few demo builds, each marked as one. Filter by kind, or by where each one stands today."
        rail={[
          ["Live today", projects.filter((p) => match(p, "Live")).length],
          ["Client sites", projects.filter((p) => match(p, "client")).length],
          ["Own products", projects.filter((p) => match(p, "product")).length],
          ["Demo builds", projects.filter((p) => match(p, "Demo")).length, "marked"],
        ].filter(([, n]) => Number(n) > 0) as RailFact[]}
      />
      <section className="sec wrap" style={{ paddingTop: 40 }}>
        <div className="filters" role="group" aria-label="Filter projects">
          {/* A filter with nothing in it is left out rather than shown at zero. */}
          {FILTERS.filter(([k]) => k === "all" || projects.some((p) => match(p, k))).map(([k, label]) => (
            <button key={k} className="chip" type="button" aria-pressed={f === k} onClick={() => setF(k)}>
              {label}
              <span>{projects.filter((p) => match(p, k)).length}</span>
            </button>
          ))}
        </div>
        <p className="sr" aria-live="polite">
          {list.length} projects shown
        </p>
        <WorkGrid list={list} level={2} />
      </section>
      <section className="sec wrap">
        <CtaBand projects={projects} />
      </section>
    </>
  )
}
