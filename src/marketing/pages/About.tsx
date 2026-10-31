import type { CSSProperties } from "react"
import { Link } from "react-router-dom"
import Seo from "@/marketing/components/Seo"
import { BusinessDetails, CtaBand, Crumbs, LondonClock, Ticks } from "@/marketing/components/site-ui"
import { useSiteCopy } from "@/marketing/data/content"
import { delay } from "@/marketing/components/site-helpers"
import { onColour, useProjects } from "@/marketing/data/showcase"
import { howIWork, sectors, site } from "@/marketing/data/site"

/** About (D-046). The portrait seal shows the real photograph once supplied, never a stand-in. */
export default function About() {
  const { projects } = useProjects()
  const portrait = site.images.portrait
  const { business, contact } = useSiteCopy()
  return (
    <>
      <Seo title="About" description="Gideon Akinlotan, a designer and developer in London. You talk to the person doing the work." path="/about" />
      <header className="phead wrap">
        <Crumbs items={[[null, "About"]]} />
        <div className="about-hero">
          <div>
            <h1 className="h-xl rise">
              I draw it,
              <br />
              then I build it.
            </h1>
            <p className="lede rise" style={delay(80)}>
              I am {site.name}, a designer and developer in {site.location}. {site.studio.note} Either way, you talk to me.
            </p>
            <p className="contactline rise" style={delay(120)}>
              <a className="link" href={`mailto:${business.email}`} style={{ overflowWrap: "anywhere" }}>
                {business.email}
              </a>
              <span className="mute">{contact.reply}</span>
            </p>
            <BusinessDetails business={business} />
          </div>
          {portrait ? (
            <div className="seal">
              <span className="seal__ring" aria-hidden="true" />
              <img src={portrait.src} alt={portrait.alt} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            </div>
          ) : (
            /* No photograph yet, so the work stands in rather than a placeholder (K-112 P8). */
            <figure className="desk">
              <div className="desk__top">
                <span className="mono mute">The work</span>
                <span className="mono">
                  London <LondonClock />
                </span>
              </div>
              <div className="desk__grid">
                {projects.slice(0, Math.min(12, Math.floor(projects.length / 4) * 4 || projects.length)).map((p) => (
                  <Link key={p.slug} to={`/work/${p.slug}`} style={{ "--cc": p.colour, "--con": onColour(p.colour) } as CSSProperties}>
                    {p.name}
                  </Link>
                ))}
              </div>
              <figcaption className="desk__foot">Each square opens a write-up.</figcaption>
            </figure>
          )}
        </div>
      </header>
      <section className="sec wrap">
        <div className="how">
          <div>
            <p className="eyebrow mono">How I work</p>
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
        <div className="sec__head">
          <div>
            <p className="eyebrow mono">Who it is for</p>
            <h2 className="h-l">The kinds of business I know well.</h2>
          </div>
          <p className="lede">Each needs something different from a website. These are the needs I design for first.</p>
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
      </section>
      <section className="sec wrap">
        <div className="two">
          <div>
            <p className="eyebrow mono">What I take on</p>
            <h2 className="h-l" style={{ marginBottom: 20 }}>
              Yes, gladly.
            </h2>
            <Ticks items={["Websites that need to bring in enquiries", "Shops with real stock to manage", "Back-office systems that sit behind a site", "Care and changes after launch"]} />
          </div>
          <div>
            <p className="eyebrow mono">What I do not</p>
            <h2 className="h-l" style={{ marginBottom: 20 }}>
              I will point you elsewhere.
            </h2>
            <Ticks items={["Paid advertising and social media management", "Native phone apps for the app stores", "Work I cannot do well within your budget"]} />
          </div>
        </div>
      </section>
      <section className="sec wrap">
        <CtaBand projects={projects} />
      </section>
    </>
  )
}
