import { Link } from "react-router-dom"
import { ArrowRight, Check, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { packages, addOns, alwaysIncluded, paymentTerms, faqs } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import { PageHero, Section, SectionHeading } from "../components/primitives"

export default function Pricing() {
  return (
    <>
      <PageHero
        eyebrow="Services & pricing"
        title="Clear packages, no surprises"
        intro="Every site is a little different, so these are starting points, not final quotes. After a short discovery call we send a fixed price for your project, so you know the number before any work begins. Prices are in GBP and exclude VAT."
      />

      {/* Packages */}
      <Section>
        <div className="grid gap-5 lg:grid-cols-4 lg:items-stretch">
          {packages.map((p, i) => (
            <FadeIn key={p.name} delay={i * 0.05} className="h-full">
              <div
                className={cn(
                  "flex h-full flex-col rounded-2xl border bg-card p-6",
                  p.featured ? "border-primary shadow-lg ring-1 ring-primary/30" : "border-border",
                )}
              >
                {p.featured && (
                  <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    <Star className="h-3 w-3" /> Most popular
                  </span>
                )}
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{p.best}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  {p.price !== "Quoted" && (
                    <span className="text-sm font-medium text-muted-foreground">from</span>
                  )}
                  <span className="font-serif text-3xl font-bold text-foreground">{p.price}</span>
                </div>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="mt-6 w-full"
                  variant={p.featured ? "default" : "outline"}
                >
                  <Link to="/contact">{p.price === "Quoted" ? "Request a quote" : "Start a project"}</Link>
                </Button>
              </div>
            </FadeIn>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Every package includes design and development by one team, a preview link to review before
          launch, launch testing, and a short post-launch settling-in period.
        </p>
      </Section>

      {/* Always included */}
      <Section muted>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <FadeIn>
            <SectionHeading eyebrow="Every project" title="What's always included" />
          </FadeIn>
          <FadeIn delay={0.1}>
            <ul className="grid gap-4 sm:grid-cols-2">
              {alwaysIncluded.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>
      </Section>

      {/* Add-ons */}
      <Section>
        <SectionHeading
          eyebrow="Add-ons"
          title="Extend a package when you need to"
          intro="Optional extras you can bolt onto any project, priced the same plain way as everything else."
        />
        <div className="mt-10 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">Add-on</th>
                <th className="hidden px-5 py-3 font-semibold sm:table-cell">What it is</th>
                <th className="px-5 py-3 text-right font-semibold">Price</th>
              </tr>
            </thead>
            <tbody>
              {addOns.map((a) => (
                <tr key={a.name} className="border-t border-border">
                  <td className="px-5 py-4 font-medium text-foreground">
                    {a.name}
                    <span className="mt-0.5 block text-xs text-muted-foreground sm:hidden">{a.what}</span>
                  </td>
                  <td className="hidden px-5 py-4 text-muted-foreground sm:table-cell">{a.what}</td>
                  <td className="px-5 py-4 text-right font-medium text-foreground">{a.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Payment terms */}
      <Section muted>
        <div className="grid gap-12 lg:grid-cols-2">
          <FadeIn>
            <SectionHeading
              eyebrow="Payment"
              title="Simple, staged terms"
              intro="No long invoices to decode. Payment is split across the project so it tracks the work."
            />
            <p className="mt-4 text-sm text-muted-foreground">
              Full terms are set out in the service agreement before work starts.
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <ol className="space-y-4">
              {paymentTerms.map((t, i) => (
                <li key={t} className="flex items-start gap-4 rounded-xl border border-border bg-background p-4">
                  <span className="font-serif text-xl font-bold text-primary/40">{i + 1}</span>
                  <span className="text-sm text-foreground">{t}</span>
                </li>
              ))}
            </ol>
          </FadeIn>
        </div>
      </Section>

      {/* FAQs */}
      <Section>
        <SectionHeading eyebrow="Questions" title="Common questions" center />
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-border">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-foreground">
                {f.q}
                <span className="text-primary transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <FadeIn>
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">Not sure which package fits?</h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/85">
              Book a short discovery call. We will point you the right way and send a fixed price — no
              pushy follow-ups.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" variant="secondary">
                <Link to="/contact">
                  Start a project <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  )
}
