import Seo from "@/marketing/components/Seo"
import { PageHero, Section, Label } from "@/marketing/components/primitives"
import Ledger from "@/marketing/components/Ledger"
import { KIND_LABELS, useWork, type WorkKind } from "@/marketing/data/work"
import { useState } from "react"
import { cn } from "@/lib/utils"

/**
 * /work — the full ledger.
 *
 * What the old page carried and no longer does: a four-cell statistics row
 * whose contents were "One team", "WCAG 2.1 AA", "Real devices" and "Fixed
 * price". Four slogans in a grid built for numbers. It is gone rather than
 * restyled.
 *
 * The filters are real <button> elements that filter real state. The old
 * /resources page rendered topic chips as inert <span>s styled to look like
 * filters, which is worse than having none.
 */

const ORDER: WorkKind[] = ["case_study", "product", "experiment", "writing"]

export default function Work() {
  const { records, loading } = useWork()
  const [kind, setKind] = useState<WorkKind | "all">("all")

  const present = ORDER.filter((k) => records.some((r) => r.kind === k))
  const shown = kind === "all" ? records : records.filter((r) => r.kind === kind)

  return (
    <>
      <Seo
        title="Selected work"
        description="Records of client work, products I own and experiments, with what was built, what it solved and what came of it."
        path="/work"
      />

      <PageHero
        eyebrow="Selected work"
        breadcrumb="Work"
        title="A record of what I have built, and what it was for."
        intro="Four kinds of record: client work, things I built and own, experiments, and writing. Every field is either true or marked as missing. Nothing here is filled in to make the page look busier."
      />

      <Section>
        {present.length > 1 && (
          <div className="pb-10">
            <Label as="h2" className="mb-4">
              Filter by kind
            </Label>
            <div className="flex flex-wrap gap-2">
              {(["all", ...present] as const).map((k) => {
                const active = kind === k
                const label = k === "all" ? "Everything" : KIND_LABELS[k].name
                const count = k === "all" ? records.length : records.filter((r) => r.kind === k).length
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border-[1.5px] px-5 text-body",
                      active
                        ? "border-gk-set bg-gk-set text-gk-paper"
                        : "border-gk-edge text-gk-ink-soft hover:border-gk-ink hover:text-gk-ink",
                    )}
                  >
                    {label}
                    <span className="font-data text-label">{count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div aria-live="polite" aria-busy={loading}>
          {shown.length > 0 ? (
            <Ledger records={shown} headingLevel="h3" />
          ) : (
            <p className="border-y border-gk-edge py-12 text-lede text-gk-ink-soft">
              {loading ? "Loading the records…" : kind === "all" ? "Nothing published yet." : "Nothing of that kind yet."}
            </p>
          )}
        </div>
      </Section>
    </>
  )
}
