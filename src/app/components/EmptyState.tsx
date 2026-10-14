import type { ComponentType, ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Empty state for GAkinzOS modules (history: docs/DECISIONS.md D-006), with the
// approved prototype's `.empty` contents (D-046): a soft accent icon tile, a
// display title, one muted line and an optional action. It draws no frame, so it
// can sit inside a card; a full-page empty state passes the dashed card classes
// (rounded-2xl border border-dashed border-line-strong bg-card py-14).
type EmptyStateProps = {
  icon?: ComponentType<{ className?: string }>
  title: string
  description?: ReactNode
  /** Optional call-to-action (e.g. an "Add client" button). */
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "grid place-items-center gap-2.5 px-5 py-12 text-center",
        className,
      )}
    >
      {Icon && (
        <span aria-hidden className="grid size-12 place-items-center rounded-[14px] bg-acc-soft text-acc">
          <Icon className="size-[18px]" />
        </span>
      )}
      <p className="font-display text-[1.2rem] font-semibold leading-tight tracking-[-0.025em] text-foreground">{title}</p>
      {description && <p className="max-w-[46ch] text-muted-foreground">{description}</p>}
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}

/**
 * The prototype's `.err` panel: what failed, the server's message, and a
 * "Try again" button when the caller can retry.
 */
export function LoadError({
  what,
  detail,
  onRetry,
  className,
}: {
  what: string
  detail?: ReactNode
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn("flex flex-wrap items-start gap-3.5 rounded-2xl border border-bad/30 bg-bad-soft p-[18px] text-foreground", className)}
    >
      <AlertTriangle aria-hidden className="mt-0.5 size-[18px] shrink-0 text-bad" />
      <div className="min-w-[min(100%,200px)] flex-1 [overflow-wrap:anywhere]">
        <p className="font-semibold">Could not load {what}.</p>
        <p className="mt-1 text-muted-foreground">{detail ?? "The server did not answer. Nothing was changed. Check your connection, then try again."}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw /> Try again
        </Button>
      )}
    </div>
  )
}
