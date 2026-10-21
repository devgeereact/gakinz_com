<?php
/**
 * Design Workspace (GAkinzOS — Design). Protected.
 * Figma review rounds per project, with a 2-round limit (the studio's policy)
 * and a client comment + sign-off.
 *
 *   GET  /design.php                 → all reviews (with project + client)
 *   GET  /design.php?project_id=N    → reviews for one project
 *   POST /design.php?action=create   {project_id, title, figma_url?}   (round auto-assigned; max 2)
 *   POST /design.php?action=status   {id, status, client_comment?}     status: pending | approved | changes
 *   POST /design.php?action=delete   {id}
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager', 'editor'];
const MAX_ROUNDS = 2;

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
  require_auth($conn, STAFF);
  $where = 'd.deleted_at IS NULL';
  $pid = isset($_GET['project_id']) ? (int)$_GET['project_id'] : 0;
  // The project filter is bound rather than concatenated: prepared statements
  // only, even for a value that has already been cast to an integer.
  $sql = "SELECT d.id, d.project_id, d.title, d.figma_url, d.round, d.status, d.client_comment,
                 d.created_at, p.name AS project_name, c.company AS client_company
          FROM design_reviews d
          JOIN projects p ON p.id = d.project_id
          LEFT JOIN clients c ON c.id = p.client_id
          WHERE $where" . ($pid > 0 ? ' AND d.project_id = ?' : '') . '
          ORDER BY d.project_id DESC, d.round ASC, d.id ASC LIMIT 500';
  $rows = [];
  $stmt = $conn->prepare($sql);
  if (!$stmt) fail('Could not list design reviews.', 500);
  if ($pid > 0) $stmt->bind_param('i', $pid);
  $stmt->execute();
  if ($res = $stmt->get_result()) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
      $r['project_id'] = (int)$r['project_id'];
      $r['round'] = (int)$r['round'];
      $rows[] = $r;
    }
  }
  ok($rows);
}

if ($method === 'POST' && $action === 'create') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $projectId = (int)($in['project_id'] ?? 0);
  $title = str_field($in, 'title', 200);
  $figma = str_field($in, 'figma_url', 500);
  if ($projectId <= 0) fail('A project is required.');
  if ($title === '') fail('A title is required.');

  // Enforce the 2-round limit per project.
  $stmt = $conn->prepare('SELECT COUNT(*) AS c, COALESCE(MAX(round),0) AS mx FROM design_reviews WHERE project_id = ? AND deleted_at IS NULL');
  $stmt->bind_param('i', $projectId);
  $stmt->execute();
  $agg = $stmt->get_result()->fetch_assoc();
  if ((int)$agg['c'] >= MAX_ROUNDS) fail('This project already has the maximum of ' . MAX_ROUNDS . ' review rounds.', 409);
  $round = (int)$agg['mx'] + 1;

  $uid = $user['id'];
  $stmt = $conn->prepare('INSERT INTO design_reviews (project_id, title, figma_url, round, created_by) VALUES (?, ?, ?, ?, ?)');
  $stmt->bind_param('issii', $projectId, $title, $figma, $round, $uid);
  if (!$stmt->execute()) fail('Could not create the review.', 500);
  $newId = $conn->insert_id; // read before audit(), which inserts its own row
  audit($conn, $uid, 'design_review_create', "project #$projectId round $round");
  ok(['id' => $newId, 'round' => $round], 201);
}

if ($method === 'POST' && $action === 'status') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $status = str_field($in, 'status', 20);
  $comment = str_field($in, 'client_comment', 2000);
  if ($id <= 0) fail('A review id is required.');
  if (!in_array($status, ['pending', 'approved', 'changes'], true)) fail('Invalid status.');
  $stmt = $conn->prepare('UPDATE design_reviews SET status = ?, client_comment = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('ssi', $status, $comment, $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Review not found.', 404);
  audit($conn, $user['id'], 'design_review_status', "#$id → $status");
  ok(['ok' => true]);
}

if ($method === 'POST' && $action === 'delete') {
  $user = require_auth($conn, STAFF);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('A review id is required.');
  $stmt = $conn->prepare('UPDATE design_reviews SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Review not found.', 404);
  audit($conn, $user['id'], 'design_review_delete', "#$id");
  ok(['ok' => true]);
}

fail('Method not allowed.', 405);
