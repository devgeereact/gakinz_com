import Seo from "@/marketing/components/Seo"
import { site } from "@/marketing/data/site"
import { PageHead } from "@/marketing/components/site-ui"
import { telHref } from "@/marketing/components/site-helpers"
import { useSiteCopy } from "@/marketing/data/content"
import { STORED_ITEMS } from "@/marketing/data/storage-items"

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
 * The address comes from the published business record (`useSiteCopy().business`),
 * with `site.contact.email` as the built-in fallback.
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
 * Changed (D-046): the layout moved to the public design system in
 * src/marketing/site.css, with the clauses beside a facts card. The missing
 * review date still renders as the site's labelled `.gap` marker.
 *
 * NOT changed: the substance of any clause. Several of them are thin, and one
 * may not be enforceable as written. Those are recorded in the handover report
 * rather than quietly rewritten, because a policy is a legal instrument and
 * its wording is the owner's to settle, not a developer's.
 */

/** `stored` lists STORED_ITEMS after the paragraphs (the cookie policy only). */
type Block = { h: string; p: string[]; stored?: boolean }

const pad = (n: number) => String(n).padStart(2, "0")

/**
 * Owner facts not yet supplied are written in square brackets, e.g.
 * "[legal name to supply]", and render as the site's labelled `.gap` marker
 * (D-027), so a missing fact is visible rather than invented. Replacing the
 * bracketed text with the real value removes the marker.
 */
function Para({ text }: { text: string }) {
  return (
    <p>
      {text.split(/(\[[^\]]+\])/).map((part, i) =>
        /^\[[^\]]+\]$/.test(part) ? (
          <span key={i} className="gap">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </p>
  )
}

/** The cookie policy's list, drawn from STORED_ITEMS so the page and the code cannot disagree. */
function StoredList() {
  return (
    <ul className="stored">
      {STORED_ITEMS.map((i) => (
        <li key={i.name}>
          <strong>
            <code>{i.name}</code>
          </strong>{" "}
          ({i.kind}, set by {i.setBy}). {i.purpose} Lasts: {i.lasts}.
        </li>
      ))}
    </ul>
  )
}

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
  const { business } = useSiteCopy()
  return (
    <>
      <PageHead crumbs={[[null, title]]} title={title} lede={intro} />
      <section className="sec wrap" style={{ paddingTop: 56 }}>
        <div className="case-body">
          <div className="clauses">
            {blocks.map((b, i) => (
              <section key={b.h}>
                <span className="n">{pad(i + 1)}</span>
                <div>
                  <h2>{b.h}</h2>
                  {b.p.map((para, j) => (
                    <Para key={j} text={para} />
                  ))}
                  {b.stored && <StoredList />}
                </div>
              </section>
            ))}
          </div>
          <dl className="facts">
            <div>
              <dt>Last reviewed</dt>
              <dd>
                {reviewed ? (
                  <time dateTime={reviewed}>
                    {new Date(reviewed).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </time>
                ) : (
                  <span className="gap">[review date to supply]</span>
                )}
              </dd>
            </div>
            <div>
              <dt>Questions</dt>
              <dd>
                Email{" "}
                <a className="link" href={`mailto:${business.email}`} style={{ overflowWrap: "anywhere" }}>
                  {business.email}
                </a>
              </dd>
            </div>
            {business.phone && (
              <div>
                <dt>Phone</dt>
                <dd>
                  <a className="link" href={telHref(business.phone)}>
                    {business.phone}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </section>
    </>
  )
}

export function Privacy() {
  const { business } = useSiteCopy()
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
            h: "Who I am",
            p: [
              `gakinz.com is run by [legal name and trading form to supply], who decides how the information described here is used. Contact: ${business.email}.`,
              "[ICO registration number to supply, if registered]",
            ],
          },
          {
            h: "What I collect",
            p: [
              "When you contact me I collect the details you send: your name, email, company, rough budget and the message itself. I do not collect more than I need to reply.",
              "The site also records the internet (IP) address your message came from, with the time it arrived. I use it only to stop spam and repeated automated submissions.",
              "If you become a client, I also keep your contact details, project records, messages and feedback you send through the client area, contracts, invoices and payments. If you sign in, I keep a record of your sessions, including the device and internet address, to keep your account secure.",
            ],
          },
          {
            h: "How I use it",
            p: [
              "I use your details to respond to your enquiry and, if we work together, to deliver the project, bill for it and keep the records the law requires. I do not sell your data and I do not use it for advertising.",
              "The legal basis for each use: [lawful basis for enquiries, client work and tax records to supply]",
            ],
          },
          {
            h: "Who else handles it",
            p: [
              "A small number of services handle information for me so the site and the work can run. Cloudflare carries traffic to the site.",
              "Hosting: [hosting provider and data location to supply]",
              "Email: [email provider to supply]",
              "Only where used: [payment, text message, sign-in and AI drafting services to confirm]",
              "Outside the UK: [international transfers and safeguards to supply]",
            ],
          },
          {
            h: "How long I keep it",
            p: [
              "Enquiries: [period to supply]",
              "Client and project records: [period to supply]",
              "Invoices and payment records: [period required for tax records to supply]",
            ],
          },
          {
            h: "Your rights",
            p: [
              "You can ask what I hold about you and for a copy of it, ask me to correct it or delete it, ask me to restrict or stop using it, and ask for it in a form you can take elsewhere. Email me and I will reply from that address to confirm it is you.",
              "If you are unhappy with how I handle your information, you can complain to the Information Commissioner's Office at ico.org.uk.",
            ],
          },
          {
            h: "Cookies",
            p: [
              "The public pages set no cookies and store nothing in your browser. Signing in to the client area stores a few items, including cookies set by Clerk, the sign-in service; the cookie policy lists each one.",
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
          {
            h: "Law",
            p: ["[Governing law and courts to supply]"],
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
            h: "The public site",
            p: [
              "The public pages (everything outside the client login) set no cookies and store nothing in your browser. There is no analytics, no advertising tracker and no third-party embed.",
            ],
          },
          {
            h: "Signing in",
            p: [
              "The client area at /app and the sign-in page use Clerk, a sign-in service, which runs at clerk.gakinz.com, a subdomain of this site. Clerk's code loads only on the sign-in page and under /app, never on the public pages. You sign in with an email code or with Google.",
              "Once you sign in, your browser holds the items below. Each says whether this site or Clerk sets it. Clerk sets cookies named __session, __client_uat and __client, and can also set copies of the first two with a suffix added to the name.",
            ],
            stored: true,
          },
          {
            h: "Google",
            p: [
              "Signing in with Google is handled by Clerk and Google: choosing it hands the sign-in over to them, and they set their own cookies under their own policies.",
            ],
          },
          {
            h: "Managing cookies",
            p: [
              "You can clear or block cookies and site storage in your browser settings at any time. The public site works without them. Signing in needs them.",
            ],
          },
        ]}
      />
    </>
  )
}
