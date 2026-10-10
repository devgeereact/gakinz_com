import Seo, { personSchema } from "@/marketing/components/Seo"
import {
  CtaBand,
  Label,
  PageHero,
  Placeholder,
  Portrait,
  Section,
  Split,
} from "@/marketing/components/primitives"
import FadeIn from "@/marketing/components/FadeIn"
import { site, services, howIWork } from "@/marketing/data/site"

/**
 * /about: the personal page.
 *
 * What this replaces: 146 lines of literal JSX that never imported site.ts,
 * written in the first person plural about a studio ("we built GAkinz to close
 * a gap"), with a mission, a vision, four pillars, three beliefs and a
 * gradient pull-quote. Nine claims, none of them checkable.
 *
 * Two deliberate absences:
 *
 *   1. The workstation illustration at public/illustrations/graphic-designer-
 *      workplace-1.png is not here. It is a generic drawing of nobody, and on
 *      a page whose honest position two sections down is "there is no
 *      photograph of me yet", a stock stand-in would undercut the gap it sits
 *      beside. The file remains in the repository; it just does not earn a
 *      place on this page.
 *   2. There is no biography. No founding year, no employers, no count of
 *      projects delivered, because none of those are recorded anywhere this
 *      page can point at. The Placeholder says so rather than rounding it up.
 *
 * Every factual statement below comes from src/marketing/data/site.ts.
 */

/**
 * The refusals. Each one restates a commitment already made in site.ts, so the
 * page cannot drift away from the rest of the site:
 * services[1].detail, howIWork.detail, faqs "Who owns the work?".
 */
const DECLINED: { title: string; detail: string }[] = [
  {
    title: "Work outside those four",
    detail:
      "If a job needs something I do not do for a living, I will say so on the first call and point you at someone who does.",
  },
  {
    title: "More at once than I can answer",
    detail:
      "The whole arrangement rests on my being the person who replies, so I keep the number of live projects small rather than taking a large number badly.",
  },
  {
    title: "A page builder or a bought theme",
    detail:
      "Nothing I hand over should be unreadable in six months, to you or to me. If that is the brief, I am the wrong person for it.",
  },
  {
    title: "A site I cannot hand over",
    detail:
      "The code, the domain and the hosting accounts go into your name once the final invoice is paid. Holding the keys is not a service I offer.",
  },
]

