<?php
/**
 * Public certificate verification (GAkinzOS §6.8). No auth.
 *   GET /verify.php?id=GK-XXXX → { id, recipient, programme, issued_at } | 404
 */
require __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') fail('Method not allowed.', 405);

$id = trim((string)($_GET['id'] ?? ''));
if ($id === '') fail('No certificate reference supplied.');

$stmt = $conn->prepare(
  'SELECT public_id AS id, recipient, programme, DATE_FORMAT(issued_at, "%e %M %Y") AS issued_at
   FROM certificates WHERE public_id = ? AND revoked_at IS NULL LIMIT 1'
);
$stmt->bind_param('s', $id);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();

if (!$row) fail('No matching certificate.', 404);
ok($row);
