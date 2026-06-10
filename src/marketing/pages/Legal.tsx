import { company } from "@/marketing/data/site"
import { PageHero, Section } from "../components/primitives"

type Block = { h: string; p: string[] }

function LegalPage({ title, intro, blocks }: { title: string; intro: string; blocks: Block[] }) {
  return (
    <>
      <PageHero eyebrow="Legal" title={title} intro={intro} />
      <Section>
        <div className="max-w-2xl space-y-8">
          <p className="text-sm text-muted-foreground">Last updated 1 June 2026.</p>
          {blocks.map((b) => (
            <div key={b.h}>
              <h2 className="text-lg font-semibold">{b.h}</h2>
              {b.p.map((para, i) => (
                <p key={i} className="mt-2 text-muted-foreground">
                  {para}
                </p>
              ))}
            </div>
          ))}
          <p className="text-muted-foreground">
            Questions about this policy? Email{" "}
            <a className="text-primary hover:underline" href={`mailto:${company.email}`}>
              {company.email}
            </a>
            .
          </p>
        </div>
      </Section>
    </>
  )
}

export function Privacy() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="How GAkinz handles the information you share with us."
      blocks={[
        { h: "What we collect", p: ["When you contact us we collect the details you send: your name, email, company and the message itself. We do not collect more than we need to reply."] },
        { h: "How we use it", p: ["We use your details to respond to your enquiry and, if we work together, to deliver the project. We do not sell your data."] },
        { h: "How long we keep it", p: ["We keep enquiry records for as long as needed to follow up, then remove them. Project records are kept for the life of the engagement and a reasonable period after."] },
        { h: "Your rights", p: ["You can ask us what we hold about you, ask us to correct it, or ask us to delete it. Email us and we will respond."] },
      ]}
    />
  )
}

export function Terms() {
  return (
    <LegalPage
      title="Terms of use"
      intro="The terms that apply to this website."
      blocks={[
        { h: "Using this site", p: ["You are welcome to browse and use this site for lawful purposes. Content here is provided in good faith but without warranty."] },
        { h: "Our work", p: ["Project terms are set out separately in a proposal and agreement. Nothing on this site is itself an offer of contract."] },
        { h: "Intellectual property", p: ["The design, text and brand on this site belong to GAkinz unless stated otherwise."] },
      ]}
    />
  )
}

export function Cookies() {
  return (
    <LegalPage
      title="Cookie policy"
      intro="How this site uses cookies and similar technology."
      blocks={[
        { h: "What we use", p: ["This site uses only the cookies needed to make it work. We do not run advertising trackers."] },
        { h: "Managing cookies", p: ["You can clear or block cookies in your browser settings at any time. The site will still work without them."] },
      ]}
    />
  )
}
