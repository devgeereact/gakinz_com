// Shared CSV export. Lives apart from utils.ts so file-saver is only bundled in
// the CMS chunks that export data — not in the public site (which imports
// utils.cn everywhere).
import { saveAs } from "file-saver"

// RFC-4180: every field is double-quoted and inner quotes are doubled, so
// commas, quotes and newlines inside a value are all safe. CRLF row endings.
export function toCsv(head: string[], rows: Record<string, unknown>[]): string {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`
  const lines = [head.join(","), ...rows.map((r) => head.map((k) => esc(r[k])).join(","))]
  return lines.join("\r\n")
}

// Build the CSV and trigger a client-side download.
export function downloadCsv(filename: string, head: string[], rows: Record<string, unknown>[]): void {
  const blob = new Blob([toCsv(head, rows)], { type: "text/csv;charset=utf-8" })
  saveAs(blob, filename)
}
