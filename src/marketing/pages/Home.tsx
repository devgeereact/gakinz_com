import { Link } from "react-router-dom"
import Seo, { personSchema, websiteSchema } from "@/marketing/components/Seo"
import { Action, Label, Measure, Placeholder, Section } from "@/marketing/components/primitives"
import Ledger from "@/marketing/components/Ledger"
import Testimonials from "@/marketing/components/Testimonials"
import FadeIn from "@/marketing/components/FadeIn"
import { site, services, howIWork } from "@/marketing/data/site"
import { useWork } from "@/marketing/data/work"
import { useMarketingBlog } from "@/marketing/data/blog"

/**
 * The home page.
 *
 * Direction C: the page is a document. The first screen carries the person,
 * one claim with a point of view, and a numbered contents list in place of a
 * navigation bar.
 *
 * Gone from this page, and not coming back without evidence: the aurora hero,
 * the animated gradient headline, the marquee, the ghost numerals, the bento
 * grid, and the CountUp statistic reading "100% Accessible, WCAG 2.1 AA" —
 * a figure the project's own docs/DECISIONS.md D-020 records as withdrawn.
 */

/** "2026-05-12" becomes "12 May 2026". An ISO date on a public page is a date
 *  written for a machine. Returns the input unchanged if it will not parse. */
function readableDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

const CONTENTS = [
  { href: "#work", title: "Selected work", note: "Three records" },
  { href: "#services", title: "What I do", note: "Four things" },
  { href: "#how", title: "How I work", note: "One idea" },
  { href: "#writing", title: "Writing" },
  { href: "#contact", title: "Contact" },
]

