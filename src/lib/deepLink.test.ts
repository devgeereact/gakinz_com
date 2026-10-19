import { describe, expect, it } from "vitest"
import {
  LINK_NONCE,
  idParam,
  invoicingLink,
  isNewLink,
  leadsLink,
  linkMark,
  linkNavigationState,
  linkNonce,
  linkRevision,
  projectsLink,
  recordElementId,
} from "./deepLink"

const p = (q: string) => new URLSearchParams(q)

describe("idParam", () => {
  it("reads a positive integer id", () => {
    expect(idParam(p("invoice=42"), "invoice")).toBe(42)
  })
  it("ignores anything that is not a plain positive id", () => {
    for (const v of ["", "0", "-3", "007", "4.5", "12abc", "1e3", " 7", "99999999999", "2147483648"]) {
      expect(idParam(p(`x=${encodeURIComponent(v)}`), "x")).toBeNull()
    }
    expect(idParam(p(""), "x")).toBeNull()
    expect(idParam(p("x=2147483647"), "x")).toBe(2147483647)
  })
})

describe("projectsLink", () => {
  it("reads the project and the task or asset in it", () => {
    expect(projectsLink(p("project=3&task=9"))).toEqual({ project: 3, task: 9, asset: null })
    expect(projectsLink(p("project=3&asset=5"))).toEqual({ project: 3, task: null, asset: 5 })
  })
  it("ignores a task or asset without a valid project", () => {
    expect(projectsLink(p("task=9&asset=5"))).toEqual({ project: null, task: null, asset: null })
    expect(projectsLink(p("project=abc&task=9"))).toEqual({ project: null, task: null, asset: null })
  })
})

describe("invoicingLink", () => {
  it("reads the invoice id or nothing", () => {
    expect(invoicingLink(p("invoice=12"))).toEqual({ invoice: 12 })
    expect(invoicingLink(p("invoice=x"))).toEqual({ invoice: null })
  })
})

describe("leadsLink", () => {
  it("reads an enquiry on the board, keeping the due filter", () => {
    expect(leadsLink(p("due=1&enquiry=8"))).toEqual({ enquiry: 8, call: null })
  })
  it("reads a call only in the Calls view", () => {
    expect(leadsLink(p("view=calls&call=4"))).toEqual({ enquiry: null, call: 4 })
    expect(leadsLink(p("call=4"))).toEqual({ enquiry: null, call: null })
    expect(leadsLink(p("view=calls&enquiry=8"))).toEqual({ enquiry: null, call: null })
  })
})

it("gives each linked record a stable element id", () => {
  expect(recordElementId("invoice", 12)).toBe("record-invoice-12")
})

describe("linkMark and linkNonce", () => {
  it("describes a link by its set ids, whatever order they were read in", () => {
    expect(linkMark({ task: 9, project: 3, asset: null }, null)).toEqual({ value: "project=3&task=9", nonce: null })
    expect(linkMark({ project: 3, task: 9 }, undefined).value).toBe(linkMark({ task: 9, project: 3 }, undefined).value)
    expect(linkMark({ invoice: null }, null).value).toBe("")
  })
  it("reads the nonce only from a non-empty string under its own key", () => {
    expect(linkNonce({ [LINK_NONCE]: "a1" })).toBe("a1")
    for (const state of [null, undefined, "a1", 7, {}, { [LINK_NONCE]: "" }, { [LINK_NONCE]: 5 }, { other: "a1" }]) {
      expect(linkNonce(state)).toBeNull()
    }
  })
  it("gives every search navigation a different nonce", () => {
    const a = linkNonce(linkNavigationState())
    const b = linkNonce(linkNavigationState())
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    expect(a).not.toBe(b)
  })
})

describe("isNewLink", () => {
  const m = (value: string, nonce: string | null = null) => ({ value, nonce })

  it("applies the first link on the screen, and never an empty one", () => {
    expect(isNewLink(null, m("enquiry=8"))).toBe(true)
    expect(isNewLink(null, m(""))).toBe(false)
    expect(isNewLink(null, m("", "n1"))).toBe(false)
  })
  it("applies a different link while the screen stays open", () => {
    expect(isNewLink(m("enquiry=8"), m("enquiry=9"))).toBe(true)
    expect(isNewLink(m("project=3&task=9"), m("project=3&asset=5"))).toBe(true)
  })
  it("does not re-apply the same link on a re-render or a filter change without a nonce", () => {
    expect(isNewLink(m("enquiry=8", "n1"), m("enquiry=8", "n1"))).toBe(false)
    expect(isNewLink(m("enquiry=8", "n1"), m("enquiry=8"))).toBe(false)
    expect(isNewLink(m("enquiry=8"), m("enquiry=8"))).toBe(false)
  })
  it("re-applies the same link when the search sends it again with a fresh nonce", () => {
    expect(isNewLink(m("enquiry=8"), m("enquiry=8", "n1"))).toBe(true)
    expect(isNewLink(m("enquiry=8", "n1"), m("enquiry=8", "n2"))).toBe(true)
  })
  it("keeps the last link through an empty one, so leaving a view and coming back is not new", () => {
    let last = m("enquiry=8")
    const sequence = [m(""), m("enquiry=8")]
    const applied = sequence.map((next) => {
      const yes = isNewLink(last, next)
      if (yes) last = next
      return yes
    })
    expect(applied).toEqual([false, false])
  })
  it("keys a scroll by link and nonce", () => {
    expect(linkRevision(m("invoice=4"))).not.toBe(linkRevision(m("invoice=4", "n1")))
    expect(linkRevision(m("invoice=4", "n1"))).toBe(linkRevision(m("invoice=4", "n1")))
  })
})
