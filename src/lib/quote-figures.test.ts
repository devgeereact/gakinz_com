import { describe, expect, it } from "vitest"
import { netOfItems, quoteFigures } from "./quote-figures"

describe("quoteFigures", () => {
  it("splits a quote into net, VAT and what the client pays", () => {
    expect(quoteFigures(1000, 20)).toEqual({ net: 1000, vat: 200, gross: 1200 })
  })
  it("rounds half pennies up, as proposals.php does (the cases a float version got wrong)", () => {
    expect(quoteFigures(42.7, 5)).toEqual({ net: 42.7, vat: 2.14, gross: 44.84 }) // 2.135 exactly
    expect(quoteFigures(17.08, 12.5)).toEqual({ net: 17.08, vat: 2.14, gross: 19.22 }) // 2.135 exactly
    expect(quoteFigures(12.2, 17.5)).toEqual({ net: 12.2, vat: 2.14, gross: 14.34 }) // 2.135 exactly
    expect(quoteFigures(33.33, 20)).toEqual({ net: 33.33, vat: 6.67, gross: 40 })
  })
  it("rounds the stored four-decimal net once, half up (qty 0.5 x 4.27 = 2.1350)", () => {
    expect(quoteFigures(2.135, 0)).toEqual({ net: 2.14, vat: 0, gross: 2.14 })
    expect(quoteFigures(0.1 + 0.2, 20)).toEqual({ net: 0.3, vat: 0.06, gross: 0.36 })
  })
  it("has no VAT at a zero or missing rate", () => {
    expect(quoteFigures(500, 0)).toEqual({ net: 500, vat: 0, gross: 500 })
    expect(quoteFigures(500, Number.NaN)).toEqual({ net: 500, vat: 0, gross: 500 })
  })
})

describe("netOfItems", () => {
  it("sums quantity times price exactly, so 0.5 x 4.27 is 2.135 and not 2.1349999", () => {
    expect(netOfItems([{ qty: 0.5, unit_price: 4.27 }])).toBe(2.135)
    expect(netOfItems([{ qty: 3, unit_price: 19.99 }, { qty: 1.25, unit_price: 80 }])).toBe(159.97)
    expect(netOfItems([])).toBe(0)
  })
})
