import { Skeleton } from "@/components/ui/skeleton"

// Themed loading skeleton that matches table shape (history: docs/DECISIONS.md D-006).
// Premium-tech loading state: shimmer rows instead of a lone spinner, so the
// layout doesn't jump when real data arrives. Drop in while a module's list loads.
type TableSkeletonProps = {
  /** Number of placeholder rows. */
  rows?: number
  /** Number of columns (cells per row). */
  cols?: number
  className?: string
}

export function TableSkeleton({ rows = 6, cols = 4, className }: TableSkeletonProps) {
  return (
    <div
      className={`space-y-3 p-4${className ? ` ${className}` : ""}`}
      role="status"
      aria-label="Loading…"
    >
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className="h-4"
              // First column wider (the "name" col); rest even — reads like a table.
              style={{ flex: c === 0 ? 2 : 1 }}
            />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  )
}
