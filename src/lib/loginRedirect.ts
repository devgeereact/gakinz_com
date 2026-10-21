import { readAccessToken } from "@/lib/clientAccess"

export const SSO_ERRORS: Record<string, string> = {
  cancelled: "Google sign-in was cancelled.",
  no_account: "No GAkinz account matches that Google email. Ask an admin to create one.",
  inactive: "That account is suspended.",
  exchange_failed: "Google sign-in failed. Please try again.",
  no_email: "Google didn’t return a verified email.",
  two_factor: "This account uses two-factor authentication. Sign in with your password and code.",
}

/**
 * How the sign-in screen starts when the address bar carries a redirect: a
 * reference link, a magic link or a Google token starts busy, and a Google
 * error starts with its message. Checked in the same order as Login's effect
 * that consumes the hash, so the two always agree (K-002: the state is set
 * from the start, not inside that effect).
 */
export function initialRedirectState(hash: string): { busy: boolean; error: string | null } {
  const raw = hash.replace(/^#/, "")
  if (!raw) return { busy: false, error: null }
  const params = new URLSearchParams(raw)
  if (readAccessToken(raw) || params.get("magic")) return { busy: true, error: null }
  const ssoError = params.get("sso_error")
  if (ssoError) return { busy: false, error: SSO_ERRORS[ssoError] || "Google sign-in failed." }
  if (params.get("sso_token")) return { busy: true, error: null }
  return { busy: false, error: null }
}
