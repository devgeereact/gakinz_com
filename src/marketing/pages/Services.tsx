import { Link } from "react-router-dom"
import Seo from "@/marketing/components/Seo"
import { Action, CtaBand, Label, PageHero, Section, Split } from "@/marketing/components/primitives"
import FadeIn from "@/marketing/components/FadeIn"
import { services, processStages, alwaysIncluded } from "@/marketing/data/site"

/**
 * /services: the four things, and what each one includes.
 *
 * What this page carried before and no longer does:
 *
 *   - a generated SiteMockup wireframe in every FeatureRow's media slot. The
 *     mockups are retired. There is no photograph of this work to put in their
 *     place, so the spread is composed to need no image: the deliverables list
 *     occupies the second column, which is what a reader wanted from that side
 *     of the page anyway.
 *   - an h1 -> h3 level skip. The four services are the first headings under
 *     the page title, so they are h2, and the process stages beneath the
 *     process h2 are h3.
 *   - two type sizes invented outside the nine-value scale, one of them a
 *     ghost numeral, plus gradient icon chips, rounded cards and drop shadows.
 *   - first person plural. The work is done by one person and now says so.
 */

export default function Services() {
  return (
    <>
      <Seo
        title="What I do"
        description="Web design, development, ecommerce and care, with what each one includes and what happens at every stage of a project."
        path="/services"
      />

      <PageHero
        eyebrow="What I do"
        breadcrumb="Services"
        title="Four things, and what each one actually includes."
        intro="I design the site and then I build it, so nothing is lost explaining one to the other. After launch I stay on, because a live site always needs small changes and somebody has to make them."
      />

      {/* ── The four ─────────────────────────────────────────────────── */}
      <Section>
        <ol className="border-t border-gk-edge">
          {services.map((s, i) => (
            <li key={s.slug} className="border-b border-gk-edge">
              <FadeIn>
                <article className="grid gap-8 py-12 lg:grid-cols-[1fr_22rem] lg:gap-16">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-4">
                      <span className="font-data text-label text-gk-ink-mute">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h2 className="font-display text-t3 text-gk-ink">
                        <Link to={`/services/${s.slug}`} className="hover:underline">
                          {s.title}
                        </Link>
                      </h2>
                    </div>
                    <p className="mt-5 max-w-2xl text-lede text-gk-ink-soft">{s.summary}</p>
                    <p className="mt-4 max-w-2xl text-body text-gk-ink-soft">{s.detail}</p>
                    <div className="mt-8">
                      <Action to={`/services/${s.slug}`}>{s.title} in detail</Action>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <Label>What you get</Label>
                    <ul className="mt-4 border-t border-gk-rule">
                      {s.deliverables.map((d) => (
                        <li
                          key={d}
                          className="border-b border-gk-rule py-3 text-body text-gk-ink-soft"
                        >
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </FadeIn>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── Process ──────────────────────────────────────────────────── */}
      <Section tone="sunk">
        <div className="grid gap-6 pb-10 md:grid-cols-[1fr_24rem] md:items-end">
          <h2 className="font-display text-t2 text-gk-ink">How a project runs</h2>
          <p className="text-body text-gk-ink-soft">
            Five stages. You always know which one you are in, and what has to happen before the
            next one starts.
          </p>
        </div>
        <ol className="grid border-t border-gk-edge lg:grid-cols-5">
          {processStages.map((stage, i) => (
            <li
              key={stage.title}
              className="border-b border-gk-edge py-7 lg:border-b-0 lg:px-6 lg:first:pl-0 lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:border-gk-edge"
            >
              <span className="font-data text-label text-gk-ink-mute">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-display text-t4 text-gk-ink">{stage.title}</h3>
              <p className="mt-2 text-body text-gk-ink-soft">{stage.detail}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── Always included ──────────────────────────────────────────── */}
      <Section>
        <Split
          label="Every project"
          title="What comes with every project"
          intro="Whichever of the four you need, these are in the price rather than quoted as extras afterwards."
        >
          <ul className="grid border-t border-gk-edge sm:grid-cols-2 sm:gap-x-12">
            {alwaysIncluded.map((item) => (
              <li key={item} className="border-b border-gk-edge py-5 text-body text-gk-ink">
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Action to="/pricing">What it costs</Action>
          </div>
        </Split>
      </Section>

      <CtaBand
        title="Not sure which of these you need?"
        intro="Tell me what the site has to do. If it is not something I should take on, I will say so and point you somewhere better."
      />
    </>
  )
}
