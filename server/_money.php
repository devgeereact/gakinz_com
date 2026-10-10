<?php
/**
 * One definition of what an invoice costs. Included by payments.php so the
 * amount sent to a payment provider is the same payable total that
 * invoices.php, portal.php and the PDF show:
 *
 *   subtotal   = round(sum(qty * unit_price), 2)
 *   vat_amount = round(subtotal * vat_rate / 100, 2)
 *   total      = round(subtotal + vat_amount, 2)      ← what the client pays
 *
 * Before this existed the Stripe link charged the ex-VAT subtotal and the
 * webhook then marked the whole invoice paid, so VAT was silently lost
 * (plan finding A25).
 */

/** Payable figures for one invoice, or null if it does not exist. */
function gk_invoice_payable(mysqli $conn, int $invoiceId): ?array {
  $stmt = $conn->prepare(
    'SELECT i.id, i.number, i.status, i.currency, i.vat_rate,
            c.email AS client_email, c.company AS client_company,
            (SELECT COALESCE(SUM(qty * unit_price), 0) FROM invoice_items it WHERE it.invoice_id = i.id) AS subtotal
     FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
     WHERE i.id = ? AND i.deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('i', $invoiceId);
  $stmt->execute();
  $inv = $stmt->get_result()->fetch_assoc();
  if (!$inv) return null;

  $subtotal = round((float)$inv['subtotal'], 2);
  $vatRate  = (float)$inv['vat_rate'];
  $vat      = round($subtotal * $vatRate / 100, 2);
  $total    = round($subtotal + $vat, 2);

  return [
    'id'             => (int)$inv['id'],
    'number'         => $inv['number'],
    'status'         => $inv['status'],
    'currency'       => strtolower($inv['currency'] ?: 'gbp'),
    'client_email'   => $inv['client_email'],
    'client_company' => $inv['client_company'],
    'subtotal'       => $subtotal,
    'vat_rate'       => $vatRate,
    'vat_amount'     => $vat,
    'total'          => $total,
    // Smallest currency unit (pence). Integer maths from here on.
    'total_minor'    => (int)round($total * 100),
  ];
}

/** Pence from a provider's decimal amount string such as "120.00". */
function gk_minor_from_decimal(string $value): int {
  return (int)round(((float)$value) * 100);
}
