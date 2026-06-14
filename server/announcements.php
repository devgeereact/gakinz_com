<?php
/**
 * Announcements / broadcasts (GAkinzOS — Collaboration). Protected.
 * Short studio-wide notices shown on the dashboard.
 *
 *   GET  /announcements.php             → recent announcements (any staff)
 *   POST /announcements.php?action=create {title, body?, level?}   (managers+)
 *   POST /announcements.php?action=delete {id}                     (managers+)
 */
require __DIR__ . '/_bootstrap.php';

const ALL_STAFF = ['super_admin', 'admin', 'manager', 'trainer', 'editor', 'employee'];
const AUTHORS = ['super_admin', 'admin', 'manager'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
  require_auth($conn, ALL_STAFF);
  $rows = [];
  $sql = 'SELECT a.id, a.title, a.body, a.level, a.created_at, u.name AS author
          FROM announcements a LEFT JOIN users u ON u.id = a.created_by
          WHERE a.deleted_at IS NULL ORDER BY a.id DESC LIMIT 50';
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) { $r['id'] = (int)$r['id']; $rows[] = $r; }
  }
  ok($rows);
}

if ($method === 'POST' && $action === 'create') {
  $user = require_auth($conn, AUTHORS);
  $in = body();
  $title = str_field($in, 'title', 200);
  if ($title === '') fail('A title is required.');
  $bodyText = str_field($in, 'body', 5000);
  $level = str_field($in, 'level', 10);
  if (!in_array($level, ['info', 'warning'], true)) $level = 'info';
  $uid = $user['id'];
  $stmt = $conn->prepare('INSERT INTO announcements (title, body, level, created_by) VALUES (?, ?, ?, ?)');
  $stmt->bind_param('sssi', $title, $bodyText, $level, $uid);
  if (!$stmt->execute()) fail('Could not post the announcement.', 500);
  $newId = $conn->insert_id;
  audit($conn, $uid, 'announcement_create', $title);
  // Best-effort broadcast to Slack (no-op if not configured).
  require_once __DIR__ . '/_slack.php';
  $prefix = $level === 'warning' ? ':warning: ' : ':loudspeaker: ';
  gk_slack_post($prefix . "*$title*" . ($bodyText !== '' ? "\n$bodyText" : ''));
  ok(['id' => $newId], 201);
}

if ($method === 'POST' && $action === 'delete') {
  $user = require_auth($conn, AUTHORS);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('An announcement id is required.');
  $stmt = $conn->prepare('UPDATE announcements SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Announcement not found.', 404);
  audit($conn, $user['id'], 'announcement_delete', "#$id");
  ok(['ok' => true]);
}

fail('Method not allowed.', 405);
