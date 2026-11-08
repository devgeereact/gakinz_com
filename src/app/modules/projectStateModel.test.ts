import { describe, expect, it } from "vitest"
import { patchProject } from "./projectStateModel"

type P = { id: number; status: string; stage: string; name: string }
const a: P = { id: 1, status: "active", stage: "design", name: "A" }
const b: P = { id: 2, status: "active", stage: "build", name: "B" }

describe("patchProject: a change shows in the list and on the open board", () => {
  it("updates the list entry and the selected project when they are the same project", () => {
    const r = patchProject([a, b], a, 1, { status: "paused" })
    expect(r.list[0].status).toBe("paused")
    expect(r.selected?.status).toBe("paused") // the bug: the board's dropdown kept the old value
    expect(r.list[1]).toBe(b)
  })

  it("leaves the selected project alone when another project changed", () => {
    const r = patchProject([a, b], a, 2, { stage: "live" })
    expect(r.list[1].stage).toBe("live")
    expect(r.selected).toBe(a)
  })

  it("copes with nothing selected", () => {
    expect(patchProject([a, b], null, 1, { status: "done" }).selected).toBeNull()
  })

  it("does not change the objects it was given", () => {
    const before = JSON.stringify([a, b])
    patchProject([a, b], a, 1, { status: "paused" })
    expect(JSON.stringify([a, b])).toBe(before)
  })
})
