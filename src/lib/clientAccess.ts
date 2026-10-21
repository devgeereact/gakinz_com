/**
 * Client sign-in by work reference and email (server/client_access.php,
 * docs/PRODUCT-SPEC.md 6.1). Switched off on the server by default: every
 * route answers 404, so `referenceSignInEnabled` is false and the sign-in page
 * shows nothing new. Pure helpers, so the rules have one definition and tests.
 */
import type { ApiResult } from "@/lib/api"

/**
 * True only when the server answered 200 with `enabled: true`. A 404, an error
 * or any other value is off, silently: the page shows nothing. The browser may
 * still log the 404 of the status probe in its console; that is the fetch
 * itself and cannot be hidden from script, and the server must answer 404
 * while off.
 */
export function referenceSignInEnabled(r: ApiResult<{ enabled?: unknown }>): boolean {
  return r.ok && r.data?.enabled === true
}

/**
 * The one-time token from a sign-in link's fragment (`#access=<64 hex>`). The
 * fragment never reaches a server log; the page posts the token and then
 * clears the address bar. Anything else in the fragment is ignored.
 */
export function readAccessToken(hash: string): string | null {
  const v = new URLSearchParams(hash.replace(/^#/, "")).get("access")
  return v && /^[0-9a-f]{64}$/.test(v) ? v : null
}

/** A reference as typed, tidied: spaces dropped, upper case. */
export function normaliseReference(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase()
}

/** GK-E-2026-0001 or GK-P-2026-0001, the shapes server/_reference.php issues. */
export function isReferenceShape(ref: string): boolean {
  return /^GK-[EP]-\d{4}-\d{4,9}$/.test(ref)
}

export const INVALID_LINK = "That sign-in link is invalid or expired."

/**
 * What the sign-in page says when a link does not work. A 404 means the
 * feature is switched off (or the file is not on the server), which to the
 * person holding the link is simply a link that no longer works. Other
 * answers (expired, refused, too many attempts) carry the server's text.
 */
export function redeemErrorMessage(r: ApiResult<unknown>): string {
  if (r.ok) return ""
  if (r.status === 404) return INVALID_LINK
  return r.error || INVALID_LINK
}
