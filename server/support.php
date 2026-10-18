<?php
/**
 * Support tickets (GAkinzOS §6 Support). Protected.
 *
 *   GET  /support.php               → list tickets (with client + assignee)
 *   GET  /support.php?id=N          → ticket with its replies
 *   POST /support.php?action=create   {subject, body?, client_id?, priority?}
 *   POST /support.php?action=update_request {question, project_id?}   (client only)
 *   POST /support.php?action=status   {id, status}
 *   POST /support.php?action=priority {id, priority}
 *   POST /support.php?action=assign   {id, assignee_id}
 *   POST /support.php?action=reply    {id, body}
 *
 * Status: open | in_progress | resolved.  Priority: urgent | high | normal | low.
 *
 * A `client`-role user may list, read, create and reply, and nothing else.
 * Their client id always comes from the token, exactly as in portal.php: any
 * client_id in the request is ignored, a ticket of another client answers 404,
 * and they cannot set status, priority or assignee. Every reply is client
 * facing (ticket_replies has no internal-note flag).
 *
 * A client asks for an update with action=update_request: an ordinary ticket
 * whose subject the server prefixes "Update request:", so the owner answers it
 * in Support like any other. tickets has no project link, so a chosen project
 * is named in the body, and only after it is proven to belong to the caller's
 * client; any other project answers 404 exactly like a missing one.
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager', 'editor', 'employee'];
const STAFF_OR_CLIENT = ['super_admin', 'admin', 'manager', 'editor', 'employee', 'client'];
const STATUSES = ['open', 'in_progress', 'resolved'];
const PRIORITIES = ['urgent', 'high', 'normal', 'low'];
const UPDATE_PREFIX = 'Update request: ';

/** The caller's own client id. A client account with no client is refused. */
function own_client_id(array $user): int {
  $clientId = (int)($user['client_id'] ?? 0);
  if ($clientId <= 0) fail('Your account is not linked to a client.', 403);
  return $clientId;
}

/** Trimmed text that is refused, not silently cut, when it is too long. */
function client_text(array $in, string $key, int $max): string {
  $v = trim((string)($in[$key] ?? ''));
  if (mb_strlen($v) > $max) fail("That is too long. Please keep it under $max characters.");
  return $v;
}

/**
 * Replies for tickets already proven to belong to $clientId. The client_id
 * condition is repeated in the query so a reply can never cross clients.
 */