export default function About() {
  return (
    <>
      <Seo
        title="About"
        description="I am Gideon Akinlotan, a designer and developer in London. Who you are actually talking to, how I work, and the jobs I turn down."
        path="/about"
        jsonLd={personSchema({
          jobTitle: `${site.role}, ${site.location}`,
          description: site.line,
          sameAs: site.social.map((s) => s.url),
        })}
      />

      <PageHero
        eyebrow="About"
        breadcrumb="About"
        title={`I am ${site.name}, and I do the whole job myself.`}
        intro={`${site.line} ${site.studio.note}`}
      />

      {/* ── Who I am ───────────────────────────────────────────────────── */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16">
          <div className="min-w-0 max-w-2xl">
            <Label>Who I am</Label>
            <h2 className="mt-5 font-display text-t3 text-gk-ink">
              A designer who writes the code, working from {site.location}.
            </h2>
            <p className="mt-6 text-lede text-gk-ink-soft">
              Designing a site and building it are two jobs in most studios. I have never found a
              good reason for that, and the work I am proudest of is the work where it was one.
            </p>
            <div className="mt-6 space-y-5 text-body text-gk-ink-soft">
              <p>
                The usual web project splits in two. Someone draws the screens, signs them off and
                hands a file to someone who sat in none of the meetings, and what gets built is a
                translation. Translations lose things, and the thing they lose first is the reason a
                page was ordered the way it was.
              </p>
              <p>
                I do both halves. The decision I make while drawing a layout carries straight into the
                code, and the parts that would be expensive to build get caught while they are still
                cheap to change. When something looks wrong afterwards, there is nobody to referee
                between: whoever drew it built it.
              </p>
              <p>
                That only works at a certain size. I take a small number of projects at once, and where
                a job genuinely needs more than one person it runs through my studio, {site.studio.name}.
                I say so plainly rather than describing myself as a team that is really one desk.
              </p>
            </div>
          </div>

          <div className="lg:pt-2">
            {site.images.portrait ? (
              <Portrait src={site.images.portrait.src} alt={site.images.portrait.alt} />
            ) : (
              <Placeholder
                shape="circle"
                label="Portrait, to supply"
                detail="A photograph of me. A stock photograph of a stranger on my own about page would be worse than an empty frame."
              />
            )}
          </div>
        </div>
      </Section>

      {/* ── How I got here ─────────────────────────────────────────────── */}
      <Section tone="sunk">
        <div className="grid gap-12 lg:grid-cols-[1fr_22rem] lg:gap-16">
          <div className="min-w-0 max-w-2xl">
            <Label>How I got here</Label>
            <h2 className="mt-5 font-display text-t3 text-gk-ink">
              The honest answer is that this part is not written yet.
            </h2>
            <div className="mt-6 space-y-5 text-body text-gk-ink-soft">
              <p>
                An about page is where a founding year goes, and a list of former employers, and a
                count of projects delivered. I could put all three here in a minute and you would have
                no way of checking any of them.
              </p>
              <p>
                So they are not here. Nothing on this site carries a number without a source behind it,
                and that rule does not get suspended for the page about me. When there is a biography
                worth reading, it goes in this space, and it will be true.
              </p>
              <p>
                What I can tell you today is what I do, how the work runs and what I will not take on.
                That is the rest of this page, and it is the part that would have decided it for me.
              </p>
            </div>
          </div>
          <div className="lg:pt-2">
            <Placeholder
              label="Biography, to supply"
              detail="Where I trained, what I worked on before this, and how long I have been doing it."
              ratio="4 / 3"
            />
          </div>
        </div>
      </Section>

      {/* ── How I work ─────────────────────────────────────────────────── */}
      <Section>
        <FadeIn>
          <Split label="How I work" title={howIWork.claim} intro={howIWork.detail}>
            <dl className="border-t border-gk-edge">
              {howIWork.rows.map((r) => (
                <div
                  key={r.q}
                  className="grid gap-1 border-b border-gk-edge py-4 sm:grid-cols-[14rem_1fr] sm:gap-6"
                >
                  <dt className="font-data text-label uppercase text-gk-ink-mute">{r.q}</dt>
                  <dd className="text-body text-gk-ink">{r.a}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-8 max-w-2xl text-body text-gk-ink-soft">
              {site.contact.replyIntent} There is no ticket queue behind that sentence and no account
              manager in front of it.
            </p>
          </Split>
        </FadeIn>
      </Section>

      {/* ── What I take on, and what I do not ──────────────────────────── */}
      <Section tone="sunk">
        <div className="grid gap-6 pb-10 md:grid-cols-[1fr_24rem] md:items-end">
          <h2 className="font-display text-t2 text-gk-ink">What I take on, and what I do not</h2>
          <p className="text-body text-gk-ink-soft">
            A short list, on purpose. Turning down the wrong job is most of how the right ones get
            finished properly.
          </p>
        </div>

        <div className="grid gap-12 border-t border-gk-edge pt-10 lg:grid-cols-2 lg:gap-16">
          <div className="min-w-0">
            <Label>Work I take</Label>
            <ul className="mt-5">
              {services.map((s) => (
                <li key={s.slug} className="border-b border-gk-rule py-5 first:border-t">
                  <h3 className="font-display text-t4 text-gk-ink">{s.title}</h3>
                  <p className="mt-2 text-body text-gk-ink-soft">{s.summary}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-body text-gk-ink-soft">
              I also take the build half of a design and build pair when an agency brings the drawings.
              Say so in your first message and I can tell you quickly whether it is a fit.
            </p>
          </div>

          <div className="min-w-0">
            <Label>Work I turn down</Label>
            <ul className="mt-5">
              {DECLINED.map((d) => (
                <li key={d.title} className="border-b border-gk-rule py-5 first:border-t">
                  <h3 className="font-display text-t4 text-gk-ink">{d.title}</h3>
                  <p className="mt-2 text-body text-gk-ink-soft">{d.detail}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-body text-gk-ink-soft">
              None of this is a negotiating position. It is the shape of a one-person practice, said out
              loud so nobody finds it out halfway through a build.
            </p>
          </div>
        </div>
      </Section>

      <CtaBand
        title="Tell me about the project."
        intro={`A paragraph is enough to start with. ${site.contact.replyIntent}`}
      />
    </>
  )
}
