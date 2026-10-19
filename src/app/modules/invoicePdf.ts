import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { InvoiceDetail } from "@/lib/api"

const VIOLET: [number, number, number] = [62, 82, 50] // #3E5232 deep sage (forest brand)
const INK: [number, number, number] = [45, 58, 47] // #2D3A2F forest ink

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)

// Branded invoice PDF (GAkinzOS §6 Invoicing). Generated client-side so no
// server PDF dependency is needed.
export function downloadInvoicePdf(inv: InvoiceDetail) {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const W = doc.internal.pageSize.getWidth()
  const M = 48

  // Header band
  doc.setFillColor(...VIOLET)
  doc.rect(0, 0, W, 90, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.text("GAkinz", M, 50)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text("Web design & development studio", M, 68)

  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("INVOICE", W - M, 50, { align: "right" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(inv.number || `#${inv.id}`, W - M, 68, { align: "right" })

  // Meta
  doc.setTextColor(...INK)
  const y = 130
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("Billed to", M, y)
  doc.setFont("helvetica", "normal")
  doc.text(inv.client_company || "—", M, y + 16)
  if (inv.client_email) doc.text(inv.client_email, M, y + 30)

  doc.setFont("helvetica", "bold")
  doc.text("Issued", W - M - 140, y)
  doc.text("Due", W - M - 140, y + 16)
  doc.text("Status", W - M - 140, y + 32)
  doc.setFont("helvetica", "normal")
  doc.text(inv.issued_at || "—", W - M, y, { align: "right" })
  doc.text(inv.due_at || "—", W - M, y + 16, { align: "right" })
  doc.text(inv.status.toUpperCase(), W - M, y + 32, { align: "right" })
  // The project's work reference (SQL 19), so the invoice names the work it bills.
  if (inv.project_reference) {
    doc.setFont("helvetica", "bold")
    doc.text("Project", W - M - 140, y + 48)
    doc.setFont("helvetica", "normal")
    doc.text(inv.project_reference, W - M, y + 48, { align: "right" })
  }

  // Items table. Prefer server-computed VAT figures; fall back to the line sum
  // for older invoices that predate the VAT fields.
  const subtotal = inv.subtotal ?? inv.items.reduce((s, it) => s + it.qty * it.unit_price, 0)
  const vatRate = inv.vat_rate ?? 0
  const vatAmount = inv.vat_amount ?? subtotal * (vatRate / 100)
  const total = inv.total ?? subtotal + vatAmount
  const foot: string[][] = [["", "", "Subtotal", gbp(subtotal)]]
  if (vatRate > 0) foot.push(["", "", `VAT (${vatRate}%)`, gbp(vatAmount)])
  foot.push(["", "", "Total", gbp(total)])
  autoTable(doc, {
    startY: y + 60,
    margin: { left: M, right: M },
    head: [["Description", "Qty", "Unit", "Amount"]],
    body: inv.items.map((it) => [
      it.description,
      String(it.qty),
      gbp(it.unit_price),
      gbp(it.qty * it.unit_price),
    ]),
    headStyles: { fillColor: VIOLET, halign: "left" },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    styles: { fontSize: 10, cellPadding: 6 },
    foot,
    footStyles: { fillColor: [240, 240, 250], textColor: INK, fontStyle: "bold", halign: "right" },
  })

  // Notes + footer
  const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
  const endY = (lastTable?.finalY ?? 200) + 30
  if (inv.notes) {
    doc.setFontSize(9)
    doc.setTextColor(120, 120, 138)
    doc.text(inv.notes, M, endY, { maxWidth: W - M * 2 })
  }
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 138)
  doc.text("Thank you. Payment due by the date above. GAkinz · gakinz.com", M, 800)

  doc.save(`${inv.number || "invoice"}.pdf`)
}
