import { describe, expect, it } from "vitest"
import { idParam, invoicingLink, leadsLink, projectsLink, recordElementId } from "./deepLink"

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
