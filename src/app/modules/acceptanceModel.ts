/**
 * Pure logic for recording a client's acceptance of a quote (Quotes). No React
 * and no fetches, so it is unit tested directly. The rules mirror
 * server/proposals.php?action=accept; the server is the authority.
 */
import type { AcceptanceEvidence, AcceptanceMethod, Proposal } from "@/lib/api"

export const ACCEPTANCE_METHODS: { value: AcceptanceMethod; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "letter", label: "Letter or signed copy" },
  { value: "in_person", label: "In person" },
  { value: "phone", label: "Phone" },
  { value: "other", label: "Other" },
]

export const acceptanceMethodLabel = (m: AcceptanceMethod) => ACCEPTANCE_METHODS.find((x) => x.value === m)?.label ?? m

/** A hint for the reference field that fits how the acceptance arrived. */
export function referenceHint(m: AcceptanceMethod): string {
  switch (m) {
    case "email":
      return "Email subject and sender, e.g. Re: Website quote, jo@client.co.uk"
    case "letter":
      return "Who signed and the document, e.g. Signed quote from Jo Smith"
    case "phone":
      return "Who you spoke to and the number, e.g. Jo Smith on 07700 900123"
    case "in_person":
      return "Who agreed and where, e.g. Jo Smith at the studio"
    default:
      return "What the client sent and who from"
  }
}

/**
 * The first blocking problem with the evidence, or null when it can be sent.
 * `today` is the browser's local date; the server checks again on its own
 * clock. The earliest allowed date is the day the quote was created, because
 * a quote records no sent date.
 */
export function evidenceProblem(e: AcceptanceEvidence, p: Pick<Proposal, "created_at">, today: string): string | null {
  const ref = e.reference.trim()
  if (ref.length < 3) return "Enter a reference of at least 3 characters, for example the email subject and sender."
  if (ref.length > 200) return "The reference must be 200 characters or fewer."
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.received_on)) return "Enter the date the acceptance was received."
  if (e.received_on > today) return "The date received cannot be in the future."
  const created = p.created_at.slice(0, 10)
  if (e.received_on < created) return "The date received cannot be before the quote was created."
  return null
}

/** The short version fingerprint shown on an accepted quote: the first 12 hex characters. */
export const shortFingerprint = (sha256: string | null) => (sha256 ? sha256.slice(0, 12) : null)

/** One line for an accepted quote's evidence, e.g. "Email, received 12 Jan 2026". Null when none was recorded. */
export function evidenceLine(p: Pick<Proposal, "acceptance_method" | "acceptance_received_on">): string | null {
  if (!p.acceptance_method) return null
  const label = acceptanceMethodLabel(p.acceptance_method)
  if (!p.acceptance_received_on) return label
  const d = new Date(`${p.acceptance_received_on.slice(0, 10)}T00:00:00`)
  return `${label}, received ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
}
