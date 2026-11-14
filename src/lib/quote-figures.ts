/** n / d rounded half away from zero, d > 0, integers only (the same rule as round_half_away() in server/proposals.php). */
function roundHalfAway(n: number, d: number): number {
  const a = Math.abs(n)
  let q = Math.floor(a / d)
  if ((a % d) * 2 >= d) q += 1
  return n < 0 ? -q : q
}

/**
 * The three figures a client reads on a quote, worked in whole pence exactly as `terms_pence()` in server/proposals.php
 * does: the stored net (`SUM(qty * unit_price)`, up to four decimals) is rounded once to the penny, VAT is that
 * subtotal times the rate in hundredths of a percent, rounded half away from zero, and the total is the sum. One
 * function, so the Quotes list and the shared proposal page cannot disagree with each other or with the invoices.
 */
export function quoteFigures(net: number, vatRate: number): { net: number; vat: number; gross: number } {
  const tenThousandths = Number.isFinite(net) ? Math.round(net * 10000) : 0
  const subtotal = roundHalfAway(tenThousandths, 100)
  const rate = Number.isFinite(vatRate) && vatRate > 0 ? Math.round(vatRate * 100) : 0
  const vat = roundHalfAway(subtotal * rate, 10000)
  return { net: subtotal / 100, vat: vat / 100, gross: (subtotal + vat) / 100 }
}

/** The exact net of a quote's lines in pounds (quantity in hundredths times unit price in pence, summed as integers). */
export function netOfItems(items: { qty: number; unit_price: number }[]): number {
  const exact = items.reduce((sum, it) => sum + Math.round(it.qty * 100) * Math.round(it.unit_price * 100), 0)
  return exact / 10000
}
