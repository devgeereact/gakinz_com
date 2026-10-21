<?php
/**
 * Private delivery feedback (docs/PRODUCT-SPEC.md section 6.3).
 *
 *   GET  /feedback.php?client_id=N     staff: one client's feedback, newest first
 *   GET  /feedback.php                 staff: all feedback, newest first
 *   POST /feedback.php?action=create   client: {project_id?, rating?, went_well?, could_improve?, follow_up_ok?, may_publish?, attribution?}
 *                                      staff:  the same plus {client_id}, for feedback received another way
 *   POST /feedback.php?action=update   staff: {id, follow_up?, owner_note?, may_publish?}
 *
 * Isolation: feedback is never returned to a `client`-role caller, not even its
 * own; every read is staff only. A client's create takes the client id from
 * the token and ignores any `client_id` sent, and a `project_id` must belong to
 * that client or the answer is 404, exactly as for a project that does not
 * exist. A client cannot set the owner's follow-up state or note.
 *
 * Publication: `may_publish` is a separate opt-in that defaults to no. It does
 * not publish anything; a testimonial is still created by hand in Testimonials.
 * Setting it back to no records a withdrawal.
 *
 * Retries: an identical submission from the same client within ten minutes
 * returns the first record instead of creating a second.
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager', 'editor'];
const FOLLOW_UP = ['new', 'following_up', 'closed'];
const FEEDBACK_MIGRATION = 'Feedback needs the 2026-10-16 database update first (docs/DEPLOYMENT.md section 5.2).';
const FEEDBACK_COLS = 'f.id, f.client_id, f.project_id, f.source, f.rating, f.went_well, f.could_improve, f.follow_up_ok,
  f.may_publish, f.attribution, f.follow_up, f.owner_note, f.created_at, f.updated_at,
  c.company AS client_company, p.name AS project_name, u.name AS submitted_by_name';
const FEEDBACK_FROM = ' FROM client_feedback f
  JOIN clients c ON c.id = f.client_id
  LEFT JOIN projects p ON p.id = f.project_id
  LEFT JOIN users u ON u.id = f.submitted_by';

function fb_stmt(mysqli $conn, string $sql): mysqli_stmt {
  $s = $conn->prepare($sql);
  if ($s === false) {
    if ($conn->errno === 1146) fail(FEEDBACK_MIGRATION, 503);
    fail('Database error.', 500);
  }
  return $s;
}

function fb_id($v): int {
  if (is_int($v)) return $v > 0 ? $v : 0;
  if (is_string($v) && preg_match('/^[1-9]\d{0,9}$/', $v)) return (int)$v;
  return 0;
}

function fb_bool(array $in, string $key): int {
  if (!array_key_exists($key, $in) || $in[$key] === null) return 0;
  if (!is_bool($in[$key])) fail("Invalid $key. Use true or false.");
  return $in[$key] ? 1 : 0;
}

function fb_text(array $in, string $key, int $max): ?string {
  if (!array_key_exists($key, $in) || $in[$key] === null) return null;
  if (!is_string($in[$key])) fail("Invalid $key.");
  $v = str_field($in, $key, $max);
  return $v === '' ? null : $v;
}

function fb_shape(array $r): array {
  return [
    'id'            => (int)$r['id'],
    'client_id'     => (int)$r['client_id'],
    'client_company'=> $r['client_company'],
    'project_id'    => $r['project_id'] !== null ? (int)$r['project_id'] : null,
    'project_name'  => $r['project_name'],
    'source'        => $r['source'],
    'rating'        => $r['rating'] !== null ? (int)$r['rating'] : null,
    'went_well'     => $r['went_well'],
    'could_improve' => $r['could_improve'],
    'follow_up_ok'  => (bool)$r['follow_up_ok'],
    'may_publish'   => (bool)$r['may_publish'],
    'attribution'   => $r['attribution'],
    'follow_up'     => $r['follow_up'],
    'owner_note'    => $r['owner_note'],
    'submitted_by'  => $r['submitted_by_name'],
    'created_at'    => $r['created_at'],
    'updated_at'    => $r['updated_at'],
  ];
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
  if ($method === 'GET') {
    // Staff only. A client gets 403 here, so private feedback never reaches a client.
    require_auth($conn, STAFF);
    if (isset($_GET['client_id'])) {
      $cid = fb_id($_GET['client_id']);
      if ($cid <= 0) fail('Invalid client id.');
      $s = fb_stmt($conn, 'SELECT ' . FEEDBACK_COLS . FEEDBACK_FROM . ' WHERE f.deleted_at IS NULL AND f.client_id = ? ORDER BY f.id DESC LIMIT 200');
      $s->bind_param('i', $cid);
    } else {
      $s = fb_stmt($conn, 'SELECT ' . FEEDBACK_COLS . FEEDBACK_FROM . ' WHERE f.deleted_at IS NULL AND c.deleted_at IS NULL ORDER BY f.id DESC LIMIT 500');
    }
    $s->execute();
    ok(array_map('fb_shape', $s->get_result()->fetch_all(MYSQLI_ASSOC)));
  }

  if ($method === 'POST' && $action === 'create') {
    $user = require_auth($conn, array_merge(STAFF, ['client']));
    $in = body();
    $isClient = $user['role'] === 'client';

    if ($isClient) {
      // Isolation: the client comes from the token. Any client_id in the body is ignored.
      $clientId = (int)($user['client_id'] ?? 0);
      if ($clientId <= 0) fail('Your account is not linked to a client.', 403);
      $source = 'portal';
    } else {
      $clientId = fb_id($in['client_id'] ?? null);
      if ($clientId <= 0) fail('A client id is required.');
      $source = 'owner';
    }
    $s = fb_stmt($conn, 'SELECT id FROM clients WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $s->bind_param('i', $clientId);
    $s->execute();
    if (!$s->get_result()->fetch_assoc()) fail('Client not found.', 404);

    $projectId = null;
    if (array_key_exists('project_id', $in) && $in['project_id'] !== null && $in['project_id'] !== '') {
      $projectId = fb_id($in['project_id']);
      if ($projectId <= 0) fail('Invalid project id.');
      // Another client's project answers exactly as a missing one does.
      $s = fb_stmt($conn, 'SELECT id FROM projects WHERE id = ? AND client_id = ? AND deleted_at IS NULL LIMIT 1');
      $s->bind_param('ii', $projectId, $clientId);
      $s->execute();
      if (!$s->get_result()->fetch_assoc()) fail('Project not found.', 404);
    }

    $rating = null;
    if (array_key_exists('rating', $in) && $in['rating'] !== null && $in['rating'] !== '') {
      $r = $in['rating'];
      if (is_string($r) && preg_match('/^[1-5]$/', $r)) $r = (int)$r;
      if (!is_int($r) || $r < 1 || $r > 5) fail('The rating is optional, from 1 to 5.');
      $rating = $r;
    }
    $wentWell = fb_text($in, 'went_well', 5000);
    $improve = fb_text($in, 'could_improve', 5000);
    if ($rating === null && $wentWell === null && $improve === null) {
      fail('Add a rating or a few words before sending.');
    }
    $followUpOk = fb_bool($in, 'follow_up_ok');
    $mayPublish = fb_bool($in, 'may_publish');
    // An attribution only means something alongside permission to quote.
    $attribution = $mayPublish ? fb_text($in, 'attribution', 200) : null;

    // A retried submission returns the first record rather than a duplicate.
    $s = fb_stmt($conn, 'SELECT id FROM client_feedback WHERE client_id = ? AND deleted_at IS NULL
      AND created_at > NOW() - INTERVAL 10 MINUTE AND source = ?
      AND rating <=> ? AND went_well <=> ? AND could_improve <=> ? AND project_id <=> ? LIMIT 1');
    $s->bind_param('isissi', $clientId, $source, $rating, $wentWell, $improve, $projectId);
    $s->execute();
    if ($dup = $s->get_result()->fetch_assoc()) {
      ok($isClient ? ['ok' => true, 'duplicate' => true] : ['id' => (int)$dup['id'], 'duplicate' => true]);
    }

    $s = fb_stmt($conn, 'INSERT INTO client_feedback (client_id, project_id, source, rating, went_well, could_improve, follow_up_ok, may_publish, attribution, submitted_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $s->bind_param('iisissiisi', $clientId, $projectId, $source, $rating, $wentWell, $improve, $followUpOk, $mayPublish, $attribution, $user['id']);
    $s->execute();
    $id = (int)$conn->insert_id; // before audit(), which inserts its own row
    audit($conn, $user['id'], 'feedback_create', "#$id client #$clientId $source" . ($mayPublish ? ' may publish' : ''));
    // A client learns only that it was received; nothing private comes back.
    ok($isClient ? ['ok' => true] : ['id' => $id], 201);
  }

  if ($method === 'POST' && $action === 'update') {
    $user = require_auth($conn, STAFF);
    $in = body();
    $id = fb_id($in['id'] ?? null);
    if ($id <= 0) fail('A feedback id is required.');
    $s = fb_stmt($conn, 'SELECT id, follow_up, may_publish FROM client_feedback WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $s->bind_param('i', $id);
    $s->execute();
    $cur = $s->get_result()->fetch_assoc();
    if (!$cur) fail('Feedback not found.', 404);

    $set = [];
    $types = '';
    $vals = [];
    $detail = [];
    if (array_key_exists('follow_up', $in)) {
      if (!is_string($in['follow_up']) || !in_array($in['follow_up'], FOLLOW_UP, true)) fail('Invalid follow-up state.');
      $set[] = 'follow_up = ?'; $types .= 's'; $vals[] = $in['follow_up'];
      $detail[] = 'follow-up ' . $in['follow_up'];
    }
    if (array_key_exists('owner_note', $in)) {
      $set[] = 'owner_note = ?'; $types .= 's'; $vals[] = fb_text($in, 'owner_note', 1000);
      $detail[] = 'note';
    }
    if (array_key_exists('may_publish', $in)) {
      $mp = fb_bool($in, 'may_publish');
      $set[] = 'may_publish = ?'; $types .= 'i'; $vals[] = $mp;
      if (!$mp) { $set[] = 'attribution = NULL'; }
      if ($mp !== (int)$cur['may_publish']) $detail[] = $mp ? 'permission recorded' : 'permission withdrawn';
    }
    if (!$set) fail('Nothing to update.');
    $types .= 'i';
    $vals[] = $id;
    // Column names come from the fixed keys above, never from the request.
    $s = fb_stmt($conn, 'UPDATE client_feedback SET ' . implode(', ', $set) . ' WHERE id = ? AND deleted_at IS NULL');
    $s->bind_param($types, ...$vals);
    $s->execute();
    audit($conn, $user['id'], 'feedback_update', "#$id " . implode(', ', $detail));

    $s = fb_stmt($conn, 'SELECT ' . FEEDBACK_COLS . FEEDBACK_FROM . ' WHERE f.id = ? LIMIT 1');
    $s->bind_param('i', $id);
    $s->execute();
    ok(fb_shape($s->get_result()->fetch_assoc()));
  }
} catch (mysqli_sql_exception $e) {
  if ($e->getCode() === 1146) fail(FEEDBACK_MIGRATION, 503); // ER_NO_SUCH_TABLE: the SQL step has not run
  throw $e;
}

fail('Method not allowed.', 405);
