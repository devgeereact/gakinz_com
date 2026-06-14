<?php
/**
 * Launch & Care-Plan (GAkinzOS — Care plan). Protected.
 * Sites under management = projects with a production URL on file. Surfaces the
 * latest uptime + SSL-expiry from the monitor (cron sweep), with an on-demand
 * "check now".
 *
 *   GET  /careplan.php               → care-plan sites with last check
 *   POST /careplan.php?action=check  {project_id}   → run a check now, persist, return
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
  require_auth($conn, STAFF);
  $rows = [];
  $sql = "SELECT p.id AS project_id, p.name AS project_name, p.status, c.company AS client_company,
                 c.retainer_amount, pd.prod_url, pd.last_http_status, pd.ssl_days_left, pd.last_checked_at
          FROM project_dev pd
          JOIN projects p ON p.id = pd.project_id
          LEFT JOIN clients c ON c.id = p.client_id
          WHERE pd.prod_url IS NOT NULL AND pd.prod_url <> '' AND p.deleted_at IS NULL
          ORDER BY p.id DESC LIMIT 500";
  if ($res = @$conn->query($sql)) {
    while ($r = $res->fetch_assoc()) {
      $r['project_id'] = (int)$r['project_id'];
      $r['last_http_status'] = $r['last_http_status'] !== null ? (int)$r['last_http_status'] : null;
      $r['ssl_days_left'] = $r['ssl_days_left'] !== null ? (int)$r['ssl_days_left'] : null;
      $r['retainer_amount'] = (float)($r['retainer_amount'] ?? 0);
      $rows[] = $r;
    }
  }
  ok($rows);
}

if ($method === 'POST' && $action === 'check') {
  $user = require_auth($conn, STAFF);
  $pid = (int)(body()['project_id'] ?? 0);
  if ($pid <= 0) fail('A project id is required.');
  $stmt = $conn->prepare('SELECT prod_url FROM project_dev WHERE project_id = ? LIMIT 1');
  $stmt->bind_param('i', $pid);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  if (!$row || empty($row['prod_url'])) fail('That project has no production URL.', 404);

  require_once __DIR__ . '/_monitor.php';
  $c = gk_site_check($row['prod_url']);
  $status = $c['status'];
  $ssl = $c['ssl_days'];
  $upd = $conn->prepare('UPDATE project_dev SET last_http_status = ?, ssl_days_left = ?, last_checked_at = NOW() WHERE project_id = ?');
  $upd->bind_param('iii', $status, $ssl, $pid);
  $upd->execute();
  audit($conn, $user['id'], 'careplan_check', "project #$pid → " . ($status ?? 'n/a'));
  ok(['project_id' => $pid, 'last_http_status' => $status, 'ssl_days_left' => $ssl, 'ok' => $c['ok']]);
}

fail('Method not allowed.', 405);
