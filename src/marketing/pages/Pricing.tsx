import { Link } from "react-router-dom"
import Seo from "@/marketing/components/Seo"
import { CtaBand, IArrow, PageHead, Ticks, type RailFact } from "@/marketing/components/site-ui"
import { useSiteCopy } from "@/marketing/data/content"
import { useProjects } from "@/marketing/data/showcase"

/** The lowest "£n,nnn" package price, as printed; null when no package has a number. */
const lowest = (packages: { price: string }[]): string | null => {
  const priced = packages.map((p) => ({ p: p.price, n: Number(p.price.replace(/[^0-9.]/g, "")) })).filter((x) => /£\s?\d/.test(x.p) && x.n > 0)
  return priced.length ? priced.sort((a, b) => a.n - b.n)[0].p : null
}

/** Packages, add-ons, payment stages and FAQs, all editable in the CMS (D-046). */
export default function Pricing() {
  const copy = useSiteCopy()
  const { projects } = useProjects()
  return (
    <>
      <Seo title="Pricing" description="Fixed prices, written down before any work starts." path="/pricing" />
      <PageHead
        crumbs={[[null, "Pricing"]]}
        title={
          <>
            Fixed prices,
            <br />
            written down first.
          </>
        }
        lede="You get a written scope and one number before any work starts. These are starting points; the scope sets the final figure."
        rail={[
          ...(lowest(copy.packages) ? [["Starting from", lowest(copy.packages)] as RailFact] : []),
          ...(copy.terms.length ? [["Paid in stages", copy.terms.map((t) => t.share.replace(/%$/, "")).join(" · "), "%"] as RailFact] : []),
          ["Currency", "GBP"],
        ]}
      />
      <section className="sec wrap" style={{ paddingTop: 48 }}>
        <div className="plans">
          {copy.packages.map((p) => (
            <article key={p.name} className={`plan ${p.featured ? "plan--feat" : ""}`}>
              <div>
                <p className={`mono ${p.featured ? "" : "mute"}`}>{p.featured ? "Most asked for" : "Package"}</p>
                <h2 className="h-m" style={{ marginTop: 10 }}>
                  {p.name}
                </h2>
                <p className="mute" style={{ marginTop: 6 }}>
                  {p.best}
                </p>
              </div>
              <p className="plan__price">
                <span className="mono mute" style={{ fontSize: 11, display: "block", marginBottom: 6, letterSpacing: ".06em" }}>
                  {/^quoted$/i.test(p.price) ? "Price" : "From"}
                </span>
                {p.price}
              </p>
              {p.features.length > 0 ? <Ticks items={p.features} /> : <div style={{ flex: 1 }} />}
              <Link className="btn" to={`/contact?package=${encodeURIComponent(p.name)}`}>
                Talk about {p.name.toLowerCase()} <IArrow />
              </Link>
            </article>
          ))}
        </div>
        {/* VAT status is not confirmed (docs/STATUS.md section 5), so the basis is a labelled gap (D-027). */}
        <p className="mute" style={{ marginTop: 20 }}>
          Prices in pounds sterling. <span className="gap">[VAT basis to supply: included, excluded, or not VAT registered]</span>
        </p>
      </section>
      <section className="sec wrap">
        <div className="two">
          <div>
            <p className="eyebrow mono">Add-ons</p>
            <h2 className="h-l" style={{ marginBottom: 24 }}>
              Extras, priced plainly.
            </h2>
            <table className="table">
              <tbody>
                {copy.addons.map((a) => (
                  <tr key={a.name}>
                    <td>{a.name}</td>
                    <td>{a.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <p className="eyebrow mono">Payment</p>
            <h2 className="h-l" style={{ marginBottom: 24 }}>
              Paid in stages.
            </h2>
            <table className="table">
              <tbody>
                {copy.terms.map((t) => (
                  <tr key={t.stage}>
                    <td>{t.stage}</td>
                    <td>{t.share}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <section className="sec wrap">
        <div className="two">
          <div>
            <p className="eyebrow mono">Questions</p>
            <h2 className="h-l">What people ask before they start.</h2>
          </div>
          <div>
            {copy.faqs.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className="sec wrap">
        <CtaBand projects={projects} />
      </section>
    </>
  )
}
