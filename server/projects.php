<?php
/**
 * Projects (GAkinzOS §6 Projects & Tasks). Protected.
 *
 *   GET  /projects.php                → list projects (with client + task counts)
 *   POST /projects.php?action=create  {name, client_id?, due_date?}
 *   POST /projects.php?action=status  {id, status}
 *
 * Status: planning | in_progress | on_hold | launched
 */
require __DIR__ . '/_bootstrap.php';

const STATUSES = ['planning', 'in_progress', 'on_hold', 'launched'];
const STAFF = ['super_admin', 'admin', 'manager', 'editor', 'employee'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
  require_auth($conn, STAFF); // staff only
  $rows = [];
  $sql = 'SELECT p.id, p.name, p.status, p.due_date, p.client_id, c.company AS client_company,
                 (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.deleted_at IS NULL) AS task_count,
                 (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.deleted_at IS NULL AND t.status = "done") AS done_count,
                 p.created_at
          FROM projects p LEFT JOIN clients c ON c.id = p.client_id
          WHERE p.deleted_at IS NULL ORDER BY p.id DESC LIMIT 500';
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
      $r['client_id'] = $r['client_id'] !== null ? (int)$r['client_id'] : null;
      $r['task_count'] = (int)$r['task_count'];
      $r['done_count'] = (int)$r['done_count'];
      $rows[] = $r;
    }
  }
  ok($rows);
}

if ($method === 'POST' && $action === 'create') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $name = str_field($in, 'name', 200);
  if ($name === '') fail('A project name is required.');
  $clientId = isset($in['client_id']) && $in['client_id'] !== '' ? (int)$in['client_id'] : null;
  $due = str_field($in, 'due_date', 10);
  $due = $due !== '' ? $due : null;

  $stmt = $conn->prepare('INSERT INTO projects (name, client_id, due_date) VALUES (?, ?, ?)');
  $stmt->bind_param('sis', $name, $clientId, $due);
  if (!$stmt->execute()) fail('Could not create the project.', 500);
  audit($conn, $user['id'], 'project_create', $name);
  ok(['id' => $conn->insert_id], 201);
}

if ($method === 'POST' && $action === 'status') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $status = str_field($in, 'status', 30);
  if ($id <= 0) fail('A project id is required.');
  if (!in_array($status, STATUSES, true)) fail('Invalid status.');

  $stmt = $conn->prepare('UPDATE projects SET status = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('si', $status, $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Project not found.', 404);
  audit($conn, $user['id'], 'project_status', "#$id → $status");
  ok(['ok' => true]);
}

fail('Method not allowed.', 405);
