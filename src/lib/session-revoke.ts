// K-033: unlocking the idle lock screen signs in again and stores a new bearer
// token. The token held before the lock must then be revoked on the server, or
// it stays valid until it expires. This module holds the retry logic as a pure
// function so it can be tested without a network or a database.

export type RevokeOutcome = "revoked" | "skipped" | "failed"

export type RevokeOptions = {
  // Total attempts, the first included. Defaults to 3.
  attempts?: number
  // Wait before the second attempt, doubled for each attempt after it.
  baseDelayMs?: number
  sleep?: (ms: number) => Promise<void>
  warn?: (message: string) => void
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Revokes `oldToken` through `revoke`, retrying with a doubling delay.
 *
 * Never throws: a failure must not lock the user out of the session they have
 * just unlocked. Every failed attempt is reported through `warn`, so a token
 * left valid is never ignored silently.
 */
export async function revokePreviousToken(
  oldToken: string | null | undefined,
  newToken: string,
  revoke: (token: string) => Promise<{ ok: boolean; error?: string }>,
  opts: RevokeOptions = {},
): Promise<RevokeOutcome> {
  // Nothing to revoke, or the server handed back the same token.
  if (!oldToken || oldToken === newToken) return "skipped"

  const attempts = Math.max(1, opts.attempts ?? 3)
  const baseDelayMs = opts.baseDelayMs ?? 1000
  const sleep = opts.sleep ?? defaultSleep
  const warn = opts.warn ?? ((m: string) => console.warn(m))

  for (let i = 1; i <= attempts; i++) {
    let reason: string
    try {
      const res = await revoke(oldToken)
      if (res.ok) return "revoked"
      reason = res.error || "request failed"
    } catch (e) {
      reason = e instanceof Error ? e.message : String(e)
    }
    const last = i === attempts
    warn(
      last
        ? `Lock screen: could not revoke the previous session token after ${attempts} attempts (${reason}). It stays valid until it expires; end it from the active sessions list.`
        : `Lock screen: revoking the previous session token failed on attempt ${i} of ${attempts} (${reason}). Retrying.`,
    )
    if (!last) await sleep(baseDelayMs * 2 ** (i - 1))
  }
  return "failed"
}
