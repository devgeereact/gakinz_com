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

if ($method === 'GET' && isset($_GET['id'])) {
  require_auth($conn, STAFF); // staff only
  $id = (int)$_GET['id'];
  $stmt = $conn->prepare(
    'SELECT p.id, p.title, p.status, p.currency, p.notes, p.valid_until, p.client_id, p.project_id,
            c.company AS client_company, p.created_at
     FROM proposals p LEFT JOIN clients c ON c.id = p.client_id
     WHERE p.id = ? AND p.deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $p = $stmt->get_result()->fetch_assoc();
  if (!$p) fail('Proposal not found.', 404);
  $p['id'] = (int)$p['id'];

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
  $sql = 'SELECT p.id, p.title, p.status, p.currency, p.valid_until, p.client_id, p.project_id,
                 c.company AS client_company, p.created_at,
                 (SELECT COALESCE(SUM(qty * unit_price), 0) FROM proposal_items i WHERE i.proposal_id = p.id) AS total
          FROM proposals p LEFT JOIN clients c ON c.id = p.client_id
          WHERE p.deleted_at IS NULL ORDER BY p.id DESC LIMIT 500';
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
      $r['client_id'] = $r['client_id'] !== null ? (int)$r['client_id'] : null;
      $r['project_id'] = $r['project_id'] !== null ? (int)$r['project_id'] : null;
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
  $items = is_array($in['items'] ?? null) ? $in['items'] : [];
  if (count($items) === 0) fail('Add at least one line item.');

  $conn->begin_transaction();
  try {
    $stmt = $conn->prepare('INSERT INTO proposals (client_id, title, notes, valid_until) VALUES (?, ?, ?, ?)');
    $stmt->bind_param('isss', $clientId, $title, $notes, $valid);
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
  $stmt = $conn->prepare('UPDATE proposals SET status = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('si', $status, $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Proposal not found.', 404);
  audit($conn, $user['id'], 'proposal_status', "#$id → $status");
  ok(['ok' => true]);
}

if ($method === 'POST' && $action === 'accept') {
  $user = require_auth($conn, STAFF);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('A proposal id is required.');

  $stmt = $conn->prepare('SELECT title, client_id, project_id, status FROM proposals WHERE id = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $p = $stmt->get_result()->fetch_assoc();
  if (!$p) fail('Proposal not found.', 404);
  if ($p['project_id']) ok(['ok' => true, 'project_id' => (int)$p['project_id'], 'existing' => true]);

  $conn->begin_transaction();
  try {
    $title = $p['title'];
    $clientId = $p['client_id'] !== null ? (int)$p['client_id'] : null;
    $stmt = $conn->prepare('INSERT INTO projects (name, client_id, status) VALUES (?, ?, "in_progress")');
    $stmt->bind_param('si', $title, $clientId);
    $stmt->execute();
    $projectId = $conn->insert_id;

    $stmt = $conn->prepare('UPDATE proposals SET status = "accepted", project_id = ? WHERE id = ?');
    $stmt->bind_param('ii', $projectId, $id);
    $stmt->execute();
    $conn->commit();
  } catch (Throwable $e) {
    $conn->rollback();
    fail('Could not accept the proposal.', 500);
  }
  audit($conn, $user['id'], 'proposal_accept', "#$id → project #$projectId");
  ok(['ok' => true, 'project_id' => $projectId]);
}

fail('Method not allowed.', 405);
