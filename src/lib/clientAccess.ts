/**
 * Client sign-in by work reference and email (server/client_access.php,
 * docs/PRODUCT-SPEC.md 6.1). Switched off on the server by default: every
 * route answers 404, so `referenceSignInEnabled` is false and the sign-in page
 * shows nothing new. Pure helpers, so the rules have one definition and tests.
 */
import type { ApiResult } from "@/lib/api"

/** True only when the server answered 200 with `enabled: true`. A 404, an error or any other value is off. */
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
