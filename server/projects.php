<?php
/**
 * Projects (GAkinzOS §6 Projects & Tasks). Protected.
 *
 *   GET  /projects.php                   → list projects (with client + task counts)
 *   GET  /projects.php?action=templates  → the project templates (_templates.php)
 *   POST /projects.php?action=create     {name, client_id?, due_date?, template?, include_client_checklist?}
 *   POST /projects.php?action=status     {id, status}
 *
 * Status: planning | in_progress | on_hold | launched
 *
 * Creating from a template: `template` is a key from _templates.php; an unknown
 * key answers 400 and creates nothing. The project, its starter tasks (due
 * the given number of days after today in PHP's time zone) and its
 * measurement rows (project_measurements, SQL 16) are always written. The
 * template's asset checklist items (project_assets, SQL 15) are written only
 * when include_client_checklist is exactly true, because the client sees them
 * in their portal straight away. Everything, the audit row included, is
 * written in one transaction, so a failure part way leaves nothing behind.
 * A table whose SQL step has not run (ER_NO_SUCH_TABLE, 1146, when its insert
 * is prepared) is skipped, not an error: the reply lists it in `skipped`, and
 * the project is still created. No brief row is written; deliverables and
 * exclusions are agreed per client.
 *
 * _templates.php is loaded only by the two template routes, so a projects.php
 * uploaded without it keeps every other route working; those two answer 503.
 */
require __DIR__ . '/_bootstrap.php';

const STATUSES = ['planning', 'in_progress', 'on_hold', 'launched'];
const STAGES = ['discover', 'design', 'build', 'launch', 'support']; // 5-stage delivery
const STAFF = ['super_admin', 'admin', 'manager', 'editor', 'employee'];
const TEMPLATES_MISSING = 'Project templates are not available yet.';

const TEMPLATE_SKIPS = [
  'project_assets' => 'Client checklist items were not added: the asset checklist needs the 2026-10-18 database update (SQL 15) first.',
  'project_measurements' => 'Measurement rows were not added: the project brief needs the 2026-10-19 database update (SQL 16) first.',
];

/** Loads _templates.php, or answers 503 when it has not been uploaded. */
function pj_load_templates(): void {
  $file = __DIR__ . '/_templates.php';
  if (!is_file($file)) fail(TEMPLATES_MISSING, 503);
  require_once $file;
}

/**
 * Prepares an insert into an optional table, or returns null when the table
 * does not exist yet (1146, its SQL step has not run). Any other error throws.
 */
function pj_prepare_optional(mysqli $conn, string $sql): ?mysqli_stmt {
  try {
    $s = $conn->prepare($sql);
  } catch (mysqli_sql_exception $e) {
    if ($e->getCode() === 1146) return null;
    throw $e;
  }
  if ($s === false) {
    if ($conn->errno === 1146) return null;
    throw new RuntimeException('Database error.');
  }
  return $s;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET' && $action === 'templates') {
  require_auth($conn, STAFF); // staff only, as creating a project is
  pj_load_templates();
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

  if ($templateKey === null) {
    $stmt = $conn->prepare('INSERT INTO projects (name, client_id, due_date) VALUES (?, ?, ?)');
    $stmt->bind_param('sis', $name, $clientId, $due);
    if (!$stmt->execute()) fail('Could not create the project.', 500);
    $newId = $conn->insert_id; // read before audit(), which inserts its own row
    audit($conn, $user['id'], 'project_create', $name);
    ok(['id' => $newId], 201);
  }

  pj_load_templates();
  $template = is_string($templateKey) ? project_template($templateKey) : null;
  if ($template === null) fail('Unknown project template.');
  // The client sees checklist items in their portal at once, so they are opt-in.
  $withChecklist = ($in['include_client_checklist'] ?? false) === true;

  // Every failure must throw so the catch rolls back, whatever config.php sets.
  mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
  $created = ['tasks' => 0, 'assets' => 0, 'measurements' => 0];
  $skipped = [];
  $today = new DateTimeImmutable('today');
  $uid = (int)$user['id'];

  try {
    // Prepared before the transaction: a missing optional table is a skip, not a failure.
    $p = $conn->prepare('INSERT INTO projects (name, client_id, due_date) VALUES (?, ?, ?)');
    $t = $conn->prepare("INSERT INTO tasks (project_id, title, status, due_date) VALUES (?, ?, 'todo', ?)");
    $a = null;
    if ($withChecklist) {
      $a = pj_prepare_optional($conn, "INSERT INTO project_assets (project_id, label, note, status, requested_by) VALUES (?, ?, ?, 'requested', ?)");
      if ($a === null) $skipped[] = ['table' => 'project_assets', 'note' => TEMPLATE_SKIPS['project_assets']];
    }
    $m = pj_prepare_optional($conn, "INSERT INTO project_measurements (project_id, label, target, method, result, kind, created_by)
                                     VALUES (?, ?, ?, ?, 'NOT TESTED', 'technical', ?)");
    if ($m === null) $skipped[] = ['table' => 'project_measurements', 'note' => TEMPLATE_SKIPS['project_measurements']];
  } catch (Throwable $e) {
    fail('Could not create the project from the template. Nothing was saved.', 500);
  }

  $conn->begin_transaction();
  try {
    $p->bind_param('sis', $name, $clientId, $due);
    $p->execute();
    $newId = $conn->insert_id;

    foreach ($template['tasks'] as $task) {
      $title = $task['title'];
      $taskDue = $today->modify('+' . (int)$task['offset_days'] . ' days')->format('Y-m-d');
      $t->bind_param('iss', $newId, $title, $taskDue);
      $t->execute();
      $created['tasks']++;
    }

    if ($a !== null) {
      foreach ($template['assets'] as $item) {
        $label = $item['label'];
        $note = $item['note'];
        $a->bind_param('issi', $newId, $label, $note, $uid);
        $a->execute();
        $created['assets']++;
      }
    }

    if ($m !== null) {
      foreach ($template['brief']['measurements'] as $row) {
        $label = $row['label'];
        $target = $row['target'];
        $howChecked = $row['method'];
        $m->bind_param('isssi', $newId, $label, $target, $howChecked, $uid);
        $m->execute();
        $created['measurements']++;
      }
    }

    audit($conn, $user['id'], 'project_create', "$name (template $templateKey: {$created['tasks']} tasks, "
      . "{$created['assets']} checklist items, {$created['measurements']} measurements)");
    $conn->commit();
  } catch (Throwable $e) {
    $conn->rollback();
    fail('Could not create the project from the template. Nothing was saved.', 500);
  }
  ok([
    'id' => $newId,
    'template' => $templateKey,
    'include_client_checklist' => $withChecklist,
    'created' => $created,
    'skipped' => $skipped,
  ], 201);
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
