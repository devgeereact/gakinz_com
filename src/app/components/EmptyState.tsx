import type { ComponentType, ReactNode } from "react"

// Themed empty state for GAkinzOS modules — see DESIGN-SYSTEM.md §8.
// Replaces the ad-hoc "No X yet" centred text each module hand-rolls.
// Icon sits in the forest-tokened gk-app-chip so empties feel branded, not blank.
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
      className={`flex flex-col items-center justify-center gap-3 px-6 py-12 text-center${className ? ` ${className}` : ""}`}
    >
      {Icon && (
        <span aria-hidden className="gk-app-chip flex h-11 w-11 items-center justify-center">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
