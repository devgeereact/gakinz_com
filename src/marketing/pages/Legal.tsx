import Seo from "@/marketing/components/Seo"
import { site } from "@/marketing/data/site"
import { Gap, Label, PageHero, Section } from "../components/primitives"

/**
 * /privacy, /terms and /cookies: three routes from one component.
 *
 * WHAT CHANGED, AND WHAT DELIBERATELY DID NOT.
 *
 * Changed: each of the three routes now declares its own title, description
 * and canonical. Before this, all three shared the site's single static title,
 * which made them three distinct URLs advertising identical metadata.
 *
 * Changed: `company.email` no longer exists in src/marketing/data/site.ts.
 * The address comes from `site.contact.email`.
 *
 * Changed: the hard-coded "Last updated 1 June 2026" is gone. It was a date
 * nobody set and nobody reviewed on. A policy carries a review date or it
 * carries none; it does not carry an invented one. Each policy below declares
 * `reviewed`, currently `null`, and the page renders the site's own labelled
 * gap until a real date is supplied. Filling one in is a one-line change.
 *
 * Changed: first person singular throughout, because there is no "we". The old
 * copy spoke for a studio on pages that state who is legally responsible.
 *
 * NOT changed: the substance of any clause. Several of them are thin, and one
 * may not be enforceable as written. Those are recorded in the handover report
 * rather than quietly rewritten, because a policy is a legal instrument and
 * its wording is the owner's to settle, not a developer's.
 */

type Block = { h: string; p: string[] }

function LegalPage({
  title,
  intro,
  reviewed,
  blocks,
}: {
  title: string
  intro: string
  /** ISO date of the last review, or null until the owner has done one. */
  reviewed: string | null
  blocks: Block[]
}) {
  return (
    <>
      <PageHero eyebrow="Legal" title={title} intro={intro} breadcrumb={title} />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[22rem_1fr] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Label>Last reviewed</Label>
            <p className="mt-3 font-data text-body text-gk-ink">
              {reviewed ? (
                <time dateTime={reviewed}>
                  {new Date(reviewed).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </time>
              ) : (
                <Gap>review date to supply</Gap>
              )}
            </p>
            <p className="mt-6 text-body text-gk-ink-soft">
              Questions about this policy? Email{" "}
              <a className="text-gk-set underline hover:text-gk-ink" href={`mailto:${site.contact.email}`}>
                {site.contact.email}
              </a>
              .
            </p>
          </div>

          <div className="min-w-0 border-t border-gk-edge">
            {blocks.map((b, i) => (
              <section key={b.h} className="border-b border-gk-edge py-8">
                <div className="flex items-baseline gap-4">
                  <span className="font-data text-label text-gk-ink-mute">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="font-display text-t4 text-gk-ink">{b.h}</h2>
                </div>
                <div className="mt-4 max-w-2xl pl-8">
                  {b.p.map((para, j) => (
                    <p key={j} className="mt-4 text-body text-gk-ink-soft first:mt-0">
                      {para}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </Section>
    </>
  )
}

export function Privacy() {
  return (
    <>
      <Seo
        title="Privacy policy"
        description="What I collect when you contact me through gakinz.com, what I use it for, how long I keep it, and how to ask for it back or ask me to delete it."
        path="/privacy"
      />
      <LegalPage
        title="Privacy policy"
        intro="What I do with the information you send me."
        reviewed={null}
        blocks={[
          {
            h: "What I collect",
            p: [
              "When you contact me I collect the details you send: your name, email, company and the message itself. I do not collect more than I need to reply.",
            ],
          },
          {
            h: "How I use it",
            p: [
              "I use your details to respond to your enquiry and, if we work together, to deliver the project. I do not sell your data.",
            ],
          },
          {
            h: "How long I keep it",
            p: [
              "I keep enquiry records for as long as needed to follow up, then remove them. Project records are kept for the life of the engagement and a reasonable period after.",
            ],
          },
          {
            h: "Your rights",
            p: [
              "You can ask me what I hold about you, ask me to correct it, or ask me to delete it. Email me and I will respond.",
            ],
          },
        ]}
      />
    </>
  )
}

export function Terms() {
  return (
    <>
      <Seo
        title="Terms of use"
        description="The terms that apply to browsing gakinz.com: what the content is and is not, where project terms actually live, and who owns what is on the site."
        path="/terms"
      />
      <LegalPage
        title="Terms of use"
        intro="The terms that apply to this website."
        reviewed={null}
        blocks={[
          {
            h: "Using this site",
            p: [
              "You are welcome to browse and use this site for lawful purposes. Content here is provided in good faith but without warranty.",
            ],
          },
          {
            h: "My work",
            p: [
              "Project terms are set out separately in a proposal and agreement. Nothing on this site is itself an offer of contract.",
            ],
          },
          {
            h: "Intellectual property",
            p: [`The design, text and brand on this site belong to ${site.name} unless stated otherwise.`],
          },
        ]}
      />
    </>
  )
}

export function Cookies() {
  return (
    <>
      <Seo
        title="Cookie policy"
        description="Which cookies gakinz.com sets, why there are no advertising trackers on it, and how to clear or block cookies in your own browser."
        path="/cookies"
      />
      <LegalPage
        title="Cookie policy"
        intro="How this site uses cookies and similar technology."
        reviewed={null}
        blocks={[
          {
            h: "What I use",
            p: [
              "This site uses only the cookies needed to make it work. I do not run advertising trackers.",
            ],
          },
          {
            h: "Managing cookies",
            p: [
              "You can clear or block cookies in your browser settings at any time. The site will still work without them.",
            ],
          },
        ]}
      />
    </>
  )
}
