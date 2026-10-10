// Shared CSV + XLSX export. Lives apart from utils.ts so file-saver / xlsx are
// only bundled in the CMS chunks that export data — not in the public site
// (which imports utils.cn everywhere).
import { saveAs } from "file-saver"
import * as XLSX from "xlsx"

// A text cell that starts with one of these is run as a formula by Excel,
// Numbers and Sheets. Enquiry text comes from the public form, so it is
// untrusted (plan finding A21, OWASP "CSV injection").
const FORMULA_START = /^[=+\-@\t\r]/
const PLAIN_NUMBER = /^[-+]?\d+(\.\d+)?$/

// Prefixes a formula-like string with an apostrophe so it opens as text.
// Real numbers, including negative amounts such as "-40.00", are left alone.
export function neutraliseFormula(v: unknown): string {
  const s = String(v ?? "")
  if (typeof v === "string" && FORMULA_START.test(s) && !PLAIN_NUMBER.test(s)) return `'${s}`
  return s
}

// RFC-4180: every field is double-quoted and inner quotes are doubled, so
// commas, quotes and newlines inside a value are all safe. CRLF row endings.
export function toCsv(head: string[], rows: Record<string, unknown>[]): string {
  const esc = (v: unknown) => `"${neutraliseFormula(v).replace(/"/g, '""')}"`
  const lines = [head.join(","), ...rows.map((r) => head.map((k) => esc(r[k])).join(","))]
  return lines.join("\r\n")
}

// Build the CSV and trigger a client-side download.
export function downloadCsv(filename: string, head: string[], rows: Record<string, unknown>[]): void {
  const blob = new Blob([toCsv(head, rows)], { type: "text/csv;charset=utf-8" })
  saveAs(blob, filename)
}

// Build an .xlsx workbook from the same (head, rows) shape and download it.
// One sheet; header row first, then one row per record in `head` order.
// SheetJS stores strings as text cells (t: "s", no formula), so formula-like
// input is not executed here; csv.test.ts checks that.
export function downloadXlsx(
  filename: string,
  head: string[],
  rows: Record<string, unknown>[],
  sheetName = "Sheet1",
): void {
  const aoa = [head, ...rows.map((r) => head.map((k) => r[k] ?? ""))]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
  XLSX.writeFile(wb, filename)
}
