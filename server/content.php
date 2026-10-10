<?php
/**
 * Content Hub drafts (GAkinzOS — Content Hub).
 * Stores AI-generated multi-platform content the team can reuse/schedule.
 * Generation itself runs through ai.php; this only persists the results.
 *
 * STAFF (require_auth EDITORS):
 *   GET  /content.php              → drafts (newest first)
 *   POST /content.php?action=create {topic, platform, title?, body?, hashtags?, keywords?}
 *   POST /content.php?action=update {id, ...}
 *   POST /content.php?action=delete {id}
 */
require __DIR__ . '/_bootstrap.php';

const EDITORS = ['super_admin', 'admin', 'manager', 'editor'];
const PLATFORMS = ['blog', 'linkedin', 'x', 'instagram', 'facebook', 'tiktok'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
  require_auth($conn, EDITORS);
  $rows = [];
  $res = $conn->query(
    'SELECT id, topic, platform, title, body, hashtags, keywords, status, created_at, updated_at
     FROM content_drafts WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 500'
  );
  while ($r = $res->fetch_assoc()) {
    $r['id'] = (int)$r['id'];
    $rows[] = $r;
  }
  ok($rows);
}

if ($method === 'POST' && ($action === 'create' || $action === 'update')) {
  $user = require_auth($conn, EDITORS);
  $in = body();
  $topic = str_field($in, 'topic', 300);
  if ($topic === '') fail('A topic is required.');
  $platform = str_field($in, 'platform', 30);
  if (!in_array($platform, PLATFORMS, true)) $platform = 'blog';
  $title = str_field($in, 'title', 200);
  $bodyText = str_field($in, 'body', 200000);
  $hashtags = str_field($in, 'hashtags', 800);
  $keywords = str_field($in, 'keywords', 800);
  $uid = $user['id'];

  if ($action === 'create') {
    $stmt = $conn->prepare(
      'INSERT INTO content_drafts (topic, platform, title, body, hashtags, keywords, author_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('ssssssi', $topic, $platform, $title, $bodyText, $hashtags, $keywords, $uid);
    if (!$stmt->execute()) fail('Could not save the draft.', 500);
    $newId = $conn->insert_id; // read before audit(), which inserts its own row
    audit($conn, $uid, 'content_create', "$platform: $topic");
    ok(['id' => $newId], 201);
  } else {
    $id = (int)($in['id'] ?? 0);
    if ($id <= 0) fail('A draft id is required.');
    $stmt = $conn->prepare(
      'UPDATE content_drafts SET topic = ?, platform = ?, title = ?, body = ?, hashtags = ?, keywords = ?
       WHERE id = ? AND deleted_at IS NULL'
    );
    $stmt->bind_param('ssssssi', $topic, $platform, $title, $bodyText, $hashtags, $keywords, $id);
    $stmt->execute();
    audit($conn, $uid, 'content_update', "#$id");
    ok(['ok' => true]);
  }
}

if ($method === 'POST' && $action === 'delete') {
  $user = require_auth($conn, EDITORS);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('A draft id is required.');
  $stmt = $conn->prepare('UPDATE content_drafts SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Draft not found.', 404);
  audit($conn, $user['id'], 'content_delete', "#$id");
  ok(['ok' => true]);
}

fail('Method not allowed.', 405);
