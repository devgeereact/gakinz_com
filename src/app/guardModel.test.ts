import { describe, expect, it } from "vitest"
import { guardView, meOutcome, needsUser } from "./guardModel"

const base = { isLoaded: true, isSignedIn: true, hasUser: false, denied: false, failed: false }

describe("guardView: what the signed-in gate shows (a screen must never hang)", () => {
  it("waits only while Clerk itself is loading", () => {
    expect(guardView({ ...base, isLoaded: false })).toBe("loading")
  })

  it("sends a signed-out visitor to the sign-in page", () => {
    expect(guardView({ ...base, isSignedIn: false })).toBe("login")
  })

  it("shows the app once the user is known", () => {
    expect(guardView({ ...base, hasUser: true })).toBe("app")
  })

  it("says 'no access' for an email that is not set up, even if a user is held", () => {
    expect(guardView({ ...base, denied: true })).toBe("denied")
    expect(guardView({ ...base, denied: true, hasUser: true })).toBe("denied")
  })

  it("offers a retry, not a spinner, when the user could not be loaded", () => {
    expect(guardView({ ...base, failed: true })).toBe("retry")
  })

  it("spins only while a user lookup can still be made", () => {
    expect(guardView(base)).toBe("loading")
  })
})

describe("needsUser: when the gate must (re)load the user", () => {
  it("loads the user when signed in and none is held", () => {
    expect(needsUser(base)).toBe(true)
  })

  it("loads it again after a 401 cleared the user mid-session", () => {
    // Before the fix the effect ran only when Clerk's state changed, so a cleared user hung the screen.
    expect(needsUser({ ...base, hasUser: false })).toBe(true)
  })

  it("does not load when a user is held, Clerk is loading, or the visitor is signed out", () => {
    expect(needsUser({ ...base, hasUser: true })).toBe(false)
    expect(needsUser({ ...base, isLoaded: false })).toBe(false)
    expect(needsUser({ ...base, isSignedIn: false })).toBe(false)
  })

  it("does not loop after a refusal or a failure: it waits for the person to act", () => {
    expect(needsUser({ ...base, denied: true })).toBe(false)
    expect(needsUser({ ...base, failed: true })).toBe(false)
  })
})

describe("meOutcome: how the answer to 'who am I' is read", () => {
  it("is ok on success", () => {
    expect(meOutcome({ ok: true })).toBe("ok")
  })

  it("is denied for a 401 or 403, which really mean this email has no access", () => {
    expect(meOutcome({ ok: false, status: 401 })).toBe("denied")
    expect(meOutcome({ ok: false, status: 403 })).toBe("denied")
  })

  it("is failed for anything else, so a network error or a 500 can be retried", () => {
    expect(meOutcome({ ok: false })).toBe("failed")
    expect(meOutcome({ ok: false, status: 500 })).toBe("failed")
    expect(meOutcome({ ok: false, status: 429 })).toBe("failed")
  })
})
