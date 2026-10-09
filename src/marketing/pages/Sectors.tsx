import Seo from "@/marketing/components/Seo"
import {
  Action,
  CtaBand,
  IndexList,
  IndexRow,
  PageHero,
  Section,
  Split,
} from "@/marketing/components/primitives"
import { sectors, services, processStages, howIWork } from "@/marketing/data/site"

/**
 * /sectors: the kinds of business I build for.
 *
 * What this page carried before and no longer does:
 *
 *   - a four-cell CountUp row reading 6 sectors, 4 core services, 5 process
 *     stages and 1 team. The first three were true and derivable from
 *     site.ts, but a count of the items further down the same page is trivia
 *     dressed as a statistic, and "1 team" is a slogan wearing a number. The
 *     counts that genuinely help a reader are now one sentence, and they are
 *     read from the arrays rather than typed in, so they cannot drift.
 *   - an h1 -> h3 level skip. Each Split supplies the h2 and the sector rows
 *     are h3 beneath it.
 *   - a SiteMockup wireframe in the aside slot, which the Split primitive no
 *     longer has. The page reads as a document without it.
 *   - `whyOneTeam`, which argued the studio's case in the third person. Its
 *     replacement, `howIWork`, is the owner's own words.
 */

export default function Sectors() {
  return (
    <>
      <Seo
        title="Who I build for"
        description="The kinds of business I build websites for, and what each one usually needs from a site."
        path="/sectors"
      />

      <PageHero
        eyebrow="Who I build for"
        breadcrumb="Sectors"
        title="The kinds of business I build for."
        intro="I am not precious about the field. The clients who get the most out of working with me have one thing in common: they care how the site behaves, not only that it exists."
      />

      {/* ── The fields ───────────────────────────────────────────────── */}
      <Section>
        <Split
          label="Who I build for"
          title="The fields I work in"
          intro={`These are the ${sectors.length} fields I am set up for. The way the work runs does not change between them: the same ${services.length} services, and the same ${processStages.length} stages from the first call to launch.`}
        >
          <IndexList>
            {sectors.map((s, i) => (
              <IndexRow
                key={s.title}
                as="h3"
                index={String(i + 1).padStart(2, "0")}
                title={s.title}
              >
                <p>{s.blurb}</p>
                <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
                  {s.needs.map((n) => (
                    <li key={n} className="font-data text-label uppercase text-gk-ink-mute">
                      {n}
                    </li>
                  ))}
                </ul>
              </IndexRow>
            ))}
          </IndexList>
          <div className="mt-8">
            <Action to="/services">What I do</Action>
          </div>
        </Split>
      </Section>

      {/* ── Whatever the field ───────────────────────────────────────── */}
      <Section tone="sunk">
        <Split label="Whatever the field" title={howIWork.claim} intro={howIWork.detail}>
          <dl className="border-t border-gk-edge">
            {howIWork.rows.map((r) => (
              <div
                key={r.q}
                className="grid gap-1 border-b border-gk-edge py-5 sm:grid-cols-[14rem_1fr] sm:gap-6"
              >
                <dt className="font-data text-label uppercase text-gk-ink-mute">{r.q}</dt>
                <dd className="text-body text-gk-ink">{r.a}</dd>
              </div>
            ))}
          </dl>
        </Split>
      </Section>

      <CtaBand
        title="Not sure I am the right fit?"
        intro="Tell me about the project. If it is not something I should take on, I will say so and point you somewhere better."
        cta="Start a conversation"
      />
    </>
  )
}
