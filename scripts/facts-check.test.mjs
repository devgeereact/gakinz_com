import { describe, expect, it } from "vitest"
import { factFor, gapsIn, isOpenFact, scan } from "./facts-check.mjs"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

describe("facts-check", () => {
  it("finds gap markers and the IT pricing line", () => {
    const html = '<p><span class="gap">[legal name to supply]</span> Priced per job, ask for a quote.</p>'
    expect(gapsIn(html)).toEqual(["[legal name to supply]", "Priced per job, ask for a quote."])
  })

  it("tells an open owner fact from an honest note", () => {
    expect(isOpenFact("[VAT basis to supply: included, excluded, or not VAT registered]")).toBe(true)
    expect(isOpenFact("Priced per job, ask for a quote.")).toBe(true)
    expect(isOpenFact("Outcome figures: not measured yet.")).toBe(false)
  })

  it("names the fact each gap waits for", () => {
    expect(factFor("[VAT basis to supply]").fact).toMatch(/VAT/)
    expect(factFor("[hosting provider and data location to supply]").fact).toMatch(/Processors/)
    expect(factFor("[something odd to supply]").fact).toBe("Unclassified placeholder")
  })

  it("flags an invented phone or company number, and ignores the same text inside scripts", () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "facts-"))
    fs.mkdirSync(path.join(d, "contact"))
    fs.writeFileSync(path.join(d, "contact/index.html"), "<p>Call +44 20 0000 0000</p><script>var x='00000000'</script>")
    fs.writeFileSync(path.join(d, "index.html"), "<p>Clean</p><script>var x='00000000'</script>")
    const { invented } = scan(d)
    expect(invented).toEqual([{ route: "/contact", what: "placeholder telephone number" }])
    fs.rmSync(d, { recursive: true })
  })
})
