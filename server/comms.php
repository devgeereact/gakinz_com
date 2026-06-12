<?php
/**
 * Communication Hub (GAkinzOS §6 Comms). Protected.
 *
 *   GET  /comms.php                 → list threads (client + project + counts + preview)
 *   GET  /comms.php?id=N            → thread with its messages
 *   POST /comms.php?action=create     {subject, client_id?, project_id?, channel?, body?}
 *   POST /comms.php?action=post       {thread_id, body, direction?}
 *   POST /comms.php?action=send       {thread_id, body}   (email threads only)
 *   POST /comms.php?action=status     {id, status}   status: open | archived
 *
 * Channel: email | call | meeting | client | internal.
 * Direction: out (we sent) | in (they sent) | note (internal).
 *
 * Most messages are RECORDED, not delivered — the studio's conversation log,
 * one place every call note, meeting recap and client message lives, tied to
 * its client/project. The exception is `action=send`: on an email thread it
 * delivers a real email to the linked client (via the shared SMTP transport)
 * and records it as an `out` message.
 */
require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_smtp.php';
require __DIR__ . '/_sms.php';

const STAFF = ['super_admin', 'admin', 'manager', 'editor', 'employee'];
const CHANNELS = ['email', 'sms', 'call', 'meeting', 'client', 'internal'];
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

// ── Deliver a message on a thread (records AND sends) ───────────────────────
// Email threads send via SMTP to the client's email; SMS threads via Twilio to
// the client's phone. Either way it's recorded as an `out` message.
if ($method === 'POST' && $action === 'send') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $threadId = (int)($in['thread_id'] ?? 0);
  $bodyText = str_field($in, 'body', 50000);
  if ($threadId <= 0 || $bodyText === '') fail('A thread id and message text are required.');

  // Load the thread + its client contact details.
  $stmt = $conn->prepare(
    'SELECT t.subject, t.channel, c.email AS client_email, c.phone AS client_phone
     FROM comm_threads t LEFT JOIN clients c ON c.id = t.client_id
     WHERE t.id = ? AND t.deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('i', $threadId);
  $stmt->execute();
  $t = $stmt->get_result()->fetch_assoc();
  if (!$t) fail('Thread not found.', 404);

  $channel = $t['channel'];
  $sentTo = '';

  if ($channel === 'email') {
    if (($GLOBALS['SMTP_HOST'] ?? '') === '') fail('Email sending is not configured on the server.', 503);
    $clientEmail = trim((string)($t['client_email'] ?? ''));
    if ($clientEmail === '' || !filter_var($clientEmail, FILTER_VALIDATE_EMAIL))
      fail('This conversation has no client email address to send to.');
    $subject = $t['subject'];
    if (stripos($subject, 're:') !== 0) $subject = 'Re: ' . $subject; // avoid stacking "Re:"
    $res = gk_send_email(['to' => $clientEmail, 'subject' => $subject, 'body' => $bodyText]);
    if (!$res['ok']) { error_log('GAkinz comms send (email): ' . $res['error']); fail('Could not send the email. Please try again.', 502); }
    $sentTo = $clientEmail;

  } elseif ($channel === 'sms') {
    if (!gk_sms_configured()) fail('SMS sending is not configured on the server.', 503);
    $clientPhone = trim((string)($t['client_phone'] ?? ''));
    // Loose E.164-ish check: optional +, 7–15 digits (after stripping spaces).
    $normalized = preg_replace('/[\s\-().]/', '', $clientPhone);
    if ($normalized === '' || !preg_match('/^\+?[0-9]{7,15}$/', $normalized))
      fail('This conversation has no valid client phone number to text.');
    $res = gk_send_sms($normalized, $bodyText);
    if (!$res['ok']) { error_log('GAkinz comms send (sms): ' . $res['error']); fail('Could not send the SMS. Please try again.', 502); }
    $sentTo = $normalized;

  } else {
    fail('Only email or SMS conversations can be sent.');
  }

  // Record the delivered message as an outbound entry on the thread.
  $uid = $user['id'];
  $dir = 'out';
  $stmt = $conn->prepare('INSERT INTO comm_messages (thread_id, user_id, direction, body) VALUES (?, ?, ?, ?)');
  $stmt->bind_param('iiss', $threadId, $uid, $dir, $bodyText);
  if (!$stmt->execute()) fail('Message sent, but could not record it.', 500);
  $conn->query("UPDATE comm_threads SET last_message_at = NOW(), status = 'open' WHERE id = " . (int)$threadId);
  audit($conn, $user['id'], 'comm_send', "#$threadId ($channel) → $sentTo");
  ok(['id' => $conn->insert_id, 'sent_to' => $sentTo, 'channel' => $channel], 201);
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
