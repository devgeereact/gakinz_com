<?php
/**
 * Knowledge Base & SOPs (GAkinzOS — Knowledge). Protected.
 * Internal wiki / runbooks / client-facing help articles.
 *
 *   GET  /knowledge.php              → list (title/category/audience; ?q= search, ?category=)
 *   GET  /knowledge.php?id=N         → one article with body
 *   POST /knowledge.php?action=create {title, category?, audience?, body?}
 *   POST /knowledge.php?action=update {id, title, category?, audience?, body?}
 *   POST /knowledge.php?action=delete {id}
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager', 'trainer', 'editor', 'employee'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET' && isset($_GET['id'])) {
  require_auth($conn, STAFF);
  $id = (int)$_GET['id'];
  $stmt = $conn->prepare(
    'SELECT a.id, a.title, a.category, a.audience, a.body, a.created_at, a.updated_at, u.name AS author
     FROM kb_articles a LEFT JOIN users u ON u.id = a.author_id
     WHERE a.id = ? AND a.deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $a = $stmt->get_result()->fetch_assoc();
  if (!$a) fail('Article not found.', 404);
  $a['id'] = (int)$a['id'];
  ok($a);
}

if ($method === 'GET') {
  require_auth($conn, STAFF);
  $q = str_field($_GET, 'q', 100);
  $cat = str_field($_GET, 'category', 60);
  $rows = [];
  $sql = 'SELECT a.id, a.title, a.category, a.audience, a.updated_at, u.name AS author
          FROM kb_articles a LEFT JOIN users u ON u.id = a.author_id
          WHERE a.deleted_at IS NULL';
  $types = '';
  $args = [];
  if ($q !== '') { $sql .= ' AND a.title LIKE ?'; $types .= 's'; $args[] = '%' . $q . '%'; }
  if ($cat !== '') { $sql .= ' AND a.category = ?'; $types .= 's'; $args[] = $cat; }
  $sql .= ' ORDER BY a.updated_at DESC LIMIT 500';
  $stmt = $conn->prepare($sql);
  if ($types !== '') $stmt->bind_param($types, ...$args);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($r = $res->fetch_assoc()) { $r['id'] = (int)$r['id']; $rows[] = $r; }
  ok($rows);
}

if ($method === 'POST' && ($action === 'create' || $action === 'update')) {
  $user = require_auth($conn, STAFF);
  $in = body();
  $title = str_field($in, 'title', 200);
  if ($title === '') fail('A title is required.');
  $category = str_field($in, 'category', 60);
  if ($category === '') $category = 'General';
  $audience = str_field($in, 'audience', 20);
  if (!in_array($audience, ['internal', 'client'], true)) $audience = 'internal';
  $bodyText = str_field($in, 'body', 200000);
  $uid = $user['id'];

  if ($action === 'create') {
    $stmt = $conn->prepare('INSERT INTO kb_articles (title, category, audience, body, author_id) VALUES (?, ?, ?, ?, ?)');
    $stmt->bind_param('ssssi', $title, $category, $audience, $bodyText, $uid);
    if (!$stmt->execute()) fail('Could not create the article.', 500);
    $newId = $conn->insert_id; // read before audit(), which inserts its own row
    audit($conn, $uid, 'kb_create', $title);
    ok(['id' => $newId], 201);
  } else {
    $id = (int)($in['id'] ?? 0);
    if ($id <= 0) fail('An article id is required.');
    $stmt = $conn->prepare('UPDATE kb_articles SET title = ?, category = ?, audience = ?, body = ? WHERE id = ? AND deleted_at IS NULL');
    $stmt->bind_param('ssssi', $title, $category, $audience, $bodyText, $id);
    $stmt->execute();
    if ($stmt->affected_rows < 1) {
      // No-op update (identical content) still counts as success if the row exists.
      $chk = $conn->prepare('SELECT id FROM kb_articles WHERE id = ? AND deleted_at IS NULL LIMIT 1');
      $chk->bind_param('i', $id);
      $chk->execute();
      if (!$chk->get_result()->fetch_assoc()) fail('Article not found.', 404);
    }
    audit($conn, $uid, 'kb_update', "#$id");
    ok(['ok' => true]);
  }
}

if ($method === 'POST' && $action === 'delete') {
  $user = require_auth($conn, STAFF);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('An article id is required.');
  $stmt = $conn->prepare('UPDATE kb_articles SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Article not found.', 404);
  audit($conn, $user['id'], 'kb_delete', "#$id");
  ok(['ok' => true]);
}

fail('Method not allowed.', 405);
