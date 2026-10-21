import { Link } from "react-router-dom"
import Seo from "@/marketing/components/Seo"
import { CtaBand, IArrow, PageHead, Ticks } from "@/marketing/components/site-ui"
import { useProjects } from "@/marketing/data/showcase"
import { howIWork, sectors } from "@/marketing/data/site"

/**
 * /sectors: the kinds of business I build for.
 *
 * What this page carried before and no longer does:
 *
 *   - a four-cell CountUp row reading 6 sectors, 4 core services, 5 process
 *     stages and 1 team. The first three were true and derivable from
 *     site.ts, but a count of the items further down the same page is trivia
 *     dressed as a statistic, and "1 team" is a slogan wearing a number. The
 *     sentence that replaced them no longer states counts either (D-046):
 *     the list below is the count, and copy without numbers cannot drift.
 *   - an h1 -> h3 level skip. Each Split supplies the h2 and the sector rows
 *     are h3 beneath it.
 *   - a SiteMockup wireframe in the aside slot, which the Split primitive no
 *     longer has. The page reads as a document without it.
 *   - the D-037 primitives. The page is built from the classes in
 *     src/marketing/site.css, like the other D-046 pages.
 *   - `whyOneTeam`, which argued the studio's case in the third person. Its
 *     replacement, `howIWork`, is the owner's own words.
 */

export default function Sectors() {
  const { projects } = useProjects()
  return (
    <>
      <Seo
        title="Who I build for"
        description="The kinds of business I build websites for, and what each one usually needs from a site."
        path="/sectors"
      />

      <PageHead
        crumbs={[[null, "Sectors"]]}
        title="The kinds of business I build for."
        lede="I am not precious about the field. The clients who get the most out of working with me have one thing in common: they care how the site behaves, not only that it exists."
      />

      <section className="sec wrap">
        <div className="sec__head">
          <div>
            <p className="eyebrow mono">Who I build for</p>
            <h2 className="h-l">The fields I work in</h2>
          </div>
          <p className="lede">
            These are the fields I am set up for. The way the work runs does not change between them: the same services, and the same
            stages from the first call to launch.
          </p>
        </div>
        <div className="sectors">
          {sectors.map((s) => (
            <div key={s.title} className="sector">
              <h3>{s.title}</h3>
              <p>{s.blurb}</p>
              <Ticks items={s.needs} />
            </div>
          ))}
        </div>
        <p style={{ marginTop: 32 }}>
          <Link className="link" to="/services">
            What I do <IArrow />
          </Link>
        </p>
      </section>

      <section className="sec wrap">
        <div className="how">
          <div>
            <p className="eyebrow mono">Whatever the field</p>
            <h2 className="h-l">{howIWork.claim}</h2>
            <p className="lede" style={{ marginTop: 20 }}>
              {howIWork.detail}
            </p>
          </div>
          <dl className="rows">
            {howIWork.rows.map((r) => (
              <div key={r.q}>
                <dt>{r.q}</dt>
                <dd>{r.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="sec wrap">
        <CtaBand
          projects={projects}
          title="Not sure I am the right fit?"
          intro="Tell me about the project. If it is not something I should take on, I will say so and point you somewhere better."
          cta="Start a conversation"
        />
      </section>
    </>
  )
}
