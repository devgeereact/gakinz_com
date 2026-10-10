<?php
/**
 * Testimonials (GAkinzOS — Testimonials module → public site).
 * Curated, CMS-approved client quotes (no third-party API).
 *
 * PUBLIC (no auth):
 *   GET  /testimonials.php           → approved testimonials
 *
 * STAFF (require_auth EDITORS):
 *   GET  /testimonials.php?all=1     → every testimonial incl. unapproved
 *   POST /testimonials.php?action=create  {author, role?, company?, quote, rating?, approved?, sort_order?}
 *   POST /testimonials.php?action=update  {id, ...}
 *   POST /testimonials.php?action=approve {id, approved}
 *   POST /testimonials.php?action=delete  {id}
 */
require __DIR__ . '/_bootstrap.php';

const EDITORS = ['super_admin', 'admin', 'manager', 'editor'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── Staff: full list ─────────────────────────────────────────────────────────
if ($method === 'GET' && isset($_GET['all'])) {
  require_auth($conn, EDITORS);
  $rows = [];
  $res = $conn->query(
    'SELECT id, author, role, company, quote, rating, approved, sort_order, updated_at
     FROM testimonials WHERE deleted_at IS NULL ORDER BY sort_order ASC, id DESC LIMIT 500'
  );
  while ($r = $res->fetch_assoc()) {
    $r['id'] = (int)$r['id'];
    $r['rating'] = (int)$r['rating'];
    $r['approved'] = (int)$r['approved'];
    $r['sort_order'] = (int)$r['sort_order'];
    $rows[] = $r;
  }
  ok($rows);
}

// ── Public: approved only ────────────────────────────────────────────────────
if ($method === 'GET') {
  $rows = [];
  $res = $conn->query(
    'SELECT id, author, role, company, quote, rating
     FROM testimonials WHERE approved = 1 AND deleted_at IS NULL
     ORDER BY sort_order ASC, id DESC LIMIT 24'
  );
  while ($r = $res->fetch_assoc()) {
    $r['id'] = (int)$r['id'];
    $r['rating'] = (int)$r['rating'];
    $rows[] = $r;
  }
  ok($rows);
}

// ── Staff: create / update ───────────────────────────────────────────────────
if ($method === 'POST' && ($action === 'create' || $action === 'update')) {
  $user = require_auth($conn, EDITORS);
  $in = body();
  $author = str_field($in, 'author', 120);
  $quote = str_field($in, 'quote', 600);
  if ($author === '') fail('An author name is required.');
  if ($quote === '') fail('A quote is required.');
  $role = str_field($in, 'role', 120);
  $company = str_field($in, 'company', 120);
  $rating = max(1, min(5, (int)($in['rating'] ?? 5)));
  $approved = !empty($in['approved']) ? 1 : 0;
  $sort = (int)($in['sort_order'] ?? 0);
  $uid = $user['id'];

  if ($action === 'create') {
    $stmt = $conn->prepare(
      'INSERT INTO testimonials (author, role, company, quote, rating, approved, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('ssssiii', $author, $role, $company, $quote, $rating, $approved, $sort);
    if (!$stmt->execute()) fail('Could not create the testimonial.', 500);
    $newId = $conn->insert_id; // read before audit(), which inserts its own row
    audit($conn, $uid, 'testimonial_create', $author);
    ok(['id' => $newId], 201);
  } else {
    $id = (int)($in['id'] ?? 0);
    if ($id <= 0) fail('A testimonial id is required.');
    $stmt = $conn->prepare(
      'UPDATE testimonials SET author = ?, role = ?, company = ?, quote = ?, rating = ?, approved = ?, sort_order = ?
       WHERE id = ? AND deleted_at IS NULL'
    );
    $stmt->bind_param('ssssiiii', $author, $role, $company, $quote, $rating, $approved, $sort, $id);
    $stmt->execute();
    audit($conn, $uid, 'testimonial_update', "#$id");
    ok(['ok' => true]);
  }
}

// ── Staff: approve toggle ────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'approve') {
  $user = require_auth($conn, EDITORS);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  if ($id <= 0) fail('A testimonial id is required.');
  $approved = !empty($in['approved']) ? 1 : 0;
  $stmt = $conn->prepare('UPDATE testimonials SET approved = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('ii', $approved, $id);
  $stmt->execute();
  audit($conn, $user['id'], 'testimonial_approve', "#$id → $approved");
  ok(['ok' => true]);
}

// ── Staff: delete ────────────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'delete') {
  $user = require_auth($conn, EDITORS);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('A testimonial id is required.');
  $stmt = $conn->prepare('UPDATE testimonials SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Testimonial not found.', 404);
  audit($conn, $user['id'], 'testimonial_delete', "#$id");
  ok(['ok' => true]);
}

fail('Method not allowed.', 405);
