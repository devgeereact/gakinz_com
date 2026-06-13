<?php
/**
 * Support tickets (GAkinzOS §6 Support). Protected.
 *
 *   GET  /support.php               → list tickets (with client + assignee)
 *   GET  /support.php?id=N          → ticket with its replies
 *   POST /support.php?action=create   {subject, body?, client_id?, priority?}
 *   POST /support.php?action=status   {id, status}
 *   POST /support.php?action=priority {id, priority}
 *   POST /support.php?action=assign   {id, assignee_id}
 *   POST /support.php?action=reply    {id, body}
 *
 * Status: open | in_progress | resolved.  Priority: urgent | high | normal | low.
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager', 'editor', 'employee'];
const STATUSES = ['open', 'in_progress', 'resolved'];
const PRIORITIES = ['urgent', 'high', 'normal', 'low'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET' && isset($_GET['id'])) {
  require_auth($conn, STAFF); // staff only — clients see their tickets via portal.php
  $id = (int)$_GET['id'];
  $stmt = $conn->prepare(
    'SELECT t.id, t.subject, t.body, t.status, t.priority, t.client_id, t.assignee_id,
            c.company AS client_company, u.name AS assignee_name, t.created_at
     FROM tickets t
     LEFT JOIN clients c ON c.id = t.client_id
     LEFT JOIN users u ON u.id = t.assignee_id
     WHERE t.id = ? AND t.deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $t = $stmt->get_result()->fetch_assoc();
  if (!$t) fail('Ticket not found.', 404);
  $t['id'] = (int)$t['id'];

  $replies = [];
  $stmt = $conn->prepare(
    'SELECT r.id, r.body, r.created_at, u.name AS author
     FROM ticket_replies r LEFT JOIN users u ON u.id = r.user_id
     WHERE r.ticket_id = ? ORDER BY r.id ASC'
  );
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($r = $res->fetch_assoc()) {
    $r['id'] = (int)$r['id'];
    $replies[] = $r;
  }
  $t['replies'] = $replies;
  ok($t);
}

if ($method === 'GET') {
  require_auth($conn, STAFF); // staff only — clients see their tickets via portal.php
  $rows = [];
  $sql = 'SELECT t.id, t.subject, t.status, t.priority, t.client_id, t.assignee_id,
                 c.company AS client_company, u.name AS assignee_name, t.created_at
          FROM tickets t
          LEFT JOIN clients c ON c.id = t.client_id
          LEFT JOIN users u ON u.id = t.assignee_id
          WHERE t.deleted_at IS NULL
          ORDER BY FIELD(t.priority, "urgent","high","normal","low"), t.id DESC LIMIT 500';
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
      $r['client_id'] = $r['client_id'] !== null ? (int)$r['client_id'] : null;
      $r['assignee_id'] = $r['assignee_id'] !== null ? (int)$r['assignee_id'] : null;
      $rows[] = $r;
    }
  }
  ok($rows);
}

if ($method === 'POST' && $action === 'create') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $subject = str_field($in, 'subject', 200);
  if ($subject === '') fail('A subject is required.');
  $bodyText = str_field($in, 'body', 5000);
  $bodyText = $bodyText !== '' ? $bodyText : null;
  $clientId = isset($in['client_id']) && $in['client_id'] !== '' ? (int)$in['client_id'] : null;
  $priority = str_field($in, 'priority', 10);
  if (!in_array($priority, PRIORITIES, true)) $priority = 'normal';

  $stmt = $conn->prepare('INSERT INTO tickets (client_id, subject, body, priority) VALUES (?, ?, ?, ?)');
  $stmt->bind_param('isss', $clientId, $subject, $bodyText, $priority);
  if (!$stmt->execute()) fail('Could not create the ticket.', 500);
  audit($conn, $user['id'], 'ticket_create', $subject);
  ok(['id' => $conn->insert_id], 201);
}

if ($method === 'POST' && $action === 'status') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $status = str_field($in, 'status', 20);
  if ($id <= 0 || !in_array($status, STATUSES, true)) fail('Invalid request.');
  $stmt = $conn->prepare('UPDATE tickets SET status = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('si', $status, $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Ticket not found.', 404);
  audit($conn, $user['id'], 'ticket_status', "#$id → $status");
  ok(['ok' => true]);
}

if ($method === 'POST' && $action === 'priority') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $priority = str_field($in, 'priority', 10);
  if ($id <= 0 || !in_array($priority, PRIORITIES, true)) fail('Invalid request.');
  $stmt = $conn->prepare('UPDATE tickets SET priority = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('si', $priority, $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Ticket not found.', 404);
  ok(['ok' => true]);
}

if ($method === 'POST' && $action === 'assign') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $assignee = isset($in['assignee_id']) && $in['assignee_id'] !== '' ? (int)$in['assignee_id'] : null;
  if ($id <= 0) fail('A ticket id is required.');
  $stmt = $conn->prepare('UPDATE tickets SET assignee_id = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('ii', $assignee, $id);
  $stmt->execute();
  audit($conn, $user['id'], 'ticket_assign', "#$id → user " . ($assignee ?? 'none'));
  ok(['ok' => true]);
}

if ($method === 'POST' && $action === 'reply') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $bodyText = str_field($in, 'body', 5000);
  if ($id <= 0 || $bodyText === '') fail('A ticket id and reply text are required.');
  $uid = $user['id'];
  $stmt = $conn->prepare('INSERT INTO ticket_replies (ticket_id, user_id, body) VALUES (?, ?, ?)');
  $stmt->bind_param('iis', $id, $uid, $bodyText);
  if (!$stmt->execute()) fail('Could not add the reply.', 500);
  // A reply moves an open ticket into progress.
  $conn->query("UPDATE tickets SET status = 'in_progress' WHERE id = " . (int)$id . " AND status = 'open'");
  ok(['id' => $conn->insert_id], 201);
}

fail('Method not allowed.', 405);
