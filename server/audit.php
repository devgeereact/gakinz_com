<?php
/**
 * Audit-log viewer (GAkinzOS §6.1 / §6.11). Admin only.
 *   GET /audit.php → recent sensitive actions with the acting user's name
 */
require __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') fail('Method not allowed.', 405);
require_auth($conn, ['super_admin', 'admin']);

$rows = [];
$sql = 'SELECT a.id, a.action, a.detail, a.ip, a.created_at, u.name AS user_name, u.email AS user_email
        FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
        ORDER BY a.id DESC LIMIT 200';
if ($res = $conn->query($sql)) {
  while ($r = $res->fetch_assoc()) {
    $r['id'] = (int)$r['id'];
    $rows[] = $r;
  }
}
ok($rows);
