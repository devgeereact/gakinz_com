<?php
/**
 * Smoke-test endpoint (build order step 1).
 * Proves React → PHP → MySQL works before any features are built.
 *   GET  /api.php        → list items  (returns [] on an empty table)
 *   POST /api.php {name} → insert one item, returns it
 */
require __DIR__ . '/_bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  $rows = [];
  if ($res = $conn->query('SELECT id, name, created_at FROM items ORDER BY id DESC LIMIT 100')) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
      $rows[] = $r;
    }
  }
  ok($rows);
}

if ($method === 'POST') {
  $name = str_field(body(), 'name', 200);
  if ($name === '') fail('Name is required.');

  $stmt = $conn->prepare('INSERT INTO items (name) VALUES (?)');
  $stmt->bind_param('s', $name);
  if (!$stmt->execute()) fail('Insert failed.', 500);

  $id = $conn->insert_id;
  $sel = $conn->prepare('SELECT id, name, created_at FROM items WHERE id = ?');
  $sel->bind_param('i', $id);
  $sel->execute();
  $item = $sel->get_result()->fetch_assoc();
  $item['id'] = (int)$item['id'];
  ok($item, 201);
}

fail('Method not allowed.', 405);
