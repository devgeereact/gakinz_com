<?php
/**
 * Invoicing & payments (GAkinzOS §6 Invoicing). Manual mark-as-paid; Stripe is Phase 2.
 *
 *   GET  /invoices.php               → list (with client + total + overdue flag)
 *   GET  /invoices.php?id=N          → one invoice with line items (for PDF)
 *   POST /invoices.php?action=create {client_id?, project_id?, due_at?, notes?, items:[...]}
 *   POST /invoices.php?action=status {id, status}   status: draft | sent | paid
 *   POST /invoices.php?action=record_payment {id, method, reference?, paid_on, amount}
 *        method: bank_transfer | cash | cheque | other. `amount` is in pounds as a
 *        decimal ("119.99" or 119.99) and must equal the payable total. 503 until
 *        SQL 13 (2026-10-18) has run.
 *
 * Status: draft | sent | paid. `overdue` is computed (sent + past due_at).
 */
require __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_money.php';

const STAFF = ['super_admin', 'admin', 'manager'];
const PAYMENT_METHODS = ['bank_transfer', 'cash', 'cheque', 'other'];
const PAYMENT_NEEDS_REFERENCE = ['bank_transfer', 'cheque'];

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

/** The payment columns for a SELECT on alias `i`, or NULL placeholders before SQL 13. */
function payment_cols_sql(mysqli $conn): string {
  return payment_cols_ready($conn)
    ? 'i.paid_method, i.paid_reference, i.paid_amount_pence, i.paid_recorded_by'
    : 'NULL AS paid_method, NULL AS paid_reference, NULL AS paid_amount_pence, NULL AS paid_recorded_by';
}

/** Cast the payment columns of a row in place. */
function payment_cols_cast(array &$r): void {
  $r['paid_amount_pence'] = $r['paid_amount_pence'] !== null ? (int)$r['paid_amount_pence'] : null;
  $r['paid_recorded_by'] = $r['paid_recorded_by'] !== null ? (int)$r['paid_recorded_by'] : null;
}

/**
 * Pence from a pounds amount such as "119.99", 119.99 or "120". Null unless it
 * is a plain non-negative decimal with at most two places. String maths only,
 * so 0.1 + 0.2 style float error never reaches the comparison.
 */