export default function Home() {
  const { records } = useWork()
  const { posts } = useMarketingBlog()
  const recent = posts.slice(0, 3)

  return (
    <>
      <Seo
        description={site.line}
        path="/"
        jsonLd={[
          personSchema({
            jobTitle: `${site.role}, ${site.location}`,
            description: site.line,
            sameAs: site.social.map((s) => s.url),
          }),
          websiteSchema(),
        ]}
      />

      {/* ── Masthead ─────────────────────────────────────────────────── */}
      <div className="border-b border-gk-edge">
        <Measure className="pb-14 pt-14 sm:pb-20 sm:pt-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16">
            <div className="min-w-0">
              <Label>
                {site.role} · {site.location}
              </Label>
              <h1 className="mt-6 max-w-[16ch] font-display text-t2 font-normal text-gk-ink sm:text-t1 lg:text-display">
                A website is part of how a business runs, not a brochure it keeps.
              </h1>
              <p className="mt-8 max-w-2xl text-lede text-gk-ink-soft">
                I am {site.name}. I draw the thing and then I build it, so nothing is lost explaining
                one to the other, and I stay on afterwards so it keeps working. {site.studio.note}
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Action to="/contact" variant="strong">
                  Start a project
                </Action>
                <Action href="#work">See selected work</Action>
              </div>
            </div>

            <div className="lg:pt-2">
              {site.images.portrait ? (
                <img
                  src={site.images.portrait.src}
                  alt={site.images.portrait.alt}
                  className="w-full"
                  width={800}
                  height={1000}
                />
              ) : (
                <Placeholder
                  label="Portrait, to supply"
                  detail="A photograph of Gideon. No stock photograph of a stranger stands in for the person whose site this is."
                />
              )}
            </div>
          </div>
        </Measure>
      </div>

      {/* ── Contents ─────────────────────────────────────────────────── */}
      <Section className="!py-12">
        <nav aria-label="Contents">
          <ol className="border-t border-gk-edge">
            {CONTENTS.map((item, i) => (
              <li key={item.href} className="border-b border-gk-edge">
                <a
                  href={item.href}
                  className="group grid min-h-[3.5rem] grid-cols-[2.5rem_1fr] items-center gap-4 py-3 hover:bg-gk-sunk sm:grid-cols-[3.5rem_1fr_auto] sm:gap-6"
                >
                  <span className="font-data text-label text-gk-ink-mute">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-t4 text-gk-ink group-hover:underline">
                    {item.title}
                  </span>
                  {item.note && (
                    <span className="hidden font-data text-label uppercase text-gk-ink-mute sm:block">
                      {item.note}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </Section>

      {/* ── Selected work ────────────────────────────────────────────── */}
      <Section id="work">
        <div className="grid gap-6 pb-10 md:grid-cols-[1fr_24rem] md:items-end">
          <h2 className="font-display text-t2 text-gk-ink">Selected work</h2>
          <p className="text-body text-gk-ink-soft">
            Records of four kinds: client work, things I built and own, experiments, and writing.
            Where a field is not mine to state yet, it says so rather than guessing.
          </p>
        </div>
        <Ledger records={records.slice(0, 3)} headingLevel="h3" />
        <div className="mt-10">
          <Action to="/work">All work</Action>
        </div>
      </Section>

      {/* ── What I do ────────────────────────────────────────────────── */}
      <Section id="services" tone="sunk">
        <div className="grid gap-6 pb-10 md:grid-cols-[1fr_24rem] md:items-end">
          <h2 className="font-display text-t2 text-gk-ink">What I do</h2>
          <p className="text-body text-gk-ink-soft">
            Four things. Not six, and not a grid padded out to look busier. If a job needs something
            outside this list I will say so and point you at someone who does it for a living.
          </p>
        </div>
        <ol className="grid gap-x-10 gap-y-10 border-t border-gk-edge pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s, i) => (
            <li key={s.slug}>
              <span className="font-data text-label text-gk-ink-mute">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-display text-t4 text-gk-ink">
                <Link to={`/services/${s.slug}`} className="hover:underline">
                  {s.title}
                </Link>
              </h3>
              <p className="mt-3 text-body text-gk-ink-soft">{s.summary}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── How I work ───────────────────────────────────────────────── */}
      <Section id="how">
        <FadeIn>
          <div className="grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-16">
            <div className="max-w-2xl">
              <Label>How I work</Label>
              <h2 className="mt-5 font-display text-t2 text-gk-ink">{howIWork.claim}</h2>
              <p className="mt-6 text-lede text-gk-ink-soft">{howIWork.detail}</p>
            </div>
            <dl className="self-end font-data text-label">
              {howIWork.rows.map((r) => (
                <div
                  key={r.q}
                  className="flex items-baseline justify-between gap-6 border-b border-gk-rule py-3"
                >
                  <dt className="uppercase text-gk-ink-mute">{r.q}</dt>
                  <dd className="text-right text-gk-ink">{r.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </FadeIn>
      </Section>

      {/* Testimonials render only when the CMS holds approved ones. The
          component returns null when empty, which is the correct behaviour:
          an empty quote band is better than an invented quote. */}
      <Testimonials />

      {/* ── Writing ──────────────────────────────────────────────────── */}
      {recent.length > 0 && (
        <Section id="writing" tone="sunk">
          <div className="grid gap-6 pb-10 md:grid-cols-[1fr_24rem] md:items-end">
            <h2 className="font-display text-t2 text-gk-ink">Writing</h2>
            <p className="text-body text-gk-ink-soft">Mostly about the parts of a build nobody demonstrates.</p>
          </div>
          <ul className="border-t border-gk-edge">
            {recent.map((p) => (
              <li key={p.slug} className="border-b border-gk-edge">
                <Link to={`/resources/${p.slug}`} className="block py-6 hover:bg-gk-paper">
                  <div className="grid gap-2 sm:grid-cols-[1fr_8rem] sm:gap-8">
                    <div className="min-w-0">
                      <h3 className="font-display text-t4 text-gk-ink">{p.title}</h3>
                      <p className="mt-2 max-w-2xl text-body text-gk-ink-soft">{p.excerpt}</p>
                    </div>
                    <time
                      dateTime={p.date}
                      className="font-data text-label uppercase text-gk-ink-mute sm:text-right"
                    >
                      {readableDate(p.date)}
                    </time>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Contact ──────────────────────────────────────────────────── */}
      <section id="contact" className="bg-gk-ink text-gk-on-dark">
        <Measure className="py-16 sm:py-24">
          <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
            <div className="max-w-2xl">
              <h2 className="font-display text-t2 text-gk-on-dark">Tell me what the site has to do.</h2>
              <p className="mt-5 text-lede text-gk-on-dark-soft">
                A paragraph is enough. If it is not something I should take on, I will say so and point
                you somewhere better. {site.contact.replyIntent}
              </p>
            </div>
            <Action to="/contact" variant="strong" onDark>
              Start a project
            </Action>
          </div>
        </Measure>
      </section>
    </>
  )
}
