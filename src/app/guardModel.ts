/**
 * The decisions behind the signed-in gate (RequireAuth.tsx, Clerk build), kept apart from React so they
 * can be tested. The rule: a screen must never spin for ever. Two cases did: a 401 mid-session cleared
 * the user and nothing loaded it again, and a network error or a 500 on the first "who am I" left no user
 * and no message.
 */
export type GuardState = { isLoaded: boolean; isSignedIn: boolean; hasUser: boolean; denied: boolean; failed: boolean }
export type GuardView = "loading" | "login" | "denied" | "retry" | "app"

export function guardView(s: GuardState): GuardView {
  if (!s.isLoaded) return "loading"
  if (!s.isSignedIn) return "login"
  if (s.denied) return "denied"
  if (s.hasUser) return "app"
  return s.failed ? "retry" : "loading"
}

/** Load the user whenever someone is signed in and none is held, until a refusal or a failure needs the person to act. */
export function needsUser(s: GuardState): boolean {
  return s.isLoaded && s.isSignedIn && !s.hasUser && !s.denied && !s.failed
}

/** 401 and 403 mean this email has no access; anything else (no reply, 500, 429) is worth a retry. */
export function meOutcome(res: { ok: boolean; status?: number }): "ok" | "denied" | "failed" {
  if (res.ok) return "ok"
  return res.status === 401 || res.status === 403 ? "denied" : "failed"
}
