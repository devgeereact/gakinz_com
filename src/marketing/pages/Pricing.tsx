import Seo from "@/marketing/components/Seo"
import { Action, CtaBand, Label, PageHero, Section, Split } from "@/marketing/components/primitives"
import FadeIn from "@/marketing/components/FadeIn"
import { packages, addOns, alwaysIncluded, paymentTerms, faqs } from "@/marketing/data/site"

/**
 * /pricing: real money.
 *
 * Every figure on this page is reproduced from src/marketing/data/site.ts
 * exactly as the owner wrote it. Nothing is rounded, reformatted, converted,
 * discounted or compared. The only mark of distinction is `featured: true`,
 * which exists in the data; no other badge is invented.
 *
 * Fixed here:
 *
 *   - plan names were <h2> set at the smallest heading size on a page whose
 *     largest element was a gradient-filled price. The document
 *     hierarchy and the visual hierarchy disagreed. The packages section now
 *     has its own h2 and each package is an h3 at text-t3, larger than the
 *     price beside it.
 *   - the FAQ keeps native <details>/<summary>, as it should: the browser's
 *     own disclosure widget is correct by default and an ARIA accordion built
 *     on divs is not. The summary was a 28px text target with no stated hit
 *     area; it is now at least 56px tall and carries a visible focus outline
 *     of its own rather than relying on the lavender global ring that the
 *     relaunch retired everywhere else.
 *   - the "Popular" star, the gradient price, the rounded card tiles and the
 *     shadow on the featured one are gone.
 */

export default function Pricing() {
  return (
    <>
      <Seo
        title="Pricing"
        description="Indicative starting points for a website build, in GBP and excluding VAT. A fixed price follows a short discovery call."
        path="/pricing"
      />

      <PageHero
        eyebrow="Pricing"
        breadcrumb="Pricing"
        title="What a site costs, before you have to ask."
        intro="These are indicative starting points, in GBP and excluding VAT. They are not quotes. A fixed price follows a short discovery call, and you have that number in writing before any work starts."
      />

      {/* ── Packages ─────────────────────────────────────────────────── */}
      <Section>
        <div className="grid gap-6 pb-4 md:grid-cols-[1fr_24rem] md:items-end">
          <h2 className="font-display text-t2 text-gk-ink">Packages</h2>
          <p className="text-body text-gk-ink-soft">
            Four shapes of project. If yours does not sit neatly in one of them, say so in your
            first message and I will scope it properly instead of forcing a fit.
          </p>
        </div>

        <p className="mt-6 max-w-2xl border-l border-gk-edge pl-5 text-body text-gk-ink">
          Every figure below is a starting point rather than a quote. Prices are in GBP and exclude
          VAT. The fixed price for your own project follows a discovery call.
        </p>

        <ol className="mt-10 border-t border-gk-edge">
          {packages.map((p, i) => (
            <li key={p.name} className="border-b border-gk-edge">
              <FadeIn>
                <div className="grid gap-8 py-10 lg:grid-cols-[3rem_1fr_15rem] lg:gap-10">
                  <span className="font-data text-label text-gk-ink-mute">
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
                      <h3 className="font-display text-t3 text-gk-ink">{p.name}</h3>
                      {p.featured && <Label className="text-gk-set">Recommended</Label>}
                    </div>
                    <p className="mt-3 max-w-2xl text-lede text-gk-ink-soft">{p.best}</p>
                    <ul className="mt-6 grid border-t border-gk-rule sm:grid-cols-2 sm:gap-x-10">
                      {p.features.map((f) => (
                        <li
                          key={f}
                          className="border-b border-gk-rule py-3 text-body text-gk-ink-soft"
                        >
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="lg:text-right">
                    <Label>{p.price === "Quoted" ? "Price" : "Starting point"}</Label>
                    <p className="mt-2 font-data text-t4 text-gk-ink">{p.price}</p>
                    <div className="mt-6">
                      <Action to="/contact" variant={p.featured ? "strong" : "plain"}>
                        {p.price === "Quoted" ? "Ask for a quote" : "Start a project"}
                      </Action>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── Always included ──────────────────────────────────────────── */}
      <Section tone="sunk">
        <Split
          label="Every project"
          title="What comes with every package"
          intro="These are in the price. None of them is an extra that appears on the invoice later."
        >
          <ul className="grid border-t border-gk-edge sm:grid-cols-2 sm:gap-x-12">
            {alwaysIncluded.map((item) => (
              <li key={item} className="border-b border-gk-edge py-5 text-body text-gk-ink">
                {item}
              </li>
            ))}
          </ul>
        </Split>
      </Section>

      {/* ── Add-ons ──────────────────────────────────────────────────── */}
      <Section>
        <Split
          label="Add-ons"
          title="Extras, priced the same plain way"
          intro="Optional. Add them at the start or later, and each one is priced before it is agreed."
        >
          <ul className="border-t border-gk-edge">
            {addOns.map((a) => (
              <li
                key={a.name}
                className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 border-b border-gk-edge py-5"
              >
                <span className="text-body text-gk-ink">{a.name}</span>
                <span className="font-data text-body text-gk-ink">{a.price}</span>
              </li>
            ))}
          </ul>
        </Split>
      </Section>

      {/* ── Payment ──────────────────────────────────────────────────── */}
      <Section tone="sunk">
        <Split
          label="Payment"
          title="Staged payments"
          intro="Payment tracks the work rather than arriving in one lump at the end."
        >
          <ol className="border-t border-gk-edge">
            {paymentTerms.map((t, i) => (
              <li
                key={t.stage}
                className="flex items-baseline justify-between gap-6 border-b border-gk-edge py-5"
              >
                <span className="flex items-baseline gap-4">
                  <span className="font-data text-label text-gk-ink-mute">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-body text-gk-ink">{t.stage}</span>
                </span>
                <span className="font-data text-t4 text-gk-ink">{t.share}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 max-w-2xl text-body text-gk-ink-soft">
            The full terms are set out in the service agreement, which you see before work starts.
          </p>
        </Split>
      </Section>

      {/* ── Questions ────────────────────────────────────────────────── */}
      <Section>
        <Split label="Questions" title="Common questions">
          <div className="border-t border-gk-edge">
            {faqs.map((f) => (
              <details key={f.q} className="group border-b border-gk-edge">
                <summary className="flex min-h-[3.5rem] cursor-pointer list-none items-center justify-between gap-6 py-4 font-display text-t4 text-gk-ink hover:bg-gk-sunk focus-visible:bg-gk-sunk focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gk-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    aria-hidden
                    className="font-data text-label text-gk-ink-mute transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-2xl pb-6 text-body text-gk-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </Split>
      </Section>

      <CtaBand
        title="Not sure which package fits?"
        intro="Tell me what the site has to do and I will say which one it looks like, or that none of them fits and why."
      />
    </>
  )
}
