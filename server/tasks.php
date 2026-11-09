<?php
/**
 * Tasks within a project (GAkinzOS §6 Projects & Tasks). Protected.
 *
 *   GET  /tasks.php?project_id=N    → tasks for a project
 *   POST /tasks.php?action=create   {project_id, title, assignee?, due_date?}
 *   POST /tasks.php?action=update   {id, title?, assignee?, due_date?} → {ok}. A field that is not sent keeps its
 *                                   value; an empty assignee or due_date clears it (Phase 7, D-059).
 *   POST /tasks.php?action=status   {id, status}
 *
 * Kanban status: todo | doing | review | done
 */
require __DIR__ . '/_bootstrap.php';

const STATUSES = ['todo', 'doing', 'review', 'done'];
const STAFF = ['super_admin', 'admin', 'manager', 'editor', 'employee'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

/** A due date as YYYY-MM-DD, or null when empty. Anything else that is not a real date refuses the request. */
function task_due(string $raw): ?string {
  if ($raw === '') return null;
  $d = DateTime::createFromFormat('!Y-m-d', $raw);
  if (!$d || $d->format('Y-m-d') !== $raw) fail('The due date must be a real date written YYYY-MM-DD.');
  return $raw;
}

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
  $due = task_due(str_field($in, 'due_date', 10));

  $stmt = $conn->prepare('INSERT INTO tasks (project_id, title, assignee, due_date) VALUES (?, ?, ?, ?)');
  $stmt->bind_param('isss', $projectId, $title, $assignee, $due);
  if (!$stmt->execute()) fail('Could not create the task.', 500);
  $newId = $conn->insert_id; // read before audit(), which inserts its own row
  audit($conn, $user['id'], 'task_create', $title);
  ok(['id' => $newId], 201);
}

if ($method === 'POST' && $action === 'update') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  if ($id <= 0) fail('A task id is required.');
  $stored = gk_live_row($conn, 'tasks', $id, ['title', 'assignee', 'due_date']);
  if (!$stored) fail('Task not found.', 404);
  $in += $stored; // a field the request did not send keeps its stored value
  $title = str_field($in, 'title', 300);
  if ($title === '') fail('A task title is required.');
  $assignee = str_field($in, 'assignee', 120);
  $assignee = $assignee !== '' ? $assignee : null;
  $due = task_due(str_field($in, 'due_date', 10));

  $stmt = $conn->prepare('UPDATE tasks SET title = ?, assignee = ?, due_date = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('sssi', $title, $assignee, $due, $id);
  if (!$stmt->execute()) fail('Could not update the task.', 500);
  audit($conn, $user['id'], 'task_update', "#$id");
  ok(['ok' => true]);
}

if ($method === 'POST' && $action === 'status') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $status = str_field($in, 'status', 20);
  if ($id <= 0) fail('A task id is required.');
  if (!in_array($status, STATUSES, true)) fail('Invalid status.');

  // Look the task up: a move to the status it already has changes no row, and that is not "not found".
  if (!gk_live_row($conn, 'tasks', $id, ['status'])) fail('Task not found.', 404);
  $stmt = $conn->prepare('UPDATE tasks SET status = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('si', $status, $id);
  $stmt->execute();
  audit($conn, $user['id'], 'task_status', "#$id → $status");
  ok(['ok' => true]);
}

fail('Method not allowed.', 405);
