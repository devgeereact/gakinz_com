import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { InvoiceDetail } from "@/lib/api"

const VIOLET: [number, number, number] = [110, 86, 207] // #6e56cf
const INK: [number, number, number] = [42, 42, 74] // #2a2a4a

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
  let y = 130
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

  // Items table
  const total = inv.items.reduce((s, it) => s + it.qty * it.unit_price, 0)
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
    foot: [["", "", "Total", gbp(total)]],
    footStyles: { fillColor: [240, 240, 250], textColor: INK, fontStyle: "bold", halign: "right" },
  })

  // Notes + footer
  const endY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 30
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
