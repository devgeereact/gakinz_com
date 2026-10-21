import { describe, expect, it } from "vitest"
import { initialRedirectState } from "./loginRedirect"

const access = "a".repeat(64)

describe("initialRedirectState", () => {
  it("starts idle with no hash", () => {
    expect(initialRedirectState("")).toEqual({ busy: false, error: null })
  })

  it("starts busy for a reference link, a magic link and a Google token", () => {
    expect(initialRedirectState(`#access=${access}`).busy).toBe(true)
    expect(initialRedirectState("#magic=abc").busy).toBe(true)
    expect(initialRedirectState("#sso_token=abc").busy).toBe(true)
  })

  it("shows a Google error, and a known code gets its own message", () => {
    expect(initialRedirectState("#sso_error=cancelled")).toEqual({ busy: false, error: "Google sign-in was cancelled." })
    expect(initialRedirectState("#sso_error=odd").error).toBe("Google sign-in failed.")
  })

  it("prefers the Google error over a token, as the consuming effect does", () => {
    expect(initialRedirectState("#sso_error=inactive&sso_token=abc")).toEqual({ busy: false, error: "That account is suspended." })
  })

  it("ignores a malformed reference token", () => {
    expect(initialRedirectState("#access=short")).toEqual({ busy: false, error: null })
  })
})
