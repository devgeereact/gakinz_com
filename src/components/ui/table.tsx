import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Prepare a stacked table. Each cell gets its column header's text as `data-label`, so a card can print "Status: Paid";
 * a cell that spans columns (an empty-state row) gets none. The actions cell (header "Action" or "Actions" and a button
 * or link inside) gets `data-actions`, so CSS can drop its label and align it without guessing from the header text.
 * Explicit ARIA roles keep the table semantics when CSS turns the table elements into blocks (WebKit drops them).
 */
function labelCells(table: HTMLTableElement) {
  table.setAttribute("role", "table")
  for (const group of table.querySelectorAll("thead, tbody")) group.setAttribute("role", "rowgroup")
  const heads = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th"))
  for (const th of heads) th.setAttribute("role", "columnheader")
  for (const row of table.querySelectorAll<HTMLTableRowElement>("tr")) row.setAttribute("role", "row")
  for (const row of table.querySelectorAll<HTMLTableRowElement>("tbody tr")) {
    Array.from(row.cells).forEach((cell, i) => {
      cell.setAttribute("role", "cell")
      const text = cell.colSpan > 1 ? "" : (heads[i]?.textContent?.trim() ?? "")
      if (text) cell.setAttribute("data-label", text)
      else cell.removeAttribute("data-label")
      if (/^actions?$/i.test(text) && cell.querySelector("button, a")) cell.setAttribute("data-actions", "")
      else cell.removeAttribute("data-actions")
    })
  }
}

type TableProps = React.HTMLAttributes<HTMLTableElement> & {
  /** Below 640 px each row becomes a stacked card (K-148, V1.3 item 4) instead of a table that scrolls sideways. */
  stack?: boolean
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(({ className, stack = false, ...props }, ref) => {
  const inner = React.useRef<HTMLTableElement | null>(null)
  const setRef = React.useCallback(
    (node: HTMLTableElement | null) => {
      inner.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )
  React.useLayoutEffect(() => {
    const table = inner.current
    if (!stack || !table) return
    labelCells(table)
    // Attribute writes are not child-list changes, so labelling does not retrigger the observer.
    const watch = new MutationObserver(() => labelCells(table))
    watch.observe(table, { childList: true, subtree: true, characterData: true })
    return () => watch.disconnect()
  }, [stack])
  return (
    <div className="relative w-full overflow-auto">
      <table
        ref={setRef}
        data-stack={stack ? "" : undefined}
        className={cn("w-full caption-bottom border-collapse text-sm", className)}
        {...props}
      />
    </div>
  )
})
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-secondary font-medium last:[&>tr]:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-secondary data-[state=selected]:bg-secondary",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "whitespace-nowrap bg-secondary px-3.5 py-3 text-left align-middle font-mono text-[10.5px] font-normal uppercase tracking-[.08em] text-muted-foreground tabular-nums has-[[role=checkbox]]:pr-0 *:[[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-3.5 py-3 align-middle tabular-nums has-[[role=checkbox]]:pr-0 *:[[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
