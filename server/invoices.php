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
  require_auth($conn);
  $id = (int)$_GET['id'];
  $stmt = $conn->prepare(
    'SELECT i.id, i.number, i.status, i.currency, i.notes, i.issued_at, i.due_at, i.paid_at,
            i.client_id, i.project_id, c.company AS client_company, c.email AS client_email
     FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
     WHERE i.id = ? AND i.deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $inv = $stmt->get_result()->fetch_assoc();
  if (!$inv) fail('Invoice not found.', 404);
  $inv['id'] = (int)$inv['id'];

  $items = [];
  $stmt = $conn->prepare('SELECT id, description, qty, unit_price FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($r = $res->fetch_assoc()) {
    $r['id'] = (int)$r['id'];
    $r['qty'] = (float)$r['qty'];
    $r['unit_price'] = (float)$r['unit_price'];
    $items[] = $r;
  }
  $inv['items'] = $items;
  ok($inv);
}

if ($method === 'GET') {
  require_auth($conn);
  $rows = [];
  $sql = 'SELECT i.id, i.number, i.status, i.currency, i.issued_at, i.due_at, i.paid_at,
                 i.client_id, c.company AS client_company,
                 (SELECT COALESCE(SUM(qty * unit_price), 0) FROM invoice_items it WHERE it.invoice_id = i.id) AS total,
                 (i.status = "sent" AND i.due_at IS NOT NULL AND i.due_at < CURRENT_DATE) AS overdue
          FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
          WHERE i.deleted_at IS NULL ORDER BY i.id DESC LIMIT 500';
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
      $r['client_id'] = $r['client_id'] !== null ? (int)$r['client_id'] : null;
      $r['total'] = (float)$r['total'];
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
  $items = is_array($in['items'] ?? null) ? $in['items'] : [];
  if (count($items) === 0) fail('Add at least one line item.');
  $issued = (new DateTime())->format('Y-m-d');

  $conn->begin_transaction();
  try {
    $stmt = $conn->prepare('INSERT INTO invoices (client_id, project_id, notes, issued_at, due_at) VALUES (?, ?, ?, ?, ?)');
    $stmt->bind_param('iisss', $clientId, $projectId, $notes, $issued, $due);
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

fail('Method not allowed.', 405);