function pence_from_pounds($value): ?int {
  if (is_int($value) || is_float($value)) $value = (string)$value;
  if (!is_string($value)) return null;
  $value = trim($value);
  if (!preg_match('/^(\d{1,7})(?:\.(\d{1,2}))?$/', $value, $m)) return null;
  $fraction = str_pad($m[2] ?? '', 2, '0');
  return (int)$m[1] * 100 + (int)$fraction;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET' && isset($_GET['id'])) {
  require_auth($conn, STAFF); // staff only — clients see invoices via portal.php (own client_id)
  $id = (int)$_GET['id'];
  $stmt = $conn->prepare(
    'SELECT i.id, i.number, i.status, i.currency, i.vat_rate, i.notes, i.issued_at, i.due_at, i.paid_at,
            ' . payment_cols_sql($conn) . ',
            i.client_id, i.project_id, c.company AS client_company, c.email AS client_email
     FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
     WHERE i.id = ? AND i.deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $inv = $stmt->get_result()->fetch_assoc();
  if (!$inv) fail('Invoice not found.', 404);
  $inv['id'] = (int)$inv['id'];
  payment_cols_cast($inv);
  $inv['vat_rate'] = (float)$inv['vat_rate'];

  $items = [];
  $subtotal = 0.0;
  $stmt = $conn->prepare('SELECT id, description, qty, unit_price FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($r = $res->fetch_assoc()) {
    $r['id'] = (int)$r['id'];
    $r['qty'] = (float)$r['qty'];
    $r['unit_price'] = (float)$r['unit_price'];
    $subtotal += $r['qty'] * $r['unit_price'];
    $items[] = $r;
  }
  $inv['items'] = $items;
  $inv['subtotal'] = round($subtotal, 2);
  $inv['vat_amount'] = round($subtotal * $inv['vat_rate'] / 100, 2);
  $inv['total'] = round($inv['subtotal'] + $inv['vat_amount'], 2);
  ok($inv);
}

if ($method === 'GET') {
  require_auth($conn, STAFF); // staff only — clients see invoices via portal.php (own client_id)
  $rows = [];
  $sql = 'SELECT i.id, i.number, i.status, i.currency, i.vat_rate, i.issued_at, i.due_at, i.paid_at,
                 ' . payment_cols_sql($conn) . ',
                 i.client_id, c.company AS client_company,
                 (SELECT COALESCE(SUM(qty * unit_price), 0) FROM invoice_items it WHERE it.invoice_id = i.id) AS subtotal,
                 (i.status = "sent" AND i.due_at IS NOT NULL AND i.due_at < CURRENT_DATE) AS overdue
          FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
          WHERE i.deleted_at IS NULL ORDER BY i.id DESC LIMIT 500';
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
      $r['client_id'] = $r['client_id'] !== null ? (int)$r['client_id'] : null;
      $r['subtotal'] = (float)$r['subtotal'];
      $r['vat_rate'] = (float)$r['vat_rate'];
      $r['vat_amount'] = round($r['subtotal'] * $r['vat_rate'] / 100, 2);
      // `total` is the payable amount (subtotal + VAT). With vat_rate = 0 this
      // equals the subtotal, so pre-VAT invoices are unchanged.
      $r['total'] = round($r['subtotal'] + $r['vat_amount'], 2);
      $r['overdue'] = (bool)$r['overdue'];
      payment_cols_cast($r);
      $rows[] = $r;
    }
  }
  ok($rows);
}

if ($method === 'POST' && $action === 'create') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $clientId = isset($in['client_id']) && $in['client_id'] !== '' ? (int)$in['client_id'] : null;
  $projectId = isset($in['project_id']) && $in['project_id'] !== '' ? (int)$in['project_id'] : null;
  $notes = str_field($in, 'notes', 5000);
  $due = str_field($in, 'due_at', 10);
  $due = $due !== '' ? $due : null;
  $vat = isset($in['vat_rate']) ? max(0, min(100, (float)$in['vat_rate'])) : 0;
  $items = is_array($in['items'] ?? null) ? $in['items'] : [];
  if (count($items) === 0) fail('Add at least one line item.');
  $issued = (new DateTime())->format('Y-m-d');

  $conn->begin_transaction();
  try {
    $stmt = $conn->prepare('INSERT INTO invoices (client_id, project_id, notes, vat_rate, issued_at, due_at) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->bind_param('iisdss', $clientId, $projectId, $notes, $vat, $issued, $due);
    $stmt->execute();
    $iid = $conn->insert_id;

    $number = sprintf('GK-INV-%04d', $iid);
    $upd = $conn->prepare('UPDATE invoices SET number = ? WHERE id = ?');
    $upd->bind_param('si', $number, $iid);
    $upd->execute();

    $stmt = $conn->prepare('INSERT INTO invoice_items (invoice_id, description, qty, unit_price) VALUES (?, ?, ?, ?)');
    foreach ($items as $it) {
      $desc = mb_substr(trim((string)($it['description'] ?? '')), 0, 300);
      if ($desc === '') continue;
      $qty = (float)($it['qty'] ?? 1);
      $price = (float)($it['unit_price'] ?? 0);
      $stmt->bind_param('isdd', $iid, $desc, $qty, $price);
      $stmt->execute();
    }
    $conn->commit();
  } catch (Throwable $e) {
    $conn->rollback();
    fail('Could not create the invoice.', 500);
  }
  audit($conn, $user['id'], 'invoice_create', $number);
  ok(['id' => $iid, 'number' => $number], 201);
}

