<?php
/**
 * Invoicing & payments (GAkinzOS §6 Invoicing). Manual mark-as-paid; Stripe is Phase 2.
 *
 *   GET  /invoices.php               → list (with client + total + overdue flag)
 *   GET  /invoices.php?id=N          → one invoice with line items (for PDF)
 *   POST /invoices.php?action=create {client_id?, project_id?, due_at?, notes?, items:[...]}
 *   POST /invoices.php?action=status {id, status}   status: draft | sent | paid
 *
 * Status: draft | sent | paid. `overdue` is computed (sent + past due_at).
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET' && isset($_GET['id'])) {
  require_auth($conn, STAFF); // staff only — clients see invoices via portal.php (own client_id)
  $id = (int)$_GET['id'];
  $stmt = $conn->prepare(
    'SELECT i.id, i.number, i.status, i.currency, i.vat_rate, i.notes, i.issued_at, i.due_at, i.paid_at,
            i.client_id, i.project_id, c.company AS client_company, c.email AS client_email
     FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
     WHERE i.id = ? AND i.deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $inv = $stmt->get_result()->fetch_assoc();
  if (!$inv) fail('Invoice not found.', 404);
  $inv['id'] = (int)$inv['id'];
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
    $stmt = $conn->prepare('UPDATE invoices SET status = ?, paid_at = NULL WHERE id = ? AND deleted_at IS NULL');
    $stmt->bind_param('si', $status, $id);
  }
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Invoice not found.', 404);
  audit($conn, $user['id'], 'invoice_status', "#$id → $status");
  ok(['ok' => true]);
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
