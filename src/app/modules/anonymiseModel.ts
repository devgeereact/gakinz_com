/**
 * State decisions for anonymising a former client (privacy.php,
 * server/_anonymise.php). The tool is switched off by default, and then the
 * preview answers 404, so the client record must show nothing at all: the
 * action appears only when the preview answers with a body. No React and no
 * fetches, so it is unit tested directly.
 */
import type { ApiResult, ClientAnonymisation, ClientAnonymisePreview } from "@/lib/api"

/** Null hides the action: switched off, not on the server yet, not allowed, or any failure. */
export function anonymiseAvailable(res: ApiResult<ClientAnonymisePreview>): ClientAnonymisePreview | null {
  if (!res.ok) return null
  const p = res.data
  return p && typeof p.id === "number" && Array.isArray(p.problems) && Array.isArray(p.kept) ? p : null
}

/**
 * True when the typed confirmation is the client's company name. Case, outer
 * spaces and runs of spaces are ignored, as the server ignores them.
 */
export function companyMatches(typed: string, company: string): boolean {
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase()
  return norm(company) !== "" && norm(typed) === norm(company)
}

export type AnonymiseOutcome =
  | { kind: "anonymised"; result: ClientAnonymisation }
  | { kind: "refused"; error: string }
  | { kind: "error"; error: string }

/** A 400, 404 or 409 is the server saying why nothing was changed. */
export function anonymiseOutcome(res: ApiResult<ClientAnonymisation>): AnonymiseOutcome {
  if (res.ok) return { kind: "anonymised", result: res.data }
  if (res.status === 400 || res.status === 404 || res.status === 409) return { kind: "refused", error: res.error }
  return { kind: "error", error: res.error || "Could not anonymise the client." }
}

/** What changes, in the dialog's words, so the owner reads it before typing. */
export function changesList(p: ClientAnonymisePreview, keepCompany: boolean): string[] {
  const logins = p.logins === 1 ? "its portal login is" : `its ${p.logins} portal logins are`
  const out = [
    keepCompany ? `The company name stays “${p.company}”.` : `The company name becomes “${p.placeholder}”.`,
    "The contact name, email address, phone number and notes are cleared.",
  ]
  if (p.logins > 0) out.push(`${logins[0].toUpperCase()}${logins.slice(1)} suspended for good, renamed “${p.placeholder}” and signed out; replies they wrote show that name.`)
  if (p.source_enquiry) out.push("The enquiry this client came from loses its name, email address, IP address" + (keepCompany ? "." : " and company."))
  out.push("Their email addresses are replaced with “[erased]” in the activity log.")
  if (p.other_enquiries > 0) {
    const one = p.other_enquiries === 1
    out.push(
      `${one ? "1 other enquiry uses" : `${p.other_enquiries} other enquiries use`} the same address. ${one ? "It is" : "They are"} not changed, ` +
        `but ${one ? "its" : "their"} activity log copies are scrubbed and ${one ? "its" : "their"} submission IP addresses cleared.`,
    )
  }
  return out
}