if ($method === 'POST' && $action === 'status') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $status = str_field($in, 'status', 20);
  if ($id <= 0) fail('An invoice id is required.');
  if (!in_array($status, ['draft', 'sent', 'paid'], true)) fail('Invalid status.');

  if ($status === 'paid') {
    $stmt = $conn->prepare('UPDATE invoices SET status = "paid", paid_at = NOW() WHERE id = ? AND deleted_at IS NULL');
    $stmt->bind_param('i', $id);
  } else {
    // Moving back from paid also forgets any recorded payment (SQL 13 columns).
    $clear = payment_cols_ready($conn)
      ? ', paid_method = NULL, paid_reference = NULL, paid_amount_pence = NULL, paid_recorded_by = NULL'
      : '';
    $stmt = $conn->prepare('UPDATE invoices SET status = ?, paid_at = NULL' . $clear . ' WHERE id = ? AND deleted_at IS NULL');
    $stmt->bind_param('si', $status, $id);
  }
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Invoice not found.', 404);
  audit($conn, $user['id'], 'invoice_status', "#$id → $status");
  ok(['ok' => true]);
}

// Record a payment received outside Stripe and PayPal: bank transfer, cash,
// cheque or other. The owner has checked the money arrived; this records what,
// when and how much. Only a sent invoice, only the exact payable total (a part
// payment is a separate instalment invoice), and only once.
if ($method === 'POST' && $action === 'record_payment') {
  $user = require_auth($conn, STAFF);
  if (!payment_cols_ready($conn)) {
    fail('Recording a payment needs the 2026-10-18 database step (SQL 13) to be run on the server first.', 503);
  }
  $in = body();
  $id = (int)($in['id'] ?? 0);
  if ($id <= 0) fail('An invoice id is required.');

  $payMethod = is_string($in['method'] ?? null) ? trim($in['method']) : '';
  if (!in_array($payMethod, PAYMENT_METHODS, true)) fail('Choose how it was paid: bank transfer, cash, cheque or other.');

  $reference = is_scalar($in['reference'] ?? null) ? trim((string)$in['reference']) : '';
  if (mb_strlen($reference) > 100) fail('The reference must be 100 characters or fewer.');
  if ($reference === '' && in_array($payMethod, PAYMENT_NEEDS_REFERENCE, true)) {
    fail($payMethod === 'cheque' ? 'Enter the cheque number or reference.' : 'Enter the bank transfer reference.');
  }

  $paidOn = is_string($in['paid_on'] ?? null) ? trim($in['paid_on']) : '';
  $date = preg_match('/^\d{4}-\d{2}-\d{2}$/', $paidOn) ? DateTime::createFromFormat('!Y-m-d', $paidOn) : false;
  if (!$date || $date->format('Y-m-d') !== $paidOn) fail('Enter the date it was paid as YYYY-MM-DD.');
  // Same clock as issued_at, which create sets from PHP's own date.
  if ($paidOn > (new DateTime())->format('Y-m-d')) fail('The payment date cannot be in the future.');

  $amountPence = pence_from_pounds($in['amount'] ?? null);
  if ($amountPence === null) fail('Enter the amount received in pounds, for example 120.00.');

  $inv = gk_invoice_payable($conn, $id);
  if (!$inv) fail('Invoice not found.', 404);
  if ($inv['status'] === 'paid') fail('That invoice is already paid.', 409);
  if ($inv['status'] !== 'sent') fail('Send the invoice before recording a payment against it.', 409);
  if ($inv['total_minor'] <= 0) fail('That invoice has nothing to pay.');
  if ($amountPence !== $inv['total_minor']) {
    fail('The amount must be the full invoice total of £' . number_format($inv['total_minor'] / 100, 2)
      . '. Record a part payment as a separate instalment invoice.', 400, ['expected_pence' => $inv['total_minor']]);
  }

  $stmt = $conn->prepare('SELECT issued_at FROM invoices WHERE id = ? LIMIT 1');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $issued = (string)($stmt->get_result()->fetch_assoc()['issued_at'] ?? '');
  if ($issued !== '' && $paidOn < $issued) fail('The payment date cannot be before the invoice was issued (' . $issued . ').');

  $refOrNull = $reference !== '' ? $reference : null;
  $paidAt = $paidOn . ' 00:00:00';
  // Conditional on the status, so two parallel records cannot both succeed:
  // `<> "paid"` is the single-use guard, and `= "sent"` also refuses an invoice
  // moved back to draft between the checks above and this write.
  $stmt = $conn->prepare(
    'UPDATE invoices SET status = "paid", paid_at = ?, paid_method = ?, paid_reference = ?,
            paid_amount_pence = ?, paid_recorded_by = ?
     WHERE id = ? AND status <> "paid" AND status = "sent" AND deleted_at IS NULL'
  );
  $stmt->bind_param('sssiii', $paidAt, $payMethod, $refOrNull, $amountPence, $user['id'], $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) {
    $now = gk_invoice_payable($conn, $id);
    if ($now && $now['status'] === 'paid') fail('That invoice is already paid.', 409);
    fail('That invoice changed while the payment was being recorded. Refresh and try again.', 409);
  }

  $num = $inv['number'] ?: ('#' . $id);
  audit($conn, $user['id'], 'invoice_paid_manual',
    "$num $payMethod " . ($refOrNull ?? '-') . ' £' . number_format($amountPence / 100, 2) . " on $paidOn");
  ok([
    'ok' => true,
    'id' => $id,
    'status' => 'paid',
    'paid_at' => $paidAt,
    'paid_method' => $payMethod,
    'paid_reference' => $refOrNull,
    'paid_amount_pence' => $amountPence,
  ]);
}

