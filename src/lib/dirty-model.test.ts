import { describe, expect, it } from "vitest"
import { dirtyKeys, isDirty } from "./dirty-model"

describe("isDirty", () => {
  it("is clean when the values match the saved baseline", () => {
    expect(isDirty({ title: "A", n: 1 }, { title: "A", n: 1 })).toBe(false)
  })

  it("is dirty after any field edit, including a trailing space", () => {
    expect(isDirty({ title: "A " }, { title: "A" })).toBe(true)
  })

  it("ignores key order", () => {
    expect(isDirty({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(false)
  })

  it("treats a missing key and undefined alike, but not null", () => {
    expect(isDirty({ a: 1, b: undefined }, { a: 1 })).toBe(false)
    expect(isDirty({ a: 1, b: null }, { a: 1 })).toBe(true)
  })

  it("compares arrays by length and item, in order", () => {
    const base = { lines: [{ d: "x", q: "1" }] }
    expect(isDirty({ lines: [{ d: "x", q: "1" }] }, base)).toBe(false)
    expect(isDirty({ lines: [{ d: "x", q: "2" }] }, base)).toBe(true)
    expect(isDirty({ lines: [{ d: "x", q: "1" }, { d: "", q: "1" }] }, base)).toBe(true)
    expect(isDirty({ lines: [] }, base)).toBe(true)
  })

  it("does not confuse an array with an object or a number with its string", () => {
    expect(isDirty([], {})).toBe(true)
    expect(isDirty({ n: 1 }, { n: "1" })).toBe(true)
  })

  it("goes clean again once the baseline is replaced by the saved values", () => {
    const edited = { title: "New" }
    let baseline = { title: "Old" }
    expect(isDirty(edited, baseline)).toBe(true)
    baseline = { ...edited } // what a successful save does
    expect(isDirty(edited, baseline)).toBe(false)
  })
})

describe("dirtyKeys", () => {
  it("lists only the changed keys", () => {
    expect(dirtyKeys({ a: 1, b: [1], c: "x" }, { a: 1, b: [2], c: "y" })).toEqual(["b", "c"])
  })
  it("is empty when nothing changed", () => {
    expect(dirtyKeys({ a: 1 }, { a: 1 })).toEqual([])
  })
})
