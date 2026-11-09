// Small tested helpers for the Certificates screen (Phase 6, D-058). The server is the authority on every rule
// here (certificates.php); these only save a round trip and build the public link.

export type CertificateRow = {
  id: number
  public_id: string
  recipient: string
  programme: string
  issued_at: string
  revoked_at: string | null
  created_at: string
}

export type IssueForm = { recipient: string; programme: string; issued_at: string }

/** Where anyone can check this reference. The public site is the production origin, whatever the CMS is served from. */
export function verifyUrl(publicId: string): string {
  return `https://gakinz.com/verify/${encodeURIComponent(publicId)}`
}

/** Valid until revoked. A revoked certificate stays in the register but no longer verifies. */
export function certificateState(c: Pick<CertificateRow, "revoked_at">): "valid" | "revoked" {
  return c.revoked_at ? "revoked" : "valid"
}

/** The first thing wrong with a form, or null. `today` is YYYY-MM-DD, passed in so the rule is testable. */
export function issueError(form: IssueForm, today: string): string | null {
  if (!form.recipient.trim()) return "The recipient is required."
  if (!form.programme.trim()) return "The programme is required."
  if (form.issued_at && form.issued_at > today) return "The date cannot be in the future."
  return null
}