// Chase an unpaid invoice: email the client a payment reminder and log it.
// Needs SMTP configured + a client email; otherwise returns a clear 503/400.
if ($method === 'POST' && $action === 'chase') {
  $user = require_auth($conn, STAFF);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('An invoice id is required.');
  $stmt = $conn->prepare(
    'SELECT i.number, i.status, i.due_at, c.company, c.email,
            (SELECT COALESCE(SUM(qty*unit_price),0) FROM invoice_items it WHERE it.invoice_id = i.id) AS subtotal, i.vat_rate
     FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
     WHERE i.id = ? AND i.deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $inv = $stmt->get_result()->fetch_assoc();
  if (!$inv) fail('Invoice not found.', 404);
  if ($inv['status'] === 'paid') fail('That invoice is already paid.');
  if (empty($inv['email'])) fail('That client has no email address on file.');
  if (empty($GLOBALS['SMTP_HOST'])) fail('Email is not configured on the server.', 503);

  $total = round((float)$inv['subtotal'] * (1 + (float)$inv['vat_rate'] / 100), 2);
  $num = $inv['number'] ?: ('#' . $id);
  $due = $inv['due_at'] ?: 'now';
  $body = "Hello {$inv['company']},\n\nThis is a friendly reminder that invoice $num for £" . number_format($total, 2)
        . " was due on $due and is currently unpaid.\n\nPlease arrange payment at your earliest convenience. "
        . "If you have already paid, thank you — please disregard this note.\n\nKind regards,\nGAkinz";
  require_once __DIR__ . '/_smtp.php';
  $sent = gk_send_email(['to' => $inv['email'], 'subject' => "Payment reminder — invoice $num", 'body' => $body]);
  if (empty($sent['ok'])) {
    error_log('GAkinz invoice chase (smtp): ' . ($sent['error'] ?? 'unknown error'));
    fail('Could not send the reminder. Please try again.', 502);
  }
  audit($conn, $user['id'], 'invoice_chase', "$num → {$inv['email']}");
  ok(['ok' => true, 'sent_to' => $inv['email']]);
}

fail('Method not allowed.', 405);
