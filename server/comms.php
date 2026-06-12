<?php
/**
 * Communication Hub (GAkinzOS §6 Comms). Protected.
 *
 *   GET  /comms.php                 → list threads (client + project + counts + preview)
 *   GET  /comms.php?id=N            → thread with its messages
 *   POST /comms.php?action=create     {subject, client_id?, project_id?, channel?, body?}
 *   POST /comms.php?action=post       {thread_id, body, direction?}
 *   POST /comms.php?action=status     {id, status}   status: open | archived
 *
 * Channel: email | call | meeting | client | internal.
 * Direction: out (we sent) | in (they sent) | note (internal).
 *
 * No external provider is wired: messages are RECORDED, not delivered. This is
 * the studio's conversation log — one place every email recap, call note, and
 * client message lives, tied to its client/project.
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager', 'editor', 'employee'];
const CHANNELS = ['email', 'call', 'meeting', 'client', 'internal'];
const DIRECTIONS = ['out', 'in', 'note'];
const STATUSES = ['open', 'archived'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── Single thread + messages ────────────────────────────────────────────────
if ($method === 'GET' && isset($_GET['id'])) {
  require_auth($conn);
  $id = (int)$_GET['id'];
  $stmt = $conn->prepare(
    'SELECT t.id, t.subject, t.channel, t.status, t.client_id, t.project_id,
            c.company AS client_company, p.name AS project_name,
            t.created_at, t.last_message_at
     FROM comm_threads t
     LEFT JOIN clients c  ON c.id = t.client_id
     LEFT JOIN projects p ON p.id = t.project_id
     WHERE t.id = ? AND t.deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $t = $stmt->get_result()->fetch_assoc();
  if (!$t) fail('Thread not found.', 404);
  $t['id'] = (int)$t['id'];
  $t['client_id'] = $t['client_id'] !== null ? (int)$t['client_id'] : null;
  $t['project_id'] = $t['project_id'] !== null ? (int)$t['project_id'] : null;

  $messages = [];
  $stmt = $conn->prepare(
    'SELECT m.id, m.direction, m.body, m.created_at, u.name AS author
     FROM comm_messages m LEFT JOIN users u ON u.id = m.user_id
     WHERE m.thread_id = ? ORDER BY m.id ASC'
  );
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($m = $res->fetch_assoc()) {
    $m['id'] = (int)$m['id'];
    $messages[] = $m;
  }
  $t['messages'] = $messages;
  ok($t);
}

// ── Thread list ─────────────────────────────────────────────────────────────
if ($method === 'GET') {
  require_auth($conn);
  $rows = [];
  $sql = 'SELECT t.id, t.subject, t.channel, t.status, t.client_id, t.project_id,
                 c.company AS client_company, p.name AS project_name,
                 t.created_at, t.last_message_at,
                 (SELECT COUNT(*) FROM comm_messages m WHERE m.thread_id = t.id) AS message_count,
                 (SELECT m2.body FROM comm_messages m2 WHERE m2.thread_id = t.id
                  ORDER BY m2.id DESC LIMIT 1) AS preview
          FROM comm_threads t
          LEFT JOIN clients c  ON c.id = t.client_id
          LEFT JOIN projects p ON p.id = t.project_id
          WHERE t.deleted_at IS NULL
          ORDER BY COALESCE(t.last_message_at, t.created_at) DESC LIMIT 500';
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
      $r['client_id'] = $r['client_id'] !== null ? (int)$r['client_id'] : null;
      $r['project_id'] = $r['project_id'] !== null ? (int)$r['project_id'] : null;
      $r['message_count'] = (int)$r['message_count'];
      if ($r['preview'] !== null) $r['preview'] = mb_substr($r['preview'], 0, 140);
      $rows[] = $r;
    }
  }
  ok($rows);
}

// ── Create a thread (optionally with a first message) ───────────────────────
if ($method === 'POST' && $action === 'create') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $subject = str_field($in, 'subject', 200);
  if ($subject === '') fail('A subject is required.');
  $clientId  = isset($in['client_id'])  && $in['client_id']  !== '' ? (int)$in['client_id']  : null;
  $projectId = isset($in['project_id']) && $in['project_id'] !== '' ? (int)$in['project_id'] : null;
  $channel = str_field($in, 'channel', 20);
  if (!in_array($channel, CHANNELS, true)) $channel = 'internal';
  $first = str_field($in, 'body', 5000);
  $uid = $user['id'];

  $stmt = $conn->prepare(
    'INSERT INTO comm_threads (subject, client_id, project_id, channel, created_by) VALUES (?, ?, ?, ?, ?)'
  );
  $stmt->bind_param('siisi', $subject, $clientId, $projectId, $channel, $uid);
  if (!$stmt->execute()) fail('Could not create the thread.', 500);
  $threadId = $conn->insert_id;

  if ($first !== '') {
    $dir = 'note';
    $stmt = $conn->prepare('INSERT INTO comm_messages (thread_id, user_id, direction, body) VALUES (?, ?, ?, ?)');
    $stmt->bind_param('iiss', $threadId, $uid, $dir, $first);
    $stmt->execute();
    $conn->query('UPDATE comm_threads SET last_message_at = NOW() WHERE id = ' . (int)$threadId);
  }
  audit($conn, $user['id'], 'comm_thread_create', $subject);
  ok(['id' => $threadId], 201);
}

// ── Post a message into a thread ────────────────────────────────────────────
if ($method === 'POST' && $action === 'post') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $threadId = (int)($in['thread_id'] ?? 0);
  $bodyText = str_field($in, 'body', 5000);
  if ($threadId <= 0 || $bodyText === '') fail('A thread id and message text are required.');
  $direction = str_field($in, 'direction', 10);
  if (!in_array($direction, DIRECTIONS, true)) $direction = 'note';
  $uid = $user['id'];

  // Reject a message on a missing/deleted thread.
  $chk = $conn->prepare('SELECT id FROM comm_threads WHERE id = ? AND deleted_at IS NULL LIMIT 1');
  $chk->bind_param('i', $threadId);
  $chk->execute();
  if (!$chk->get_result()->fetch_assoc()) fail('Thread not found.', 404);

  $stmt = $conn->prepare('INSERT INTO comm_messages (thread_id, user_id, direction, body) VALUES (?, ?, ?, ?)');
  $stmt->bind_param('iiss', $threadId, $uid, $direction, $bodyText);
  if (!$stmt->execute()) fail('Could not post the message.', 500);
  // Touch the thread so it sorts to the top and reopens if archived.
  $conn->query("UPDATE comm_threads SET last_message_at = NOW(), status = 'open' WHERE id = " . (int)$threadId);
  ok(['id' => $conn->insert_id], 201);
}

// ── Archive / reopen a thread ───────────────────────────────────────────────
if ($method === 'POST' && $action === 'status') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $status = str_field($in, 'status', 20);
  if ($id <= 0 || !in_array($status, STATUSES, true)) fail('Invalid request.');
  $stmt = $conn->prepare('UPDATE comm_threads SET status = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('si', $status, $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Thread not found.', 404);
  audit($conn, $user['id'], 'comm_thread_status', "#$id → $status");
  ok(['ok' => true]);
}

fail('Method not allowed.', 405);
