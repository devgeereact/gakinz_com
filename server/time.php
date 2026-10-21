<?php
/**
 * Time tracking (GAkinzOS §6 Time). Protected. Entries are logged against the
 * authenticated user.
 *
 *   GET  /time.php                  → recent entries (with project, user and ticket_id)
 *   POST /time.php?action=create    {project_id, minutes, description?, billable?, entry_date?}
 *   POST /time.php?action=delete    {id}
 *
 * IT support time is logged from a ticket (support.php?action=log_time) onto
 * the client's standing "IT support" project, with the same rules
 * (_time.php). Those entries carry ticket_id; every other entry has NULL.
 *
 * _time.php is loaded only where it is needed (tm_time_lib), so the list,
 * delete and approval routes keep working if this file is uploaded without
 * it: the list then reports ticket_id as null and create answers 503.
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager', 'editor', 'employee', 'trainer'];

/** Load _time.php on first use. False when it is not on the server. */
function tm_time_lib(): bool {
  static $loaded = null;
  if ($loaded === null) {
    $loaded = is_file(__DIR__ . '/_time.php');
    if ($loaded) require_once __DIR__ . '/_time.php';
  }
  return $loaded;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
  require_auth($conn, STAFF); // staff only
  $rows = [];
  // ticket_id links IT support time to its ticket (SQL 17); NULL before it
  // runs, or while _time.php is missing.
  $ticketCol = tm_time_lib() && gk_ticket_time_ready($conn) ? 't.ticket_id' : 'NULL AS ticket_id';
  $sql = "SELECT t.id, t.project_id, t.description, t.minutes, t.billable, t.status, t.entry_date,
                 p.name AS project_name, u.name AS user_name, t.user_id, $ticketCol
          FROM time_entries t
          JOIN projects p ON p.id = t.project_id
          LEFT JOIN users u ON u.id = t.user_id
          WHERE t.deleted_at IS NULL
          ORDER BY t.entry_date DESC, t.id DESC LIMIT 300";
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
      $r['project_id'] = (int)$r['project_id'];
      $r['minutes'] = (int)$r['minutes'];
      $r['billable'] = (bool)$r['billable'];
      $r['user_id'] = $r['user_id'] !== null ? (int)$r['user_id'] : null;
      $r['ticket_id'] = $r['ticket_id'] !== null ? (int)$r['ticket_id'] : null;
      $rows[] = $r;
    }
  }
  ok($rows);
}

if ($method === 'POST' && $action === 'create') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $projectId = (int)($in['project_id'] ?? 0);
  if ($projectId <= 0) fail('A project is required.');
  if (!tm_time_lib()) fail('Logging time is not available yet. Upload server/_time.php first.', 503);
  $e = gk_time_entry_input($in); // the same rules as support.php log_time
  $minutes = $e['minutes'];
  $desc = $e['description'];
  $billable = $e['billable'];
  $date = $e['entry_date'];
  $uid = $user['id'];

  // New entries start as 'draft' (pending a manager's timesheet approval).
  $stmt = $conn->prepare("INSERT INTO time_entries (project_id, user_id, description, minutes, billable, status, entry_date) VALUES (?, ?, ?, ?, ?, 'draft', ?)");
  $stmt->bind_param('iisiis', $projectId, $uid, $desc, $minutes, $billable, $date);
  if (!$stmt->execute()) fail('Could not log the time.', 500);
  $newId = $conn->insert_id; // read before audit(), which inserts its own row
  audit($conn, $uid, 'time_log', "project #$projectId · {$minutes}m");
  ok(['id' => $newId], 201);
}

if ($method === 'POST' && $action === 'delete') {
  $user = require_auth($conn, STAFF);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('An entry id is required.');
  // Users delete their own entries; managers+ delete any.
  $isManager = in_array($user['role'], ['super_admin', 'admin', 'manager'], true);
  if ($isManager) {
    $stmt = $conn->prepare('UPDATE time_entries SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL');
    $stmt->bind_param('i', $id);
  } else {
    $uid = $user['id'];
    $stmt = $conn->prepare('UPDATE time_entries SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL');
    $stmt->bind_param('ii', $id, $uid);
  }
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Entry not found or not yours.', 404);
  audit($conn, $user['id'], 'time_delete', "#$id");
  ok(['ok' => true]);
}

// Timesheet approval — managers and up approve/reject logged time. Only approved
// entries count as billable downstream (export, utilisation).
if ($method === 'POST' && ($action === 'approve' || $action === 'reject')) {
  $user = require_auth($conn, ['super_admin', 'admin', 'manager']);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('An entry id is required.');
  $new = $action === 'approve' ? 'approved' : 'rejected';
  $stmt = $conn->prepare('UPDATE time_entries SET status = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('si', $new, $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Entry not found.', 404);
  audit($conn, $user['id'], 'time_' . $action, "#$id");
  ok(['ok' => true]);
}

fail('Method not allowed.', 405);
