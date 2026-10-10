<?php
/**
 * Blog (GAkinzOS — Blog module → public site).
 *
 * PUBLIC (no auth):
 *   GET  /blog.php              → published posts (no body), newest first
 *   GET  /blog.php?slug=foo     → one published post (with body)
 *
 * STAFF (require_auth EDITORS):
 *   GET  /blog.php?all=1        → every post incl. drafts (no body)
 *   GET  /blog.php?id=7         → one post incl. drafts, with body (editors), for the edit form
 *   POST /blog.php?action=create {title, slug?, excerpt?, body?, category?, cover?, read_mins?, status?}
 *   POST /blog.php?action=update {id, ...}
 *   POST /blog.php?action=publish {id, status}      -- draft | published
 *   POST /blog.php?action=delete {id}
 */
require __DIR__ . '/_bootstrap.php';

const EDITORS = ['super_admin', 'admin', 'manager', 'editor'];
const COVERS = ['article', 'studio', 'retail', 'pro', 'health'];

function slugify(string $s): string {
  $s = strtolower(trim($s));
  $s = preg_replace('/[^a-z0-9]+/', '-', $s);
  return trim($s, '-') ?: 'post';
}

function unique_slug(mysqli $conn, string $base, int $ignoreId = 0): string {
  $slug = $base;
  $n = 1;
  while (true) {
    $stmt = $conn->prepare('SELECT id FROM posts WHERE slug = ? AND id <> ? AND deleted_at IS NULL LIMIT 1');
    $stmt->bind_param('si', $slug, $ignoreId);
    $stmt->execute();
    if (!$stmt->get_result()->fetch_assoc()) return $slug;
    $n++;
    $slug = $base . '-' . $n;
  }
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── Public: single published post by slug ────────────────────────────────────
if ($method === 'GET' && isset($_GET['slug'])) {
  $slug = str_field($_GET, 'slug', 200);
  $stmt = $conn->prepare(
    'SELECT p.id, p.slug, p.title, p.excerpt, p.body, p.category, p.cover, p.read_mins,
            p.published_at, u.name AS author
     FROM posts p LEFT JOIN users u ON u.id = p.author_id
     WHERE p.slug = ? AND p.status = "published" AND p.deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('s', $slug);
  $stmt->execute();
  $p = $stmt->get_result()->fetch_assoc();
  if (!$p) fail('Post not found.', 404);
  $p['id'] = (int)$p['id'];
  $p['read_mins'] = (int)$p['read_mins'];
  ok($p);
}

// ── Staff: one post by id, any status, with body (the edit form loads this) ──
if ($method === 'GET' && isset($_GET['id'])) {
  require_auth($conn, EDITORS);
  $id = (int)$_GET['id'];
  $stmt = $conn->prepare(
    'SELECT id, slug, title, excerpt, body, category, cover, read_mins, status, published_at, updated_at
     FROM posts WHERE id = ? AND deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $p = $stmt->get_result()->fetch_assoc();
  if (!$p) fail('Post not found.', 404);
  $p['id'] = (int)$p['id'];
  $p['read_mins'] = (int)$p['read_mins'];
  ok($p);
}

// ── Staff: full list incl. drafts ────────────────────────────────────────────
if ($method === 'GET' && isset($_GET['all'])) {
  require_auth($conn, EDITORS);
  $rows = [];
  $res = $conn->query(
    'SELECT id, slug, title, category, cover, read_mins, status, published_at, updated_at
     FROM posts WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 500'
  );
  while ($r = $res->fetch_assoc()) {
    $r['id'] = (int)$r['id'];
    $r['read_mins'] = (int)$r['read_mins'];
    $rows[] = $r;
  }
  ok($rows);
}

// ── Public: published list (no body) ─────────────────────────────────────────
if ($method === 'GET') {
  $rows = [];
  $res = $conn->query(
    'SELECT p.id, p.slug, p.title, p.excerpt, p.category, p.cover, p.read_mins,
            p.published_at, u.name AS author
     FROM posts p LEFT JOIN users u ON u.id = p.author_id
     WHERE p.status = "published" AND p.deleted_at IS NULL
     ORDER BY p.published_at DESC, p.id DESC LIMIT 50'
  );
  while ($r = $res->fetch_assoc()) {
    $r['id'] = (int)$r['id'];
    $r['read_mins'] = (int)$r['read_mins'];
    $rows[] = $r;
  }
  ok($rows);
}

// ── Staff: create / update ───────────────────────────────────────────────────
if ($method === 'POST' && ($action === 'create' || $action === 'update')) {
  $user = require_auth($conn, EDITORS);
  $in = body();
  $title = str_field($in, 'title', 200);
  if ($title === '') fail('A title is required.');
  $excerpt = str_field($in, 'excerpt', 400);
  $bodyText = str_field($in, 'body', 200000);
  $category = str_field($in, 'category', 60) ?: 'General';
  $cover = str_field($in, 'cover', 20);
  if (!in_array($cover, COVERS, true)) $cover = 'article';
  $readMins = max(1, min(60, (int)($in['read_mins'] ?? 4)));
  $status = str_field($in, 'status', 20);
  if (!in_array($status, ['draft', 'published'], true)) $status = 'draft';
  $slugIn = str_field($in, 'slug', 200);
  $uid = $user['id'];

  if ($action === 'create') {
    $slug = unique_slug($conn, slugify($slugIn !== '' ? $slugIn : $title));
    $pub = $status === 'published' ? date('Y-m-d H:i:s') : null;
    $stmt = $conn->prepare(
      'INSERT INTO posts (slug, title, excerpt, body, category, cover, read_mins, status, author_id, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('ssssssisss', $slug, $title, $excerpt, $bodyText, $category, $cover, $readMins, $status, $uid, $pub);
    if (!$stmt->execute()) fail('Could not create the post.', 500);
    $newId = $conn->insert_id; // read before audit(), which inserts its own row
    audit($conn, $uid, 'blog_create', $title);
    ok(['id' => $newId, 'slug' => $slug], 201);
  } else {
    $id = (int)($in['id'] ?? 0);
    if ($id <= 0) fail('A post id is required.');
    $slug = unique_slug($conn, slugify($slugIn !== '' ? $slugIn : $title), $id);
    // An update that does not send excerpt or body keeps what is stored, so a
    // form that never loaded them cannot wipe them (plan A06, K-016).
    $cur = $conn->prepare('SELECT excerpt, body FROM posts WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $cur->bind_param('i', $id);
    $cur->execute();
    $stored = $cur->get_result()->fetch_assoc();
    if (!$stored) fail('Post not found.', 404);
    if (!array_key_exists('excerpt', $in)) $excerpt = (string)$stored['excerpt'];
    if (!array_key_exists('body', $in)) $bodyText = (string)$stored['body'];
    // Stamp published_at the first time it goes live.
    $stmt = $conn->prepare(
      'UPDATE posts
         SET slug = ?, title = ?, excerpt = ?, body = ?, category = ?, cover = ?, read_mins = ?, status = ?,
             published_at = CASE WHEN ? = "published" AND published_at IS NULL THEN NOW() ELSE published_at END
       WHERE id = ? AND deleted_at IS NULL'
    );
    $stmt->bind_param('ssssssissi', $slug, $title, $excerpt, $bodyText, $category, $cover, $readMins, $status, $status, $id);
    $stmt->execute();
    audit($conn, $uid, 'blog_update', "#$id");
    ok(['ok' => true, 'slug' => $slug]);
  }
}

// ── Staff: publish / unpublish ───────────────────────────────────────────────
if ($method === 'POST' && $action === 'publish') {
  $user = require_auth($conn, EDITORS);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $status = str_field($in, 'status', 20);
  if ($id <= 0) fail('A post id is required.');
  if (!in_array($status, ['draft', 'published'], true)) fail('Invalid status.');
  $stmt = $conn->prepare(
    'UPDATE posts
       SET status = ?,
           published_at = CASE WHEN ? = "published" AND published_at IS NULL THEN NOW() ELSE published_at END
     WHERE id = ? AND deleted_at IS NULL'
  );
  $stmt->bind_param('ssi', $status, $status, $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) {
    $chk = $conn->prepare('SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $chk->bind_param('i', $id);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) fail('Post not found.', 404);
  }
  audit($conn, $user['id'], 'blog_publish', "#$id → $status");
  ok(['ok' => true]);
}

// ── Staff: delete ────────────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'delete') {
  $user = require_auth($conn, EDITORS);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('A post id is required.');
  $stmt = $conn->prepare('UPDATE posts SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Post not found.', 404);
  audit($conn, $user['id'], 'blog_delete', "#$id");
  ok(['ok' => true]);
}

fail('Method not allowed.', 405);