function client_replies(mysqli $conn, int $clientId, ?int $ticketId = null): array {
  $sql = 'SELECT r.id, r.ticket_id, r.body, r.created_at, u.name AS author, (u.role = "client") AS from_client
          FROM ticket_replies r
          JOIN tickets t ON t.id = r.ticket_id
          LEFT JOIN users u ON u.id = r.user_id
          WHERE t.client_id = ? AND t.deleted_at IS NULL' . ($ticketId !== null ? ' AND t.id = ?' : '') . '
          ORDER BY r.id ASC';
  $stmt = $conn->prepare($sql);
  if ($ticketId !== null) $stmt->bind_param('ii', $clientId, $ticketId);
  else $stmt->bind_param('i', $clientId);
  $stmt->execute();
  $res = $stmt->get_result();
  $byTicket = [];
  while ($r = $res->fetch_assoc()) {
    $tid = (int)$r['ticket_id'];
    $byTicket[$tid][] = [
      'id' => (int)$r['id'],
      'body' => $r['body'],
      'created_at' => $r['created_at'],
      // Staff names stay internal; a client sees the studio, not the person.
      'author' => $r['from_client'] ? $r['author'] : 'GAkinz',
      'from_client' => (bool)$r['from_client'],
    ];
  }
  return $byTicket;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── Client branch ─────────────────────────────────────────────────────────────
// Handled first and always ends the request, so no client request can reach
// the staff branches below.
if (in_array($method, ['GET', 'POST'], true) && ($action === '' || in_array($action, ['create', 'reply', 'update_request'], true))) {
  $user = require_auth($conn, STAFF_OR_CLIENT);
} else {
  $user = require_auth($conn, STAFF);
}

if ($user['role'] === 'client') {
  $clientId = own_client_id($user);
  $columns = 't.id, t.subject, t.body, t.status, t.created_at,
              COALESCE((SELECT MAX(r.created_at) FROM ticket_replies r WHERE r.ticket_id = t.id), t.created_at) AS last_activity';

  if ($method === 'GET' && isset($_GET['id'])) {
    $id = (int)$_GET['id'];
    $stmt = $conn->prepare("SELECT $columns FROM tickets t WHERE t.id = ? AND t.client_id = ? AND t.deleted_at IS NULL LIMIT 1");
    $stmt->bind_param('ii', $id, $clientId);
    $stmt->execute();
    $t = $stmt->get_result()->fetch_assoc();
    if (!$t) fail('Ticket not found.', 404);
    $t['id'] = (int)$t['id'];
    $t['replies'] = client_replies($conn, $clientId, $t['id'])[$t['id']] ?? [];
    ok($t);
  }

  if ($method === 'GET') {
    $stmt = $conn->prepare("SELECT $columns FROM tickets t WHERE t.client_id = ? AND t.deleted_at IS NULL ORDER BY last_activity DESC, t.id DESC LIMIT 200");
    $stmt->bind_param('i', $clientId);
    $stmt->execute();
    $res = $stmt->get_result();
    $replies = client_replies($conn, $clientId);
    $rows = [];
    while ($t = $res->fetch_assoc()) {
      $t['id'] = (int)$t['id'];
      $t['replies'] = $replies[$t['id']] ?? [];
      $rows[] = $t;
    }
    ok($rows);
  }

  if ($method === 'POST' && $action === 'create') {
    $in = body();
    $subject = client_text($in, 'subject', 200);
    if ($subject === '') fail('A subject is required.');
    $bodyText = client_text($in, 'body', 5000);
    $bodyText = $bodyText !== '' ? $bodyText : null;
    // Client from the token, never from the request; priority is the studio's call.
    $stmt = $conn->prepare("INSERT INTO tickets (client_id, subject, body, priority) VALUES (?, ?, ?, 'normal')");
    $stmt->bind_param('iss', $clientId, $subject, $bodyText);
    if (!$stmt->execute()) fail('Could not send your message.', 500);
    $newId = $conn->insert_id; // read before audit(), which inserts its own row
    audit($conn, $user['id'], 'ticket_create', "#$newId (client) $subject");
    ok(['id' => $newId], 201);
  }

  if ($method === 'POST' && $action === 'update_request') {
    $in = body();
    if (array_key_exists('question', $in) && !is_string($in['question'])) fail('Write your question as text.');
    $question = client_text($in, 'question', 5000);
    if ($question === '') fail('Write the question you would like answered.');

    // Optional project, which must be one of this client's own. A project of
    // another client, a deleted one and a malformed id all answer the same 404.
    $project = null;
    $rawProject = $in['project_id'] ?? null;
    if ($rawProject !== null && $rawProject !== '') {
      $pid = (is_int($rawProject) || (is_string($rawProject) && preg_match('/^[1-9]\d{0,9}$/', $rawProject))) ? (int)$rawProject : 0;
      if ($pid <= 0) fail('Project not found.', 404);
      $p = $conn->prepare('SELECT id, name FROM projects WHERE id = ? AND client_id = ? AND deleted_at IS NULL LIMIT 1');
      $p->bind_param('ii', $pid, $clientId);
      $p->execute();
      $project = $p->get_result()->fetch_assoc();
      if (!$project) fail('Project not found.', 404);
    }

    // The subject is built here, never taken from the request.
    $about = $project ? (string)$project['name'] : preg_replace('/\s+/u', ' ', $question);
    $subject = UPDATE_PREFIX . mb_substr($about, 0, 200 - mb_strlen(UPDATE_PREFIX));
    $bodyText = $project ? 'Project: ' . $project['name'] . ' (#' . (int)$project['id'] . ")\n\n" . $question : $question;

    // A double click or a resend of the same question answers 409, not a second ticket.
    $dup = $conn->prepare("SELECT id FROM tickets WHERE client_id = ? AND subject = ? AND body = ? AND status = 'open'
      AND deleted_at IS NULL AND created_at > NOW() - INTERVAL 10 MINUTE LIMIT 1");
    $dup->bind_param('iss', $clientId, $subject, $bodyText);
    $dup->execute();
    if ($dup->get_result()->fetch_assoc()) fail('That request has already been sent.', 409);

    $stmt = $conn->prepare("INSERT INTO tickets (client_id, subject, body, priority) VALUES (?, ?, ?, 'normal')");
    $stmt->bind_param('iss', $clientId, $subject, $bodyText);
    if (!$stmt->execute()) fail('Could not send your request.', 500);
    $newId = $conn->insert_id; // read before audit(), which inserts its own row
    audit($conn, $user['id'], 'ticket_update_request', "#$newId (client)" . ($project ? ' project #' . (int)$project['id'] : ''));
    ok(['id' => $newId, 'subject' => $subject], 201);
  }

  if ($method === 'POST' && $action === 'reply') {
    $in = body();
    $id = (int)($in['id'] ?? 0);
    $bodyText = client_text($in, 'body', 5000);
    if ($id <= 0 || $bodyText === '') fail('A ticket id and reply text are required.');
    // Ownership first. Another client's ticket answers exactly like a missing one.
    $own = $conn->prepare('SELECT id FROM tickets WHERE id = ? AND client_id = ? AND deleted_at IS NULL LIMIT 1');
    $own->bind_param('ii', $id, $clientId);
    $own->execute();
    if (!$own->get_result()->fetch_assoc()) fail('Ticket not found.', 404);
    $uid = $user['id'];
    $stmt = $conn->prepare('INSERT INTO ticket_replies (ticket_id, user_id, body) VALUES (?, ?, ?)');
    $stmt->bind_param('iis', $id, $uid, $bodyText);
    if (!$stmt->execute()) fail('Could not send your reply.', 500);
    $newId = $conn->insert_id; // read before audit(), which inserts its own row
    audit($conn, $uid, 'ticket_reply', "#$id (client)");
    ok(['id' => $newId], 201);
  }

  fail('Not allowed.', 403);
}

// ── Staff ─────────────────────────────────────────────────────────────────────
// $user is already authorised as STAFF here: the client branch above always
// ends the request. The require_auth() calls below are kept as belt and braces.

if ($method === 'GET' && isset($_GET['id'])) {
  require_auth($conn, STAFF);
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
  require_auth($conn, STAFF);
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
  $newId = $conn->insert_id; // read before audit(), which inserts its own row
  audit($conn, $user['id'], 'ticket_create', $subject);
  ok(['id' => $newId], 201);
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
  audit($conn, $user['id'], 'ticket_priority', "#$id → $priority");
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
  // A reply moves an open ticket into progress. Bound, not concatenated.
  $newId = $conn->insert_id; // read now: the UPDATE and audit() below change insert_id
  $touch = $conn->prepare("UPDATE tickets SET status = 'in_progress' WHERE id = ? AND status = 'open'");
  $touch->bind_param('i', $id);
  $touch->execute();
  audit($conn, $uid, 'ticket_reply', "#$id");
  ok(['id' => $newId], 201);
}

fail('Method not allowed.', 405);
