<?php
/**
 * Projects (GAkinzOS §6 Projects & Tasks). Protected.
 *
 *   GET  /projects.php                   → list projects (with client + task counts)
 *   GET  /projects.php?action=templates  → the project templates (_templates.php)
 *   POST /projects.php?action=create     {name, client_id?, due_date?, template?}
 *   POST /projects.php?action=status     {id, status}
 *
 * Status: planning | in_progress | on_hold | launched
 *
 * Creating from a template: `template` is a key from _templates.php; an unknown
 * key answers 400 and creates nothing. The project, its starter tasks (due
 * the given number of days after today), its asset checklist items
 * (project_assets, SQL 15) and its measurement rows (project_measurements,
 * SQL 16) are written in one transaction, so a failure part way leaves no
 * project behind. A table whose SQL step has not run is skipped, not an
 * error: the reply lists it in `skipped`, and the project is still created.
 * No brief row is written; deliverables and exclusions are agreed per client.
 */
require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_templates.php';

const STATUSES = ['planning', 'in_progress', 'on_hold', 'launched'];
const STAGES = ['discover', 'design', 'build', 'launch', 'support']; // 5-stage delivery
const STAFF = ['super_admin', 'admin', 'manager', 'editor', 'employee'];

/** Whether a table exists in this database (an SQL step may not have run yet). */
function pj_table_exists(mysqli $conn, string $table): bool {
  $s = $conn->prepare('SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?');
  $s->bind_param('s', $table);
  $s->execute();
  return (int)$s->get_result()->fetch_row()[0] > 0;
}

const TEMPLATE_SKIPS = [
  'project_assets' => 'Asset checklist items were not added: the asset checklist needs the 2026-10-18 database update (SQL 15) first.',
  'project_measurements' => 'Measurement rows were not added: the project brief needs the 2026-10-19 database update (SQL 16) first.',
];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET' && $action === 'templates') {
  require_auth($conn, STAFF); // staff only, as creating a project is
  ok(project_template_list());
}

if ($method === 'GET') {
  require_auth($conn, STAFF); // staff only
  $rows = [];
  $sql = 'SELECT p.id, p.name, p.status, p.stage, p.due_date, p.client_id, c.company AS client_company,
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

  $templateKey = $in['template'] ?? null;
  if ($templateKey === '') $templateKey = null;
  $template = null;
  if ($templateKey !== null) {
    if (!is_string($templateKey) || ($template = project_template($templateKey)) === null) fail('Unknown project template.');
  }

  if ($template === null) {
    $stmt = $conn->prepare('INSERT INTO projects (name, client_id, due_date) VALUES (?, ?, ?)');
    $stmt->bind_param('sis', $name, $clientId, $due);
    if (!$stmt->execute()) fail('Could not create the project.', 500);
    $newId = $conn->insert_id; // read before audit(), which inserts its own row
    audit($conn, $user['id'], 'project_create', $name);
    ok(['id' => $newId], 201);
  }

  // Decided before the transaction starts, so a missing table is a skip, not a failure.
  $skipped = [];
  $have = [];
  foreach (TEMPLATE_SKIPS as $table => $note) {
    $have[$table] = pj_table_exists($conn, $table);
    if (!$have[$table]) $skipped[] = ['table' => $table, 'note' => $note];
  }
  $created = ['tasks' => 0, 'assets' => 0, 'measurements' => 0];
  $today = new DateTimeImmutable('today');
  $uid = (int)$user['id'];

  // Every failure must throw so the catch rolls back, whatever config.php sets.
  mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
  $conn->begin_transaction();
  try {
    $stmt = $conn->prepare('INSERT INTO projects (name, client_id, due_date) VALUES (?, ?, ?)');
    $stmt->bind_param('sis', $name, $clientId, $due);
    $stmt->execute();
    $newId = $conn->insert_id;

    $t = $conn->prepare("INSERT INTO tasks (project_id, title, status, due_date) VALUES (?, ?, 'todo', ?)");
    foreach ($template['tasks'] as $task) {
      $title = $task['title'];
      $taskDue = $today->modify('+' . (int)$task['offset_days'] . ' days')->format('Y-m-d');
      $t->bind_param('iss', $newId, $title, $taskDue);
      $t->execute();
      $created['tasks']++;
    }

    if ($have['project_assets']) {
      $a = $conn->prepare("INSERT INTO project_assets (project_id, label, note, status, requested_by) VALUES (?, ?, ?, 'requested', ?)");
      foreach ($template['assets'] as $item) {
        $label = $item['label'];
        $note = $item['note'];
        $a->bind_param('issi', $newId, $label, $note, $uid);
        $a->execute();
        $created['assets']++;
      }
    }

    if ($have['project_measurements']) {
      $m = $conn->prepare("INSERT INTO project_measurements (project_id, label, target, method, result, kind, created_by)
                           VALUES (?, ?, ?, ?, 'NOT TESTED', 'technical', ?)");
      foreach ($template['brief']['measurements'] as $row) {
        $label = $row['label'];
        $target = $row['target'];
        $howChecked = $row['method'];
        $m->bind_param('isssi', $newId, $label, $target, $howChecked, $uid);
        $m->execute();
        $created['measurements']++;
      }
    }
    $conn->commit();
  } catch (Throwable $e) {
    $conn->rollback();
    fail('Could not create the project from the template. Nothing was saved.', 500);
  }
  audit($conn, $user['id'], 'project_create', "$name (template $templateKey: {$created['tasks']} tasks, "
    . "{$created['assets']} assets, {$created['measurements']} measurements)");
  ok(['id' => $newId, 'template' => $templateKey, 'created' => $created, 'skipped' => $skipped], 201);
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

if ($method === 'POST' && $action === 'stage') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $stage = str_field($in, 'stage', 20);
  if ($id <= 0) fail('A project id is required.');
  if (!in_array($stage, STAGES, true)) fail('Invalid stage.');

  $stmt = $conn->prepare('UPDATE projects SET stage = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('si', $stage, $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Project not found.', 404);
  audit($conn, $user['id'], 'project_stage', "#$id → $stage");
  ok(['ok' => true]);
}

fail('Method not allowed.', 405);
