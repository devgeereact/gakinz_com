import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { KIND_LABELS, spineFor, type WorkRecord } from "@/marketing/data/work"
import { Gap } from "./primitives"

/**
 * The work ledger.
 *
 * A ruled list of records, not a grid of cards. The reason is structural
 * rather than stylistic: a ledger can carry a kind, a sector, a year and an
 * empty field in the same row without any of them looking broken, which is
 * what this site needs while real client material is still being gathered.
 *
 * Two mechanisms do the work that a badge would otherwise do:
 *
 *   ROW LABELS change with the kind. A case study reads Problem / Built /
 *   Outcome; an experiment reads Question / Made / Learned. So an experiment
 *   never has to pretend it had a client.
 *
 *   THE SPINE, on the left edge, is navy where a record's material is settled
 *   and red oxide where it is still awaiting something real. It is the same
 *   convention the whole site uses for the two chromatics, and it means an
 *   unfinished record reads as a deliberate state rather than as a bug.
 */

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-x-4 gap-y-1 py-2 sm:grid-cols-[7rem_1fr] sm:gap-x-6">
      <dt className="font-data text-label uppercase text-gk-ink-mute">{label}</dt>
      <dd className="text-body text-gk-ink-soft">
        {value ?? <Gap>to supply</Gap>}
      </dd>
    </div>
  )
}

export function LedgerRecord({ record, headingLevel = "h3" }: { record: WorkRecord; headingLevel?: "h2" | "h3" }) {
  const kind = KIND_LABELS[record.kind]
  const spine = spineFor(record)
  const Heading = headingLevel

  return (
    <article
      className={cn(
        "border-l-2 py-10 pl-5 sm:pl-8",
        spine === "set" ? "border-gk-set" : "border-gk-come",
      )}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_14rem] lg:gap-12">
        <div className="min-w-0">
          <p className="font-data text-label uppercase text-gk-ink-mute">{kind.name}</p>

          <Heading className="mt-3 font-display text-t3 text-gk-ink">
            {record.clientName ? (
              <>
                {record.title} <span className="text-gk-ink-mute">for</span> {record.clientName}
              </>
            ) : (
              record.title
            )}
          </Heading>

          {record.summary && <p className="mt-4 max-w-2xl text-body text-gk-ink-soft">{record.summary}</p>}

          <dl className="mt-6 max-w-2xl divide-y divide-gk-rule border-y border-gk-rule">
            {kind.rows.map((label, i) => (
              <Row key={label} label={label} value={record.rows[i]} />
            ))}
          </dl>

          {record.awaiting && (
            <p className="mt-4 max-w-2xl text-body text-gk-come">
              <span className="font-data text-label uppercase">Awaiting · </span>
              {record.awaiting}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link
              to={`/work/${record.slug}`}
              className="inline-flex min-h-[2.75rem] items-center text-body text-gk-set underline underline-offset-4 hover:text-gk-ink"
            >
              Read the record
            </Link>
            {record.liveUrl && (
              <a
                href={record.liveUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex min-h-[2.75rem] items-center text-body text-gk-ink-soft underline underline-offset-4 hover:text-gk-ink"
              >
                Visit the site
              </a>
            )}
            {record.repoUrl && (
              <a
                href={record.repoUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex min-h-[2.75rem] items-center text-body text-gk-ink-soft underline underline-offset-4 hover:text-gk-ink"
              >
                Source
              </a>
            )}
          </div>
        </div>

        {/* The data rail. Mono and right-aligned on wide screens so the
            figures line up down the page the way a ledger's should. */}
        <dl className="self-start font-data text-label">
          {[
            ["Sector", record.sector],
            ["Year", record.year],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-4 border-b border-gk-rule py-2"
            >
              <dt className="uppercase text-gk-ink-mute">{label}</dt>
              <dd className={cn("text-right", value ? "text-gk-ink" : "text-gk-come")}>
                {value ?? "to supply"}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  )
}

export default function Ledger({
  records,
  headingLevel = "h3",
}: {
  records: WorkRecord[]
  headingLevel?: "h2" | "h3"
}) {
  if (records.length === 0) return null
  return (
    <div className="divide-y divide-gk-edge border-y border-gk-edge">
      {records.map((r) => (
        <LedgerRecord key={r.slug} record={r} headingLevel={headingLevel} />
      ))}
    </div>
  )
}
