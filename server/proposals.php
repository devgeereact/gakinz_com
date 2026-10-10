<?php
/**
 * Proposals & quotes (GAkinzOS §6 Proposals). Protected.
 *
 *   GET  /proposals.php              → list (with client + computed total)
 *   GET  /proposals.php?id=N         → one proposal with its line items
 *   POST /proposals.php?action=create {client_id?, title, valid_until?, notes?, items:[{description,qty,unit_price}]}
 *   POST /proposals.php?action=status {id, status}    status: sent | declined | draft
 *   POST /proposals.php?action=accept {id}            → mark accepted + create a project
 *
 * Status: draft | sent | accepted | declined
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager', 'editor'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── Public read-only view by share token (no auth). Records a view. ──────────
if ($method === 'GET' && isset($_GET['token'])) {
  $token = preg_replace('/[^a-f0-9]/', '', (string)$_GET['token']);
  if ($token === '') fail('Invalid link.', 404);
  $stmt = $conn->prepare(
    'SELECT p.id, p.title, p.status, p.currency, p.vat_rate, p.notes, p.valid_until,
            c.company AS client_company
     FROM proposals p LEFT JOIN clients c ON c.id = p.client_id
     WHERE p.share_token = ? AND p.deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('s', $token);
  $stmt->execute();
  $p = $stmt->get_result()->fetch_assoc();
  if (!$p) fail('This proposal link is invalid or has expired.', 404);
  $p['id'] = (int)$p['id'];
  $p['vat_rate'] = (float)$p['vat_rate'];

  $items = [];
  $stmt = $conn->prepare('SELECT description, qty, unit_price FROM proposal_items WHERE proposal_id = ? ORDER BY id ASC');
  $stmt->bind_param('i', $p['id']);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($r = $res->fetch_assoc()) {
    $r['qty'] = (float)$r['qty'];
    $r['unit_price'] = (float)$r['unit_price'];
    $items[] = $r;
  }
  $p['items'] = $items;

  // Record the view (best-effort).
  $upd = $conn->prepare('UPDATE proposals SET views = views + 1, last_viewed_at = NOW() WHERE id = ?');
  $upd->bind_param('i', $p['id']);
  $upd->execute();

  ok($p);
}

if ($method === 'GET' && isset($_GET['id'])) {
  require_auth($conn, STAFF); // staff only
  $id = (int)$_GET['id'];
  $stmt = $conn->prepare(
    'SELECT p.id, p.title, p.status, p.currency, p.vat_rate, p.notes, p.valid_until, p.client_id, p.project_id,
            c.company AS client_company, p.created_at
     FROM proposals p LEFT JOIN clients c ON c.id = p.client_id
     WHERE p.id = ? AND p.deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $p = $stmt->get_result()->fetch_assoc();
  if (!$p) fail('Proposal not found.', 404);
  $p['id'] = (int)$p['id'];
  $p['vat_rate'] = (float)$p['vat_rate'];

  $items = [];
  $stmt = $conn->prepare('SELECT id, description, qty, unit_price FROM proposal_items WHERE proposal_id = ? ORDER BY id ASC');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($r = $res->fetch_assoc()) {
    $r['id'] = (int)$r['id'];
    $r['qty'] = (float)$r['qty'];
    $r['unit_price'] = (float)$r['unit_price'];
    $items[] = $r;
  }
  $p['items'] = $items;
  ok($p);
}

if ($method === 'GET') {
  require_auth($conn, STAFF); // staff only
  $rows = [];
  $sql = 'SELECT p.id, p.title, p.status, p.currency, p.vat_rate, p.share_token, p.views, p.last_viewed_at,
                 p.valid_until, p.client_id, p.project_id,
                 c.company AS client_company, p.created_at,
                 (SELECT COALESCE(SUM(qty * unit_price), 0) FROM proposal_items i WHERE i.proposal_id = p.id) AS total
          FROM proposals p LEFT JOIN clients c ON c.id = p.client_id
          WHERE p.deleted_at IS NULL ORDER BY p.id DESC LIMIT 500';
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
      $r['client_id'] = $r['client_id'] !== null ? (int)$r['client_id'] : null;
      $r['project_id'] = $r['project_id'] !== null ? (int)$r['project_id'] : null;
      $r['vat_rate'] = (float)$r['vat_rate'];
      $r['views'] = (int)($r['views'] ?? 0);
      $r['total'] = (float)$r['total'];
      $rows[] = $r;
    }
  }
  ok($rows);
}

if ($method === 'POST' && $action === 'create') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $title = str_field($in, 'title', 200);
  if ($title === '') fail('A title is required.');
  $clientId = isset($in['client_id']) && $in['client_id'] !== '' ? (int)$in['client_id'] : null;
  $notes = str_field($in, 'notes', 5000);
  $valid = str_field($in, 'valid_until', 10);
  $valid = $valid !== '' ? $valid : null;
  $vat = isset($in['vat_rate']) ? max(0, min(100, (float)$in['vat_rate'])) : 0;
  $items = is_array($in['items'] ?? null) ? $in['items'] : [];
  if (count($items) === 0) fail('Add at least one line item.');

  $conn->begin_transaction();
  try {
    $stmt = $conn->prepare('INSERT INTO proposals (client_id, title, notes, vat_rate, valid_until) VALUES (?, ?, ?, ?, ?)');
    $stmt->bind_param('issds', $clientId, $title, $notes, $vat, $valid);
    $stmt->execute();
    $pid = $conn->insert_id;

    $stmt = $conn->prepare('INSERT INTO proposal_items (proposal_id, description, qty, unit_price) VALUES (?, ?, ?, ?)');
    foreach ($items as $it) {
      $desc = mb_substr(trim((string)($it['description'] ?? '')), 0, 300);
      if ($desc === '') continue;
      $qty = (float)($it['qty'] ?? 1);
      $price = (float)($it['unit_price'] ?? 0);
      $stmt->bind_param('isdd', $pid, $desc, $qty, $price);
      $stmt->execute();
    }
    $conn->commit();
  } catch (Throwable $e) {
    $conn->rollback();
    fail('Could not create the proposal.', 500);
  }
  audit($conn, $user['id'], 'proposal_create', $title);
  ok(['id' => $pid], 201);
}

if ($method === 'POST' && $action === 'status') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $status = str_field($in, 'status', 20);
  if ($id <= 0) fail('A proposal id is required.');
  if (!in_array($status, ['draft', 'sent', 'declined'], true)) fail('Invalid status.');
  $stmt = $conn->prepare('SELECT status FROM proposals WHERE id = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $cur = $stmt->get_result()->fetch_assoc();
  if (!$cur) fail('Proposal not found.', 404);
  // An accepted quote has a project and invoices behind it; its terms are fixed.
  if ($cur['status'] === 'accepted') fail('This quote has been accepted. Create a new quote for changed terms.', 409);
  $stmt = $conn->prepare('UPDATE proposals SET status = ? WHERE id = ? AND deleted_at IS NULL AND status <> "accepted"');
  $stmt->bind_param('si', $status, $id);
  $stmt->execute();
  audit($conn, $user['id'], 'proposal_status', "#$id → $status");
  ok(['ok' => true]);
}

if ($method === 'POST' && $action === 'accept') {
  $user = require_auth($conn, STAFF);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('A proposal id is required.');

  $stmt = $conn->prepare('SELECT title, client_id, project_id, status, vat_rate, valid_until, valid_until < CURRENT_DATE AS expired FROM proposals WHERE id = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $p = $stmt->get_result()->fetch_assoc();
  if (!$p) fail('Proposal not found.', 404);
  if ($p['project_id']) ok(['ok' => true, 'project_id' => (int)$p['project_id'], 'existing' => true]);
  // Only a quote the client has actually been sent can be accepted (plan A27).
  if ($p['status'] !== 'sent') fail('Only a sent quote can be accepted. Mark it as sent first.', 409);
  if (!empty($p['expired'])) fail('This quote expired on ' . $p['valid_until'] . '. Extend its validity before accepting.', 409);

  // Proposal subtotal (ex VAT) drives the 40/30/30 payment schedule.
  $stmt = $conn->prepare('SELECT COALESCE(SUM(qty * unit_price), 0) AS subtotal FROM proposal_items WHERE proposal_id = ?');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $subtotal = (float)$stmt->get_result()->fetch_assoc()['subtotal'];
  $vat = (float)$p['vat_rate'];

  $conn->begin_transaction();
  try {
    // Claim the quote first. The guarded UPDATE takes the row lock, so a
    // concurrent request waits, then matches nothing and returns the project
    // this request created (plan A12). Exactly one request converts.
    $claim = $conn->prepare('UPDATE proposals SET status = "accepted" WHERE id = ? AND status = "sent" AND project_id IS NULL AND deleted_at IS NULL');
    $claim->bind_param('i', $id);
    $claim->execute();
    if ($claim->affected_rows !== 1) {
      $conn->rollback();
      $stmt = $conn->prepare('SELECT project_id FROM proposals WHERE id = ? LIMIT 1');
      $stmt->bind_param('i', $id);
      $stmt->execute();
      $existing = (int)($stmt->get_result()->fetch_assoc()['project_id'] ?? 0);
      if ($existing > 0) ok(['ok' => true, 'project_id' => $existing, 'existing' => true]);
      fail('This quote is no longer open for acceptance.', 409);
    }

    $title = $p['title'];
    $clientId = $p['client_id'] !== null ? (int)$p['client_id'] : null;
    $stmt = $conn->prepare('INSERT INTO projects (name, client_id, status) VALUES (?, ?, "in_progress")');
    $stmt->bind_param('si', $title, $clientId);
    $stmt->execute();
    $projectId = $conn->insert_id;

    $stmt = $conn->prepare('UPDATE proposals SET project_id = ? WHERE id = ?');
    $stmt->bind_param('ii', $projectId, $id);
    $stmt->execute();

    // 40 / 30 / 30 payment schedule. Deposit due on acceptance, stage +30d,
    // final +60d. Final portion absorbs rounding so the parts sum to the whole.
    $deposit = round($subtotal * 0.40, 2);
    $stage   = round($subtotal * 0.30, 2);
    $final   = round($subtotal - $deposit - $stage, 2);
    $today   = new DateTime();
    $plan = [
      ['label' => 'Deposit (40%)',      'amount' => $deposit, 'due' => (clone $today)],
      ['label' => 'Stage payment (30%)','amount' => $stage,   'due' => (clone $today)->modify('+30 days')],
      ['label' => 'Final payment (30%)','amount' => $final,   'due' => (clone $today)->modify('+60 days')],
    ];
    $issued = $today->format('Y-m-d');
    $schedule = [];

    $insInv  = $conn->prepare('INSERT INTO invoices (client_id, project_id, vat_rate, issued_at, due_at) VALUES (?, ?, ?, ?, ?)');
    $setNum  = $conn->prepare('UPDATE invoices SET number = ? WHERE id = ?');
    $insItem = $conn->prepare('INSERT INTO invoice_items (invoice_id, description, qty, unit_price) VALUES (?, ?, 1, ?)');
    foreach ($plan as $part) {
      $due = $part['due']->format('Y-m-d');
      $insInv->bind_param('iidss', $clientId, $projectId, $vat, $issued, $due);
      $insInv->execute();
      $iid = $conn->insert_id;
      $number = sprintf('GK-INV-%04d', $iid);
      $setNum->bind_param('si', $number, $iid);
      $setNum->execute();
      $desc = $part['label'] . ' — ' . $title;
      $amt  = $part['amount'];
      $insItem->bind_param('isd', $iid, $desc, $amt);
      $insItem->execute();
      $schedule[] = ['id' => $iid, 'number' => $number, 'label' => $part['label'], 'amount' => $amt, 'due_at' => $due];
    }
    $conn->commit();
  } catch (Throwable $e) {
    $conn->rollback();
    fail('Could not accept the proposal.', 500);
  }
  audit($conn, $user['id'], 'proposal_accept', "#$id → project #$projectId + 3 invoices (40/30/30)");
  ok(['ok' => true, 'project_id' => $projectId, 'invoices' => $schedule]);
}

// Issue (or reuse) a public share token for a read-only proposal link.
if ($method === 'POST' && $action === 'share') {
  $user = require_auth($conn, STAFF);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('A proposal id is required.');
  $stmt = $conn->prepare('SELECT share_token FROM proposals WHERE id = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  if (!$row) fail('Proposal not found.', 404);
  $token = $row['share_token'] ?: bin2hex(random_bytes(20));
  if (!$row['share_token']) {
    $upd = $conn->prepare('UPDATE proposals SET share_token = ? WHERE id = ?');
    $upd->bind_param('si', $token, $id);
    $upd->execute();
  }
  audit($conn, $user['id'], 'proposal_share', "#$id");
  ok(['token' => $token]);
}

fail('Method not allowed.', 405);
