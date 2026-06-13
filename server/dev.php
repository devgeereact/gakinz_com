<?php
/**
 * Development Pipeline (GAkinzOS — Dev). Protected.
 * Per-project repo + environment URLs + JSON build/QA checklist, plus a deploy log.
 *
 *   GET  /dev.php                    → projects with their dev meta + deploy count
 *   GET  /dev.php?project_id=N       → { meta, deploys[] } for one project
 *   POST /dev.php?action=meta        {project_id, repo_url?, staging_url?, prod_url?, checklist?}
 *   POST /dev.php?action=deploy      {project_id, environment, status?, url?, notes?}
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager', 'editor', 'employee'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET' && isset($_GET['project_id'])) {
  require_auth($conn, STAFF);
  $pid = (int)$_GET['project_id'];

  $stmt = $conn->prepare('SELECT project_id, repo_url, staging_url, prod_url, checklist FROM project_dev WHERE project_id = ? LIMIT 1');
  $stmt->bind_param('i', $pid);
  $stmt->execute();
  $meta = $stmt->get_result()->fetch_assoc();
  if ($meta) $meta['project_id'] = (int)$meta['project_id'];

  $deploys = [];
  $stmt = $conn->prepare(
    'SELECT d.id, d.environment, d.status, d.url, d.notes, d.created_at, u.name AS by_name
     FROM deploys d LEFT JOIN users u ON u.id = d.created_by
     WHERE d.project_id = ? ORDER BY d.id DESC LIMIT 200'
  );
  $stmt->bind_param('i', $pid);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($r = $res->fetch_assoc()) {
    $r['id'] = (int)$r['id'];
    $deploys[] = $r;
  }
  ok(['meta' => $meta, 'deploys' => $deploys]);
}

if ($method === 'GET') {
  require_auth($conn, STAFF);
  $rows = [];
  $sql = 'SELECT p.id, p.name, p.status, c.company AS client_company,
                 pd.repo_url, pd.staging_url, pd.prod_url,
                 (SELECT COUNT(*) FROM deploys d WHERE d.project_id = p.id) AS deploy_count
          FROM projects p
          LEFT JOIN clients c ON c.id = p.client_id
          LEFT JOIN project_dev pd ON pd.project_id = p.id
          WHERE p.deleted_at IS NULL ORDER BY p.id DESC LIMIT 500';
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
      $r['deploy_count'] = (int)$r['deploy_count'];
      $rows[] = $r;
    }
  }
  ok($rows);
}

if ($method === 'POST' && $action === 'meta') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $pid = (int)($in['project_id'] ?? 0);
  if ($pid <= 0) fail('A project is required.');
  $repo = str_field($in, 'repo_url', 500);
  $staging = str_field($in, 'staging_url', 500);
  $prod = str_field($in, 'prod_url', 500);
  // checklist is a {key:bool} object; store as compact JSON.
  $checklist = isset($in['checklist']) && is_array($in['checklist']) ? json_encode($in['checklist']) : null;

  // Upsert.
  $stmt = $conn->prepare(
    'INSERT INTO project_dev (project_id, repo_url, staging_url, prod_url, checklist)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE repo_url = VALUES(repo_url), staging_url = VALUES(staging_url),
                             prod_url = VALUES(prod_url), checklist = VALUES(checklist)'
  );
  $stmt->bind_param('issss', $pid, $repo, $staging, $prod, $checklist);
  if (!$stmt->execute()) fail('Could not save the pipeline.', 500);
  audit($conn, $user['id'], 'dev_meta', "project #$pid");
  ok(['ok' => true]);
}

if ($method === 'POST' && $action === 'deploy') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $pid = (int)($in['project_id'] ?? 0);
  $env = str_field($in, 'environment', 20);
  $status = str_field($in, 'status', 20);
  $url = str_field($in, 'url', 500);
  $notes = str_field($in, 'notes', 500);
  if ($pid <= 0) fail('A project is required.');
  if (!in_array($env, ['staging', 'production'], true)) fail('Invalid environment.');
  if (!in_array($status, ['success', 'failed', 'rolled_back'], true)) $status = 'success';
  $uid = $user['id'];
  $stmt = $conn->prepare('INSERT INTO deploys (project_id, environment, status, url, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)');
  $stmt->bind_param('issssi', $pid, $env, $status, $url, $notes, $uid);
  if (!$stmt->execute()) fail('Could not log the deploy.', 500);
  audit($conn, $uid, 'deploy_log', "project #$pid $env $status");
  ok(['id' => $conn->insert_id], 201);
}

fail('Method not allowed.', 405);
