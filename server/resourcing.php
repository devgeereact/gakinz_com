<?php
/**
 * Resourcing & Capacity (GAkinzOS — Resourcing). Protected.
 * Team capacity is derived live from this week's logged time; plus leave/holiday
 * tracking so start dates aren't over-promised.
 *
 *   GET  /resourcing.php             → { team[], leave[] }
 *   POST /resourcing.php?action=leave  {user_id, start_date, end_date, type?, note?}
 *   POST /resourcing.php?action=delete {id}
 *
 * Capacity assumption: WEEKLY_CAPACITY_MIN minutes (40h) per person.
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager'];
const WEEKLY_CAPACITY_MIN = 2400; // 40h

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
  require_auth($conn, STAFF);

  // Team with this-week logged minutes (Monday-based week) + an on-leave flag.
  $team = [];
  $sql =
    "SELECT u.id, u.name, u.role,
            COALESCE((SELECT SUM(t.minutes) FROM time_entries t
                      WHERE t.user_id = u.id AND t.deleted_at IS NULL
                        AND t.entry_date >= (CURRENT_DATE - INTERVAL WEEKDAY(CURRENT_DATE) DAY)), 0) AS logged_minutes,
            EXISTS(SELECT 1 FROM leave_entries l
                   WHERE l.user_id = u.id AND l.deleted_at IS NULL
                     AND CURRENT_DATE BETWEEN l.start_date AND l.end_date) AS on_leave
     FROM users u
     WHERE u.deleted_at IS NULL AND u.status = 'active' AND u.role <> 'client'
     ORDER BY u.name ASC";
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
      $r['logged_minutes'] = (int)$r['logged_minutes'];
      $r['capacity_minutes'] = WEEKLY_CAPACITY_MIN;
      $r['on_leave'] = (bool)$r['on_leave'];
      $team[] = $r;
    }
  }

  // Upcoming + current leave.
  $leave = [];
  $sql =
    'SELECT l.id, l.user_id, u.name AS user_name, l.start_date, l.end_date, l.type, l.note
     FROM leave_entries l JOIN users u ON u.id = l.user_id
     WHERE l.deleted_at IS NULL AND l.end_date >= CURRENT_DATE
     ORDER BY l.start_date ASC LIMIT 200';
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
      $r['user_id'] = (int)$r['user_id'];
      $leave[] = $r;
    }
  }

  ok(['team' => $team, 'leave' => $leave]);
}

if ($method === 'POST' && $action === 'leave') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $uid = (int)($in['user_id'] ?? 0);
  $start = str_field($in, 'start_date', 10);
  $end = str_field($in, 'end_date', 10);
  $type = str_field($in, 'type', 20);
  $note = str_field($in, 'note', 300);
  if ($uid <= 0) fail('A team member is required.');
  if ($start === '' || $end === '') fail('Start and end dates are required.');
  if ($end < $start) fail('The end date is before the start date.');
  if (!in_array($type, ['holiday', 'sick', 'other'], true)) $type = 'holiday';

  $stmt = $conn->prepare('INSERT INTO leave_entries (user_id, start_date, end_date, type, note) VALUES (?, ?, ?, ?, ?)');
  $stmt->bind_param('issss', $uid, $start, $end, $type, $note);
  if (!$stmt->execute()) fail('Could not record the leave.', 500);
  audit($conn, $user['id'], 'leave_create', "user #$uid $start→$end");
  ok(['id' => $conn->insert_id], 201);
}

if ($method === 'POST' && $action === 'delete') {
  $user = require_auth($conn, STAFF);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('A leave id is required.');
  $stmt = $conn->prepare('UPDATE leave_entries SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Leave not found.', 404);
  audit($conn, $user['id'], 'leave_delete', "#$id");
  ok(['ok' => true]);
}

fail('Method not allowed.', 405);
