import { Link } from "react-router-dom"
import { Check, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { packages, addOns, alwaysIncluded, paymentTerms, faqs } from "@/marketing/data/site"
import FadeIn from "../components/FadeIn"
import { PageHero, Section, Split, RuleEyebrow, GradientText, CtaBand } from "../components/primitives"

export default function Pricing() {
  return (
    <>
      <PageHero
        eyebrow="Services & pricing"
        title="Clear packages, no surprises"
        intro="Every site is a little different, so these are starting points, not final quotes. After a short discovery call we send a fixed price for your project, so you know the number before any work begins. Prices are in GBP and exclude VAT."
        breadcrumb="Pricing"
      />

      {/* Packages — flat editorial tiles */}
      <Section>
        <div className="grid gap-5 lg:grid-cols-4 lg:items-stretch">
          {packages.map((p, i) => (
            <FadeIn key={p.name} delay={i * 0.05} className="h-full">
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-2xl border bg-background p-6",
                  p.featured
                    ? "border-[hsl(var(--gk-violet)/0.5)] shadow-xl shadow-[hsl(var(--gk-violet)/0.15)]"
                    : "border-[hsl(var(--gk-indigo)/0.12)]",
                )}
              >
                {p.featured && (
                  <span className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-[hsl(var(--gk-violet))] to-[hsl(var(--gk-sky))]" aria-hidden />
                )}
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-lg font-bold">{p.name}</h2>
                  {p.featured && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--gk-violet))]">
                      <Star className="h-3 w-3 fill-current" /> Popular
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{p.best}</p>
                <div className="mt-5 flex items-baseline gap-1 border-b border-[hsl(var(--gk-indigo)/0.12)] pb-5">
                  {p.price !== "Quoted" && <span className="text-sm font-medium text-muted-foreground">from</span>}
                  <span className="font-serif text-4xl font-extrabold">
                    <GradientText>{p.price}</GradientText>
                  </span>
                </div>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[hsl(var(--gk-violet))]" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={cn("mt-6 w-full", p.featured && "gk-shine shadow-md shadow-primary/20")}
                  variant={p.featured ? "default" : "outline"}
                >
                  <Link to="/contact">{p.price === "Quoted" ? "Request a quote" : "Start a project"}</Link>
                </Button>
              </div>
            </FadeIn>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Every package includes design and development by one team, a preview link to review before
          launch, launch testing, and a short post-launch settling-in period.
        </p>
      </Section>

      {/* Always included */}
      <Section muted>
        <Split label="Every project" title="What's always included" sticky>
          <ul className="grid border-t border-[hsl(var(--gk-indigo)/0.14)] sm:grid-cols-2 sm:gap-x-12">
            {alwaysIncluded.map((item) => (
              <li key={item} className="flex items-start gap-3 border-b border-[hsl(var(--gk-indigo)/0.14)] py-5">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[hsl(var(--gk-violet))]" />
                <span className="text-sm text-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </Split>
      </Section>

      {/* Add-ons */}
      <Section>
        <Split
          label="Add-ons"
          title="Extend a package when you need to"
          intro="Optional extras you can bolt onto any project, priced the same plain way as everything else."
          sticky
        >
          <div className="border-t border-[hsl(var(--gk-indigo)/0.14)]">
            {addOns.map((a) => (
              <div key={a.name} className="flex items-baseline justify-between gap-6 border-b border-[hsl(var(--gk-indigo)/0.14)] py-5">
                <div>
                  <div className="font-serif text-base font-bold">{a.name}</div>
                  <div className="mt-0.5 text-sm text-muted-foreground">{a.what}</div>
                </div>
                <div className="flex-shrink-0 font-serif text-base font-bold text-[hsl(var(--gk-violet))]">{a.price}</div>
              </div>
            ))}
          </div>
        </Split>
      </Section>

      {/* Payment terms */}
      <Section muted>
        <Split
          label="Payment"
          title="Simple, staged terms"
          intro="No long invoices to decode. Payment is split across the project so it tracks the work."
          sticky
          aside={<p className="text-sm text-muted-foreground">Full terms are set out in the service agreement before work starts.</p>}
        >
          <ol className="border-t border-[hsl(var(--gk-indigo)/0.14)]">
            {paymentTerms.map((t, i) => (
              <li key={t} className="flex items-start gap-5 border-b border-[hsl(var(--gk-indigo)/0.14)] py-5">
                <span className="font-serif text-2xl font-extrabold tabular-nums text-[hsl(var(--gk-violet))]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="pt-1 text-sm text-foreground">{t}</span>
              </li>
            ))}
          </ol>
        </Split>
      </Section>

      {/* FAQs */}
      <Section>
        <Split label="Questions" title="Common questions" sticky>
          <div className="border-t border-[hsl(var(--gk-indigo)/0.14)]">
            {faqs.map((f) => (
              <details key={f.q} className="group border-b border-[hsl(var(--gk-indigo)/0.14)] py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-lg font-bold text-foreground">
                  {f.q}
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[hsl(var(--gk-violet)/0.3)] text-lg text-[hsl(var(--gk-violet))] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </Split>
      </Section>

      <CtaBand
        title="Not sure which package fits?"
        intro="Book a short discovery call. We will point you the right way and send a fixed price — no pushy follow-ups."
      />
    </>
  )
}
