import { describe, expect, it } from "vitest"
import { quoteFigures } from "./quote-figures"

describe("quoteFigures", () => {
  it("splits a quote into net, VAT and what the client pays", () => {
    expect(quoteFigures(1000, 20)).toEqual({ net: 1000, vat: 200, gross: 1200 })
  })
  it("rounds VAT to the penny, then adds, as the invoices do", () => {
    expect(quoteFigures(33.33, 20)).toEqual({ net: 33.33, vat: 6.67, gross: 40 })
    expect(quoteFigures(0.1 + 0.2, 20)).toEqual({ net: 0.3, vat: 0.06, gross: 0.36 })
  })
  it("has no VAT at a zero or missing rate", () => {
    expect(quoteFigures(500, 0)).toEqual({ net: 500, vat: 0, gross: 500 })
    expect(quoteFigures(500, Number.NaN)).toEqual({ net: 500, vat: 0, gross: 500 })
  })
})
