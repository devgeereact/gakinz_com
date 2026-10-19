import { describe, expect, it, vi } from "vitest"
import { closeReducer, idleClose, shouldAsk } from "./unsaved-guard-model"

describe("closeReducer", () => {
  it("holds the leave action when a dirty form asks to close", () => {
    const leave = vi.fn()
    const s = closeReducer(idleClose, { type: "request", dirty: true, leave })
    expect(s.pending).toBe(leave)
    expect(leave).not.toHaveBeenCalled()
  })

  it("holds nothing for a clean form", () => {
    const s = closeReducer(idleClose, { type: "request", dirty: false, leave: vi.fn() })
    expect(s).toBe(idleClose)
    expect(shouldAsk(false)).toBe(false)
    expect(shouldAsk(true)).toBe(true)
  })

  it("Stay and Leave both clear the pending request", () => {
    const held = closeReducer(idleClose, { type: "request", dirty: true, leave: vi.fn() })
    expect(closeReducer(held, { type: "stay" }).pending).toBeNull()
    expect(closeReducer(held, { type: "leave" }).pending).toBeNull()
  })

  it("drops a stale request when the form goes clean, keeps it while dirty", () => {
    const held = closeReducer(idleClose, { type: "request", dirty: true, leave: vi.fn() })
    expect(closeReducer(held, { type: "dirty", dirty: true })).toBe(held)
    expect(closeReducer(held, { type: "dirty", dirty: false }).pending).toBeNull()
  })

  it("ignores stay, leave and clean notices when nothing is pending", () => {
    expect(closeReducer(idleClose, { type: "stay" })).toBe(idleClose)
    expect(closeReducer(idleClose, { type: "dirty", dirty: false })).toBe(idleClose)
  })

  it("a blocked navigation drops a pending close request so only one prompt is raised", () => {
    const held = closeReducer(idleClose, { type: "request", dirty: true, leave: vi.fn() })
    expect(closeReducer(held, { type: "navigation" }).pending).toBeNull()
    expect(closeReducer(idleClose, { type: "navigation" })).toBe(idleClose)
  })
})
