import { describe, expect, it, vi } from "vitest"
import { revokePreviousToken } from "./session-revoke"

// K-033: unlocking the lock screen must revoke the token held before the lock.
describe("revokePreviousToken", () => {
  const noSleep = (_ms: number): Promise<void> => Promise.resolve()

  it("revokes the old token, not the new one", async () => {
    const revoke = vi.fn().mockResolvedValue({ ok: true })
    const warn = vi.fn()
    const out = await revokePreviousToken("old", "new", revoke, { sleep: noSleep, warn })
    expect(out).toBe("revoked")
    expect(revoke).toHaveBeenCalledTimes(1)
    expect(revoke).toHaveBeenCalledWith("old")
    expect(warn).not.toHaveBeenCalled()
  })

  it.each([null, undefined, ""])("skips when there is no previous token (%j)", async (old) => {
    const revoke = vi.fn()
    expect(await revokePreviousToken(old, "new", revoke)).toBe("skipped")
    expect(revoke).not.toHaveBeenCalled()
  })

  it("skips when the server returned the same token", async () => {
    const revoke = vi.fn()
    expect(await revokePreviousToken("same", "same", revoke)).toBe("skipped")
    expect(revoke).not.toHaveBeenCalled()
  })

  it("retries after a failure and warns about it", async () => {
    const revoke = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "Request failed (500)" })
      .mockResolvedValueOnce({ ok: true })
    const warn = vi.fn()
    const sleep = vi.fn(noSleep)
    const out = await revokePreviousToken("old", "new", revoke, { sleep, warn, baseDelayMs: 10 })
    expect(out).toBe("revoked")
    expect(revoke).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(10)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain("attempt 1 of 3")
  })

  it("gives up after the set attempts, warns each time and never throws", async () => {
    const revoke = vi.fn().mockRejectedValue(new Error("Network error"))
    const warn = vi.fn()
    const sleep = vi.fn(noSleep)
    const out = await revokePreviousToken("old", "new", revoke, { sleep, warn, baseDelayMs: 10 })
    expect(out).toBe("failed")
    expect(revoke).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([10, 20])
    expect(warn).toHaveBeenCalledTimes(3)
    expect(warn.mock.calls[2][0]).toContain("after 3 attempts")
    expect(warn.mock.calls[2][0]).toContain("Network error")
  })
})
