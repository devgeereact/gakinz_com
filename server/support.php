<?php
/**
 * Support tickets (GAkinzOS §6 Support). Protected.
 *
 *   GET  /support.php               → list tickets (with client + assignee)
 *   GET  /support.php?id=N          → ticket with its replies
 *   POST /support.php?action=create   {subject, body?, client_id?, priority?}
 *   POST /support.php?action=update_request {question, project_id?}   (client only)
 *   POST /support.php?action=deletion_request {}       (client only)
 *   POST /support.php?action=status   {id, status}
 *   POST /support.php?action=priority {id, priority}
 *   POST /support.php?action=assign   {id, assignee_id}
 *   POST /support.php?action=reply    {id, body}
 *   POST /support.php?action=log_time {id, minutes, description?, billable?, entry_date?}   (staff, SQL 17)
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
 *
 * A client asks for their data to be deleted with action=deletion_request
 * (docs/PRIVACY-READINESS.md section 7). It takes no input: the subject and
 * body are fixed here, and it creates an ordinary ticket "Data deletion
 * request" that the owner handles by hand in Support. Nothing is deleted.
 * A client has at most one such ticket that is not resolved; another request
 * while one is open answers 409.
 *
 * IT support time (SQL 17, docs/PRODUCT-SPEC.md sections 6.4 and 7). Staff log
 * time from a ticket with action=log_time. The entry goes onto the client's
 * standing project named "IT support" (projects.kind = 'it_support'), which
 * the first log creates, once, and every later log reuses. The entry carries
 * the ticket id, and uses the time.php rules (_time.php). A ticket with no
 * client is refused, because the time would have no client to bill. The staff
 * ticket detail returns the logged time; a client never sees it. Until SQL 17
 * runs, log_time answers 503 and the detail returns `time: null`.
 *
 * _time.php is loaded only on the paths that log or show time (sp_time_lib),
 * so this file still serves every other route, the client portal's included,
 * if it is uploaded without _time.php. Then log_time answers 503 and the
 * detail returns `time: null`, as before SQL 17.
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager', 'editor', 'employee'];
const STAFF_OR_CLIENT = ['super_admin', 'admin', 'manager', 'editor', 'employee', 'client'];
const STATUSES = ['open', 'in_progress', 'resolved'];
const PRIORITIES = ['urgent', 'high', 'normal', 'low'];
const UPDATE_PREFIX = 'Update request: ';
const DELETION_SUBJECT = 'Data deletion request';
const DELETION_BODY = "Please delete the personal data GAkinz holds about me and my account.\n\n"
  . "Sent from My account in the client portal. Nothing has been deleted yet: GAkinz will reply to the email "
  . "address on this account to confirm who is asking, what will be deleted, and what may need to be kept, and why.";
const IT_SUPPORT_KIND = 'it_support';
const IT_SUPPORT_NAME = 'IT support';

/**
 * Load _time.php on first use. False when it is not on the server, so the
 * caller can answer for its own feature instead of the whole file failing.
 */
function sp_time_lib(): bool {
  static $loaded = null;
  if ($loaded === null) {
    $loaded = is_file(__DIR__ . '/_time.php');
    if ($loaded) require_once __DIR__ . '/_time.php';
  }
  return $loaded;
}

/** True when ticket time can be logged and shown: _time.php is here and SQL 17 has run. */
function sp_ticket_time_ready(mysqli $conn): bool {
  return sp_time_lib() && gk_ticket_time_ready($conn);
}

/**
 * True once SQL 17 has added projects.kind. Probed here rather than through
 * _time.php, so the client branch depends on nothing but _bootstrap.php.
 */
