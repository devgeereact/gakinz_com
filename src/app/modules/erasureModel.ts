/**
 * State decisions for the two deletion tools (docs/PRIVACY-READINESS.md
 * section 7): a super admin erasing one prospect's enquiry from the Enquiries
 * drawer, and a client asking for their data to be deleted from My account.
 * No React and no fetches, so it is unit tested directly. Both routes are new
 * and uploaded by hand, so until they are on the server the tools are hidden
 * or say "not available yet" quietly, by the shared rule in
 * src/lib/notAvailable.ts.
 */
import type { ApiResult, EnquiryErasePreview, EnquiryErasure } from "@/lib/api"
import { notAvailableYet } from "@/lib/notAvailable"
import { site } from "@/marketing/data/site"

export const ERASE_NOT_AVAILABLE = "Erasing an enquiry is not available on the server yet."
/** The address comes from the site's contact details, so it changes in one place. */
export const DELETION_NOT_AVAILABLE = `Deletion requests open once GAkinz finishes a server update. Until then, email ${site.contact.email}.`

/**
 * True when the typed confirmation is the enquiry's email address. Case and
 * outer spaces are ignored, as the server ignores them; anything else must
 * match exactly, so a near miss never enables the button.
 */
export function confirmMatches(typed: string, email: string): boolean {
  const want = email.trim().toLowerCase()
  return want !== "" && typed.trim().toLowerCase() === want
}

export type ErasureOutcome =
  | { kind: "erased"; result: EnquiryErasure }
  | { kind: "refused"; error: string }
  | { kind: "not_on_server" }
  | { kind: "error"; error: string }

/** A 400, 404 or 409 is the server explaining why nothing was erased. */
export function erasureOutcome(res: ApiResult<EnquiryErasure>): ErasureOutcome {
  if (res.ok) return { kind: "erased", result: res.data }
  if (notAvailableYet(res)) return { kind: "not_on_server" }
  if (res.status === 400 || res.status === 404 || res.status === 409) return { kind: "refused", error: res.error }
  return { kind: "error", error: res.error }
}

/** What an erasure leaves in place, shown in the dialog (PRIVACY-READINESS section 7). */
export const NOT_ERASED = [
  "Comms conversations and their messages",
  "Emails in the Mailbox",
  "Other enquiries from the same address",
  "Backups, until they age out",
  "Activity log entries that name the person without their email address, by first name only for example",
]

export type ErasePreviewState =
  | { kind: "ready"; preview: EnquiryErasePreview }
  | { kind: "unknown" }

/** The preview is extra information: if it fails or is not on the server, the dialog still works without it. */
export function erasePreviewState(res: ApiResult<EnquiryErasePreview>): ErasePreviewState {
  return res.ok ? { kind: "ready", preview: res.data } : { kind: "unknown" }
}

/** The line about other enquiries using the same address, or null when there are none. */
export function otherEnquiriesNote(n: number): string | null {
  if (n <= 0) return null
  const which = n === 1 ? "1 other enquiry uses" : `${n} other enquiries use`
  return `${which} this address. ${n === 1 ? "It is" : "They are"} not erased, but the activity log entries naming the address, ${n === 1 ? "its" : "their"} submission records and IP addresses included, are cleared too.`
}

export type DeletionRequestOutcome =
  | { kind: "sent" }
  | { kind: "already_open"; message: string }
  | { kind: "not_on_server" }
  | { kind: "error"; error: string }

export function deletionRequestOutcome(res: ApiResult<{ id: number; subject: string }>): DeletionRequestOutcome {
  if (res.ok) return { kind: "sent" }
  if (res.status === 409) return { kind: "already_open", message: res.error }
  if (notAvailableYet(res)) return { kind: "not_on_server" }
  return { kind: "error", error: res.error }
}
