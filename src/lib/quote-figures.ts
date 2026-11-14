const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/**
 * The three figures a client reads on a quote. `net` is the stored ex-VAT total, VAT is rounded to the penny
 * (as proposals.php does for each invoice it creates), and `gross` is what the client pays. One function, so
 * the Quotes list and the shared proposal page cannot disagree.
 */
export function quoteFigures(net: number, vatRate: number): { net: number; vat: number; gross: number } {
  const n = round2(Number.isFinite(net) ? net : 0)
  const rate = Number.isFinite(vatRate) && vatRate > 0 ? vatRate : 0
  const vat = round2((n * rate) / 100)
  return { net: n, vat, gross: round2(n + vat) }
}