function sp_kind_ready(mysqli $conn): bool {
  try {
    // LIMIT 0 reads no rows; it only proves the column is there.
    return $conn->query('SELECT kind FROM projects LIMIT 0') !== false;
  } catch (mysqli_sql_exception $e) {
    if ($e->getCode() !== 1054) throw $e; // ER_BAD_FIELD_ERROR only
    return false;
  }
}

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
if (in_array($method, ['GET', 'POST'], true) && ($action === '' || in_array($action, ['create', 'reply', 'update_request', 'deletion_request'], true))) {
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
      $kindCol = sp_kind_ready($conn) ? 'kind' : 'NULL AS kind';
      $p = $conn->prepare("SELECT id, name, $kindCol FROM projects WHERE id = ? AND client_id = ? AND deleted_at IS NULL LIMIT 1");
      $p->bind_param('ii', $pid, $clientId);
      $p->execute();
      $project = $p->get_result()->fetch_assoc();
      if (!$project) fail('Project not found.', 404);
      // The standing IT support project is named to a client exactly as the
      // portal names it, whatever staff have called it internally (SQL 17).
      if ($project['kind'] === IT_SUPPORT_KIND) $project['name'] = IT_SUPPORT_NAME;
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

  if ($method === 'POST' && $action === 'deletion_request') {
    // Fixed text, so nothing from the request reaches the ticket. The client
    // row is locked for the check and the insert, so two requests at once
    // still make one ticket.
    // Every failure must throw so the catch rolls back, whatever config.php
    // sets: prepare() then throws rather than returning false.
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $conn->begin_transaction();
    try {
      $lock = $conn->prepare('SELECT id FROM clients WHERE id = ? FOR UPDATE');
      $lock->bind_param('i', $clientId);
      $lock->execute();
      if (!$lock->get_result()->fetch_assoc()) { $conn->rollback(); fail('Your account is not linked to a client.', 403); }
      $open = $conn->prepare("SELECT id FROM tickets WHERE client_id = ? AND subject = ? AND status <> 'resolved' AND deleted_at IS NULL LIMIT 1");
      $subject = DELETION_SUBJECT;
      $open->bind_param('is', $clientId, $subject);
      $open->execute();
      if ($open->get_result()->fetch_assoc()) {
        $conn->rollback();
        fail('You already have a data deletion request open. GAkinz will reply to it.', 409);
      }
      $bodyText = DELETION_BODY;
      $stmt = $conn->prepare("INSERT INTO tickets (client_id, subject, body, priority) VALUES (?, ?, ?, 'normal')");
      $stmt->bind_param('iss', $clientId, $subject, $bodyText);
      $stmt->execute();
      $newId = $conn->insert_id; // read before audit(), which inserts its own row
      audit($conn, $user['id'], 'ticket_deletion_request', "#$newId (client)");
      $conn->commit();
    } catch (mysqli_sql_exception $e) {
      $conn->rollback();
      error_log('support.php deletion_request: SQL error ' . $e->getCode());
      fail('Could not send your request.', 500);
    }
    ok(['id' => $newId, 'subject' => DELETION_SUBJECT], 201);
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

  // Logged IT support time, staff only. NULL before SQL 17 (or without
  // _time.php), so the screen knows to hide "Log time".
  $t['time'] = null;
  if (sp_ticket_time_ready($conn)) {
    $entries = [];
    $total = 0;
    $stmt = $conn->prepare(
      'SELECT e.id, e.minutes, e.description, e.billable, e.status, e.entry_date, u.name AS user_name
       FROM time_entries e LEFT JOIN users u ON u.id = e.user_id
       WHERE e.ticket_id = ? AND e.deleted_at IS NULL
       ORDER BY e.entry_date DESC, e.id DESC'
    );
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($e = $res->fetch_assoc()) {
      $e['id'] = (int)$e['id'];
      $e['minutes'] = (int)$e['minutes'];
      $e['billable'] = (bool)$e['billable'];
      if ($e['status'] !== 'rejected') $total += $e['minutes']; // rejected time is listed, not counted
      $entries[] = $e;
    }
    $t['time'] = ['total_minutes' => $total, 'entries' => $entries];
  }
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

if ($method === 'POST' && $action === 'log_time') {
  // The support staff roles, every one of which time.php also lets log time.
  // A trainer may log time in time.php but has no access to Support at all.
  $user = require_auth($conn, STAFF);
  // Every failure must throw so the catch rolls back, whatever config.php sets.
  // In this mode prepare() throws rather than returning false, so no
  // bind_param() below can be reached with a failed statement.
  mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
  if (!sp_time_lib()) {
    fail('Logging time on a ticket is not available yet. Upload server/_time.php first.', 503);
  }
  if (!gk_ticket_time_ready($conn)) {
    fail('Logging time on a ticket is not available yet. Run SQL 17 on the database first.', 503);
  }
  $in = body();
  $id = (int)($in['id'] ?? 0);
  if ($id <= 0) fail('A ticket id is required.');
  $e = gk_time_entry_input($in); // the same rules as time.php create

  $find = $conn->prepare('SELECT id, client_id FROM tickets WHERE id = ? AND deleted_at IS NULL LIMIT 1');
  $find->bind_param('i', $id);
  $find->execute();
  $ticket = $find->get_result()->fetch_assoc();
  if (!$ticket) fail('Ticket not found.', 404);
  if ($ticket['client_id'] === null) {
    fail('This ticket has no client, so the time has nobody to bill. Link it to a client first.');
  }
  $clientId = (int)$ticket['client_id'];
  $uid = $user['id'];

  // Find or create the client's standing project, once. Locking the client
  // row makes two first logs for the same client take turns, and the project
  // read is a locking read too, so the second sees the project the first
  // committed instead of an older snapshot.
  // Any statement that fails, the audit rows included, rolls the whole log
  // back: no project, no entry and no audit row.
  $run = function (mysqli_stmt $stmt): mysqli_stmt {
    if (!$stmt->execute()) throw new mysqli_sql_exception('log_time statement failed');
    return $stmt;
  };
  $created = false;
  $conn->begin_transaction();
  try {
    // A removed client cannot be billed. The ticket itself is real (staff
    // just opened it), so say what is wrong rather than calling it missing.
    $lock = $conn->prepare('SELECT id FROM clients WHERE id = ? AND deleted_at IS NULL FOR UPDATE');
    $lock->bind_param('i', $clientId);
    $found = $run($lock)->get_result()->fetch_assoc();
    if (!$found) {
      $conn->rollback();
      fail('This ticket\'s client was removed.', 409);
    }
    $kind = IT_SUPPORT_KIND;
    $p = $conn->prepare('SELECT id FROM projects WHERE client_id = ? AND kind = ? AND deleted_at IS NULL ORDER BY id ASC LIMIT 1 FOR UPDATE');
    $p->bind_param('is', $clientId, $kind);
    $row = $run($p)->get_result()->fetch_assoc();
    if ($row) {
      $projectId = (int)$row['id'];
    } else {
      $name = IT_SUPPORT_NAME;
      $ins = $conn->prepare("INSERT INTO projects (client_id, name, status, stage, kind) VALUES (?, ?, 'in_progress', 'support', ?)");
      $ins->bind_param('iss', $clientId, $name, $kind);
      $run($ins);
      $projectId = (int)$conn->insert_id;
      $created = true;
      // Its work reference (SQL 19), like any other new project. Loaded here
      // only, so the client branch still depends on nothing but _bootstrap.php.
      if (is_file(__DIR__ . '/_reference.php')) {
        require_once __DIR__ . '/_reference.php';
        gk_ref_assign($conn, 'projects', $projectId, true);
      }
    }
    // New entries start as 'draft', pending timesheet approval, as in time.php.
    $te = $conn->prepare("INSERT INTO time_entries (project_id, ticket_id, user_id, description, minutes, billable, status, entry_date) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)");
    $te->bind_param('iiisiis', $projectId, $id, $uid, $e['description'], $e['minutes'], $e['billable'], $e['entry_date']);
    $run($te);
    $entryId = (int)$conn->insert_id; // read before audit(), which inserts its own row
    // Audited inside the transaction, so a log is never saved unaudited.
    if ($created) audit($conn, $uid, 'project_create', IT_SUPPORT_NAME . " (client #$clientId, standing, from ticket #$id)");
    audit($conn, $uid, 'ticket_time_log', "#$id · project #$projectId · {$e['minutes']}m");
    if (!$conn->commit()) throw new mysqli_sql_exception('log_time commit failed');
  } catch (mysqli_sql_exception $ex) {
    $conn->rollback();
    fail('Could not log the time.', 500);
  }

  ok(['id' => $entryId, 'project_id' => $projectId, 'project_created' => $created], 201);
}

fail('Method not allowed.', 405);
