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
 * The first blocking problem with a draft, or null when it can be sent. `today`
 * is the browser's local date; the server checks again against its own clock.
 * The amount is only checked for format here: whether it equals the payable
 * total is the server's call (see amountWarning).
 */
export function paymentProblem(d: PaymentDraft, inv: Pick<Invoice, "issued_at">, today: string): string | null {
  if (needsReference(d.method) && !d.reference.trim()) {
    return d.method === "cheque" ? "Enter the cheque number or reference." : "Enter the bank transfer reference."
  }
  if (d.reference.trim().length > 100) return "The reference must be 100 characters or fewer."
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.paid_on)) return "Enter the date it was paid."
  if (d.paid_on > today) return "The payment date cannot be in the future."
  if (d.paid_on < inv.issued_at.slice(0, 10)) return "The payment date cannot be before the invoice was issued."
  const pence = penceFromPounds(d.amount)
  if (pence === null || pence <= 0) return "Enter the amount received in pounds, for example 120.00."
  return null
}

/**
 * Advice, never a block: the amount differs from the total in the invoice list.
 * The list and server/_money.php can round VAT a penny apart, and the server
 * holds the authoritative total, so the owner may still send it.
 */
export function amountWarning(amount: string, inv: Pick<Invoice, "total">): string | null {
  const pence = penceFromPounds(amount)
  if (pence === null || pence === Math.round(inv.total * 100)) return null
  return `This differs from the invoice total of £${inv.total.toFixed(2)}. The server will refuse anything but the full total; record a part payment as a separate instalment invoice.`
}

/** The expected total from a refused record_payment, as an amount field value, or null if the reply has none. */
export function expectedAmount(details: Record<string, unknown> | undefined): string | null {
  const p = details?.expected_pence
  return typeof p === "number" && Number.isInteger(p) && p > 0 ? (p / 100).toFixed(2) : null
}

/** One line for a paid invoice with a recorded payment, e.g. "Bank transfer, ref ABC123". Null when none was recorded. */
export function recordedPaymentLine(inv: Pick<Invoice, "paid_method" | "paid_reference">): string | null {
  if (!inv.paid_method) return null
  const label = methodLabel(inv.paid_method)
  return inv.paid_reference ? `${label}, ref ${inv.paid_reference}` : label
}
