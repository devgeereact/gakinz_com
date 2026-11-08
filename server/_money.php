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
 * (K-025).
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

/**
 * True once the SQL 13 payment columns exist on `invoices`. Until that schema
 * step runs, every existing action works as before and record_payment answers
 * 503. Cached for the request.
 */
function payment_cols_ready(mysqli $conn): bool {
  static $ready = null;
  if ($ready !== null) return $ready;
  try {
    // LIMIT 0 reads no rows; it only proves the columns are there.
    $res = $conn->query('SELECT paid_method, paid_reference, paid_amount_pence, paid_recorded_by FROM invoices LIMIT 0');
    $ready = $res !== false; // older mysqli reporting returns false instead of throwing
  } catch (mysqli_sql_exception $e) {
    if ($e->getCode() !== 1054) throw $e; // ER_BAD_FIELD_ERROR only
    $ready = false;
  }
  return $ready;
}

/**
 * The one way an invoice becomes paid by a provider or by the quick "mark paid" (K-131). Every such path
 * records the same evidence: paid_at, the method, the provider's or bank's reference when there is one, the
 * amount in pence, and who recorded it (NULL for a provider). A draft can be paid here on purpose: the owner's
 * flow is quote accepted, draft deposit invoice, Stripe link, webhook (tests/server/journey.test.ts), and money
 * that really arrived must be recorded. (record_payment keeps its own, stricter rule: a sent invoice only.)
 * The conditional UPDATE means two parallel calls cannot both succeed.
 *
 * Returns true when THIS call paid it, false when it was already paid (or gone): the caller decides what that
 * means. On a database without the SQL 13 columns it records status and paid_at.
 */
function gk_mark_invoice_paid(mysqli $conn, int $invoiceId, string $method, ?string $reference, int $amountPence, ?int $recordedBy): bool {
  if (payment_cols_ready($conn)) {
    $stmt = $conn->prepare(
      'UPDATE invoices SET status = "paid", paid_at = NOW(), paid_method = ?, paid_reference = ?, paid_amount_pence = ?, paid_recorded_by = ?
       WHERE id = ? AND status <> "paid" AND deleted_at IS NULL'
    );
    $stmt->bind_param('ssiii', $method, $reference, $amountPence, $recordedBy, $invoiceId);
  } else {
    $stmt = $conn->prepare('UPDATE invoices SET status = "paid", paid_at = NOW() WHERE id = ? AND status <> "paid" AND deleted_at IS NULL');
    $stmt->bind_param('i', $invoiceId);
  }
  $stmt->execute();
  return $stmt->affected_rows > 0;
}
