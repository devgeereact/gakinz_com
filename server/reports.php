<?php
/**
 * Reports (GAkinzOS — Reporting). Management only. Heavier cross-table reports
 * computed server-side (so sensitive figures like cost rates never ship to the
 * whole team).
 *
 *   GET /reports.php?report=profitability → per-project revenue vs cost vs margin
 *
 * Revenue = paid invoice line items (inc VAT) for the project.
 * Cost     = Σ (time minutes / 60 × the logger's cost_rate).
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager'];

if ($_SERVER['REQUEST_METHOD'] !== 'GET') fail('Method not allowed.', 405);
require_auth($conn, STAFF);

$report = $_GET['report'] ?? '';

if ($report === 'profitability') {
  // Revenue per project (paid invoices, inc VAT).
  $rev = [];
  $sql =
    'SELECT i.project_id,
            COALESCE(SUM((SELECT COALESCE(SUM(qty*unit_price),0) FROM invoice_items it WHERE it.invoice_id = i.id)
                         * (1 + i.vat_rate/100)), 0) AS revenue
     FROM invoices i
     WHERE i.project_id IS NOT NULL AND i.status = "paid" AND i.deleted_at IS NULL
     GROUP BY i.project_id';
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) $rev[(int)$r['project_id']] = (float)$r['revenue'];
  }

  // Cost per project (logged minutes × cost rate).
  $cost = [];
  $sql =
    'SELECT t.project_id, COALESCE(SUM(t.minutes/60 * u.cost_rate), 0) AS cost
     FROM time_entries t JOIN users u ON u.id = t.user_id
     WHERE t.deleted_at IS NULL
     GROUP BY t.project_id';
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) $cost[(int)$r['project_id']] = (float)$r['cost'];
  }

  // One row per project that has either revenue or cost.
  $rows = [];
  $names = [];
  if ($res = $conn->query('SELECT p.id, p.name, c.company AS client_company FROM projects p LEFT JOIN clients c ON c.id = p.client_id WHERE p.deleted_at IS NULL')) {
    while ($r = $res->fetch_assoc()) $names[(int)$r['id']] = ['name' => $r['name'], 'client' => $r['client_company']];
  }
  $ids = array_unique(array_merge(array_keys($rev), array_keys($cost)));
  foreach ($ids as $pid) {
    $revenue = round($rev[$pid] ?? 0, 2);
    $c = round($cost[$pid] ?? 0, 2);
    $rows[] = [
      'project_id' => $pid,
      'project'    => $names[$pid]['name'] ?? ('#' . $pid),
      'client'     => $names[$pid]['client'] ?? null,
      'revenue'    => $revenue,
      'cost'       => $c,
      'margin'     => round($revenue - $c, 2),
    ];
  }
  usort($rows, fn($a, $b) => $b['margin'] <=> $a['margin']);
  ok($rows);
}

fail('Unknown report.', 404);
