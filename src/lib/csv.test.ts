import { describe, expect, it } from "vitest"
import * as XLSX from "xlsx"
import { toCsv } from "./csv"

// K-030: an enquiry typed into the public form can start with a
// spreadsheet formula. Exported cells must open as text, not run.
describe("toCsv formula neutralising", () => {
  it.each(["=HYPERLINK(\"http://x\",\"y\")", "+SUM(1,1)", "-2+3", "@cmd", "\tleading tab", "\rleading cr"])(
    "prefixes %j with an apostrophe",
    (v) => {
      const csv = toCsv(["msg"], [{ msg: v }])
      expect(csv.split("\r\n")[1]).toBe(`"'${v.replace(/"/g, '""')}"`)
    },
  )

  it("leaves ordinary text and real numbers alone", () => {
    const csv = toCsv(["a", "b", "c", "d"], [{ a: "Hello", b: -12.5, c: "-40.00", d: 7 }])
    expect(csv.split("\r\n")[1]).toBe('"Hello","-12.5","-40.00","7"')
  })
})

describe("xlsx export", () => {
  it("stores formula-like strings as text cells, not formulas", () => {
    const ws = XLSX.utils.aoa_to_sheet([["=1+1"]])
    expect(ws.A1.t).toBe("s")
    expect(ws.A1.f).toBeUndefined()
  })
})
