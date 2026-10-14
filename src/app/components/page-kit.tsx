import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * The GAkinzOS page kit (D-046), matching the approved CMS prototype.
 *
 * PageHeader: title, one-line purpose, actions with the PRIMARY action first.
 * The "Group / Title" crumb comes from AppLayout, so pages do not repeat it.
 * StatTile: muted label, large tabular value, short note (tone colours the note).
 * StatusBadge: maps a record status to the semantic badge tone.
 */

export function PageHeader({ title, subtitle, actions, className }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end gap-x-6 gap-y-4 pb-5 pt-1", className)}>
      <div className="min-w-[min(100%,280px)] flex-1">
        <h1 className="font-display text-[clamp(1.7rem,2.6vw,2.2rem)] font-semibold leading-tight tracking-[-0.025em] text-foreground">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-[70ch] text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4", className)}>{children}</div>
}

export function StatTile({
  label,
  value,
  note,
  tone,
  icon,
  onClick,
  className,
}: {
  label: ReactNode
  value: ReactNode
  note?: ReactNode
  tone?: "up" | "down"
  icon?: ReactNode
  onClick?: () => void
  className?: string
}) {
  const body = (
    <>
      <span className="flex items-start justify-between gap-2 text-[13px] text-muted-foreground">
        <span className="min-w-0">{label}</span>
        {icon && <span className="shrink-0 text-muted-foreground [&_svg]:size-4">{icon}</span>}
      </span>
      <span className="font-display text-[1.9rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-foreground max-sm:text-[1.5rem]">{value}</span>
      {note && <span className={cn("text-[12.5px] text-muted-foreground", tone === "up" && "text-ok", tone === "down" && "text-bad")}>{note}</span>}
    </>
  )
  const cls = cn("grid min-w-0 gap-1.5 rounded-2xl border bg-card px-[18px] py-4 text-left", onClick && "transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30", className)
  return onClick ? (
    <button type="button" className={cls} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

const TONE: [RegExp, "ok" | "warn" | "bad" | "acc"][] = [
  [/^(paid|live|active|won|accepted|signed|done|published|approved|resolved|complete|completed|launched|deployed|success|healthy|connected|on|in date)$/i, "ok"],
  [/^(draft|pending|due|due today|awaiting|in[_ ]progress|in review|review|open|on[_ ]hold|invited|partly paid|contacted|expiring|changes|changes requested|planning|scheduled|warm)$/i, "warn"],
  [/^(overdue|lost|failed|declined|urgent|blocked|expired|cancelled|void|rejected|rolled back|down|hot|suspended)$/i, "bad"],
  [/^(new|sent|viewed|proposal|design|build|discover|launch|support|qualified|next|high)$/i, "acc"],
]

/** A status pill in the semantic tone for its value. Unknown values stay neutral. */
export function StatusBadge({ status, className, children }: { status: string; className?: string; children?: ReactNode }) {
  const norm = status.replace(/_/g, " ").trim()
  const tone = TONE.find(([re]) => re.test(norm))?.[1]
  const label = children ?? norm.charAt(0).toUpperCase() + norm.slice(1)
  return (
    <Badge variant={tone ?? "outline"} className={className}>
      {label}
    </Badge>
  )
}
