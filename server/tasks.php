<?php
/**
 * Tasks within a project (GAkinzOS §6 Projects & Tasks). Protected.
 *
 *   GET  /tasks.php?project_id=N    → tasks for a project
 *   POST /tasks.php?action=create   {project_id, title, assignee?, due_date?}
 *   POST /tasks.php?action=status   {id, status}
 *
 * Kanban status: todo | doing | review | done
 */
require __DIR__ . '/_bootstrap.php';

const STATUSES = ['todo', 'doing', 'review', 'done'];
const STAFF = ['super_admin', 'admin', 'manager', 'editor', 'employee'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
  require_auth($conn, STAFF); // staff only
  $projectId = (int)($_GET['project_id'] ?? 0);
  if ($projectId <= 0) fail('A project_id is required.');
  $rows = [];
  $stmt = $conn->prepare(
    'SELECT id, project_id, title, status, assignee, due_date, created_at
     FROM tasks WHERE project_id = ? AND deleted_at IS NULL ORDER BY id ASC'
  );
  $stmt->bind_param('i', $projectId);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($r = $res->fetch_assoc()) {
    $r['id'] = (int)$r['id'];
    $r['project_id'] = (int)$r['project_id'];
    $rows[] = $r;
  }
  ok($rows);
}

if ($method === 'POST' && $action === 'create') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $projectId = (int)($in['project_id'] ?? 0);
  $title = str_field($in, 'title', 300);
  if ($projectId <= 0) fail('A project_id is required.');
  if ($title === '') fail('A task title is required.');
  $assignee = str_field($in, 'assignee', 120);
  $assignee = $assignee !== '' ? $assignee : null;
  $due = str_field($in, 'due_date', 10);
  $due = $due !== '' ? $due : null;

  $stmt = $conn->prepare('INSERT INTO tasks (project_id, title, assignee, due_date) VALUES (?, ?, ?, ?)');
  $stmt->bind_param('isss', $projectId, $title, $assignee, $due);
  if (!$stmt->execute()) fail('Could not create the task.', 500);
  $newId = $conn->insert_id; // read before audit(), which inserts its own row
  audit($conn, $user['id'], 'task_create', $title);
  ok(['id' => $newId], 201);
}

if ($method === 'POST' && $action === 'status') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $status = str_field($in, 'status', 20);
  if ($id <= 0) fail('A task id is required.');
  if (!in_array($status, STATUSES, true)) fail('Invalid status.');

  $stmt = $conn->prepare('UPDATE tasks SET status = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('si', $status, $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Task not found.', 404);
  audit($conn, $user['id'], 'task_status', "#$id → $status");
  ok(['ok' => true]);
}

fail('Method not allowed.', 405);
