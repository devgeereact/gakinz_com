<?php
/**
 * Leads / enquiries (GAkinzOS §6 Leads). The public contact form fills the
 * `enquiries` table; this endpoint reads and manages them. Protected — every
 * call requires a valid token; mutations require a staff role.
 *
 *   GET  /leads.php                    → list leads (newest first)
 *   POST /leads.php?action=status      {id, status}  → move a lead's stage
 *   POST /leads.php?action=meta        {id, tags, score, next_action_at?, next_action_note?, priority?}
 *                                       → tags, AI score and the owner's follow-up
 *
 * Follow-up fields (2026-10-10 schema step) are optional on `meta`: a key that
 * is sent is validated and saved, a key that is left out is left alone. Until
 * that ALTER runs on the live DB, the list omits them and `meta` answers
 * `followup: false` instead of failing.
 *
 * Each listed lead carries `reference`, its GK-E-YYYY-NNNN (SQL 19), or null
 * before SQL 19 or while _reference.php is not on the server. No route here
 * accepts a reference as input.
 *
 * Stages: new | contacted | proposal | won | lost
 */
require __DIR__ . '/_bootstrap.php';
if (is_file(__DIR__ . '/_reference.php')) require_once __DIR__ . '/_reference.php';

const STAGES = ['new', 'contacted', 'proposal', 'won', 'lost'];
const STAFF = ['super_admin', 'admin', 'manager', 'editor'];
const LEAD_COLS = 'id, name, email, company, budget, project_type, message, status, source, tags, score, lost_reason, created_at';
const FOLLOWUP_COLS = 'next_action_at, next_action_note, priority';

/** True when a query failed only because the follow-up columns are not there yet. */
function gk_followup_missing(Throwable $e): bool {
  return $e instanceof mysqli_sql_exception && $e->getCode() === 1054; // ER_BAD_FIELD_ERROR
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
  require_auth($conn, STAFF); // staff only — a client must never read all leads
  $rows = [];
  $cols = LEAD_COLS . ', ' . (function_exists('gk_ref_col') ? gk_ref_col($conn, 'enquiries') : 'NULL AS reference');
  $tail = ' FROM enquiries WHERE deleted_at IS NULL ORDER BY id DESC LIMIT 500';
  try {
    $res = $conn->query('SELECT ' . $cols . ', ' . FOLLOWUP_COLS . $tail);
    // With mysqli reporting off (older PHP) a missing column returns false
    // instead of throwing; never let that read as "no enquiries".
    if ($res === false && $conn->errno === 1054) $res = $conn->query('SELECT ' . $cols . $tail);
  } catch (mysqli_sql_exception $e) {
    if (!gk_followup_missing($e)) throw $e;
    $res = $conn->query('SELECT ' . $cols . $tail); // un-migrated DB: list without follow-ups
  }
  if ($res) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
      $r['score'] = (int)($r['score'] ?? 0);
      if (array_key_exists('priority', $r)) $r['priority'] = (int)$r['priority'];
      $rows[] = $r;
    }
  }
  ok($rows);
}

if ($method === 'POST' && $action === 'status') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $status = str_field($in, 'status', 30);
  if ($id <= 0) fail('A lead id is required.');
  if (!in_array($status, STAGES, true)) fail('Invalid stage.');

  // Capture a lost-reason when moving to 'lost'; clear it otherwise.
  if ($status === 'lost') {
    $reason = str_field($in, 'lost_reason', 300);
    $stmt = $conn->prepare('UPDATE enquiries SET status = ?, lost_reason = ? WHERE id = ? AND deleted_at IS NULL');
    $stmt->bind_param('ssi', $status, $reason, $id);
  } else {
    $stmt = $conn->prepare('UPDATE enquiries SET status = ?, lost_reason = NULL WHERE id = ? AND deleted_at IS NULL');
    $stmt->bind_param('si', $status, $id);
  }
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Lead not found.', 404);

  audit($conn, $user['id'], 'lead_status', "#$id → $status");
  ok(['ok' => true]);
}

if ($method === 'POST' && $action === 'meta') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  if ($id <= 0) fail('A lead id is required.');
  $tags = str_field($in, 'tags', 255);
  $score = max(0, min(3, (int)($in['score'] ?? 0)));

  // Follow-up fields: validate everything before writing anything.
  $follow = [];
  if (array_key_exists('next_action_at', $in)) {
    $d = $in['next_action_at'];
    if ($d === null || $d === '') {
      $follow['next_action_at'] = null;
    } elseif (is_string($d) && preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $d, $m) && checkdate((int)$m[2], (int)$m[3], (int)$m[1])) {
      $follow['next_action_at'] = $d;
    } else {
      fail('Invalid next action date. Use YYYY-MM-DD.');
    }
  }
  if (array_key_exists('next_action_note', $in)) {
    if ($in['next_action_note'] !== null && !is_string($in['next_action_note'])) fail('Invalid next action note.');
    $note = str_field($in, 'next_action_note', 300);
    $follow['next_action_note'] = $note === '' ? null : $note;
  }
  if (array_key_exists('priority', $in)) {
    $p = $in['priority'];
    if (is_string($p) && preg_match('/^[0-3]$/', $p)) $p = (int)$p;
    if (!is_int($p) || $p < 0 || $p > 3) fail('Invalid priority. Use 0 (none) to 3 (high).');
    $follow['priority'] = $p;
  }

  $stmt = $conn->prepare('UPDATE enquiries SET tags = ?, score = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('sii', $tags, $score, $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) {
    $chk = $conn->prepare('SELECT id FROM enquiries WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $chk->bind_param('i', $id);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) fail('Lead not found.', 404);
  }

  $out = ['ok' => true];
  if ($follow) {
    // Column names come from the fixed keys above, never from the request.
    $set = implode(', ', array_map(fn($k) => "$k = ?", array_keys($follow)));
    $types = implode('', array_map(fn($k) => $k === 'priority' ? 'i' : 's', array_keys($follow))) . 'i';
    $vals = array_values($follow);
    $vals[] = $id;
    try {
      $stmt = $conn->prepare("UPDATE enquiries SET $set WHERE id = ? AND deleted_at IS NULL");
      $stmt->bind_param($types, ...$vals);
      $stmt->execute();
      $out['followup'] = true;
    } catch (mysqli_sql_exception $e) {
      if (!gk_followup_missing($e)) throw $e;
      $out['followup'] = false; // un-migrated DB: tags and score saved, follow-up not stored
      error_log('GAkinz enquiry follow-up not stored (run the 2026-10-10 enquiries schema step): #' . $id);
    }
  }
  audit($conn, $user['id'], 'lead_meta', "#$id" . (($out['followup'] ?? false) ? ' follow-up' : ''));
  ok($out);
}

fail('Method not allowed.', 405);
