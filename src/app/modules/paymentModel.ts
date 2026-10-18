/**
 * Pure logic for recording a manual payment on an invoice (Invoicing). No React
 * and no fetches, so it is unit tested directly. The rules mirror
 * server/invoices.php?action=record_payment; the server is the authority.
 */
import type { Invoice, PaymentMethod } from "@/lib/api"

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
]

export const methodLabel = (m: PaymentMethod) => PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m

/** Bank transfers and cheques must carry a reference the owner can match to a statement. */
export const needsReference = (m: PaymentMethod) => m === "bank_transfer" || m === "cheque"

/** Only a sent invoice can take a recorded payment: not a draft, not one already paid. */
export const canRecordPayment = (inv: Pick<Invoice, "status">) => inv.status === "sent"

/** The payable total as the amount field shows it, e.g. 119.99 -> "119.99". */
export const amountInput = (total: number) => total.toFixed(2)

/** Pence from what the owner typed in pounds, or null if it is not a plain amount. Same rule as the server. */
export function penceFromPounds(value: string): number | null {
  const m = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(value.trim())
  if (!m) return null
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"))
}

export type PaymentDraft = { method: PaymentMethod; reference: string; paid_on: string; amount: string }

/**
 * The first problem with a draft, or null when it is ready to send. `today` is
 * the browser's local date; the server checks again against its own clock.
 */
export function paymentProblem(d: PaymentDraft, inv: Pick<Invoice, "total" | "issued_at">, today: string): string | null {
  if (needsReference(d.method) && !d.reference.trim()) {
    return d.method === "cheque" ? "Enter the cheque number or reference." : "Enter the bank transfer reference."
  }
  if (d.reference.trim().length > 100) return "The reference must be 100 characters or fewer."
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.paid_on)) return "Enter the date it was paid."
  if (d.paid_on > today) return "The payment date cannot be in the future."
  if (d.paid_on < inv.issued_at.slice(0, 10)) return "The payment date cannot be before the invoice was issued."
  const pence = penceFromPounds(d.amount)
  if (pence === null) return "Enter the amount received in pounds, for example 120.00."
  if (pence !== Math.round(inv.total * 100)) {
    return `The amount must be the full invoice total of £${inv.total.toFixed(2)}. Record a part payment as a separate instalment invoice.`
  }
  return null
}

/** One line for a paid invoice with a recorded payment, e.g. "Bank transfer, ref ABC123". Null when none was recorded. */
export function recordedPaymentLine(inv: Pick<Invoice, "paid_method" | "paid_reference">): string | null {
  if (!inv.paid_method) return null
  const label = methodLabel(inv.paid_method)
  return inv.paid_reference ? `${label}, ref ${inv.paid_reference}` : label
}
