import { Link, useParams } from "react-router-dom"
import Seo from "@/marketing/components/Seo"
import { Action, CtaBand, Label, PageHero, Section, Split } from "@/marketing/components/primitives"
import FadeIn from "@/marketing/components/FadeIn"
import { services, processStages, alwaysIncluded } from "@/marketing/data/site"
import NotFound from "./NotFound"

/**
 * /services/:slug: one service in full.
 *
 * An unknown slug renders NotFound, as it did before, but now with its own Seo
 * carrying noIndex. Without it the 404 branch inherited whatever metadata the
 * previous route had left in the head, and a client-rendered SPA has no server
 * status code to fall back on, so the only signal a crawler gets that this is
 * not a real page is the robots meta.
 *
 * The retired SiteMockup wireframe that opened this page is not replaced by a
 * Placeholder: the page reads as a document without an image, and a labelled
 * empty frame at the top of every service page would be four honest gaps where
 * none is needed.
 */

export default function ServiceDetail() {
  const { slug } = useParams()
  const service = services.find((s) => s.slug === slug)

  if (!service) {
    return (
      <>
        <Seo
          title="Page not found"
          description="This service page does not exist. The four things I do are listed on the services index."
          path={`/services/${slug ?? ""}`}
          noIndex
        />
        <NotFound />
      </>
    )
  }

  const others = services.filter((s) => s.slug !== service.slug)

  return (
    <>
      <Seo title={service.title} description={service.summary} path={`/services/${service.slug}`} />

      <PageHero
        eyebrow="What I do"
        breadcrumb={service.title}
        title={service.title}
        intro={service.summary}
      />

      <Section>
        <Link
          to="/services"
          className="inline-flex min-h-[2.75rem] items-center font-data text-label uppercase text-gk-ink-mute hover:text-gk-ink"
        >
          All services
        </Link>

        <div className="mt-6 grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
          <FadeIn className="min-w-0">
            <p className="max-w-2xl text-lede text-gk-ink-soft">{service.detail}</p>

            <h2 className="mt-12 font-display text-t3 text-gk-ink">What you get</h2>
            <ul className="mt-6 border-t border-gk-edge">
              {service.deliverables.map((d) => (
                <li key={d} className="border-b border-gk-edge py-4 text-body text-gk-ink">
                  {d}
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Action to="/contact" variant="strong">
                Talk to me about {service.title.toLowerCase()}
              </Action>
            </div>
          </FadeIn>

          <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <nav aria-label="Other services">
              <Label>Other services</Label>
              <ul className="mt-4 border-t border-gk-edge">
                {others.map((o) => (
                  <li key={o.slug} className="border-b border-gk-edge">
                    <Link
                      to={`/services/${o.slug}`}
                      className="flex min-h-[2.75rem] items-center py-3 font-display text-t4 text-gk-ink hover:underline"
                    >
                      {o.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-12">
              <Label>Pricing</Label>
              <p className="mt-4 text-body text-gk-ink-soft">
                The figures on the pricing page are indicative starting points, in GBP and excluding
                VAT. A fixed price follows a short discovery call, so you have the number in writing
                before any work starts.
              </p>
              <div className="mt-6">
                <Action to="/pricing">See what it costs</Action>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Process ──────────────────────────────────────────────────── */}
      <Section tone="sunk">
        <div className="grid gap-6 pb-10 md:grid-cols-[1fr_24rem] md:items-end">
          <h2 className="font-display text-t2 text-gk-ink">How a project runs</h2>
          <p className="text-body text-gk-ink-soft">
            The same five stages whichever service you are buying.
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
          intro="These are in the price rather than quoted as extras afterwards."
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

      <CtaBand
        title={`Ready to talk about ${service.title.toLowerCase()}?`}
        intro="Tell me what you are building and what it has to do. I will come back with a clear next step and, after a short call, a fixed price."
      />
    </>
  )
}
