<?php
/**
 * Client portal (GAkinzOS §6 Client Portal). Protected.
 * Aggregates everything a single client sees: their projects (with progress),
 * invoices, and support tickets. Reuses the existing module tables.
 *
 *   GET /portal.php?client_id=N → { client, projects[], invoices[], tickets[] }
 *
 * A project with kind 'it_support' (the standing IT support project, SQL 17)
 * is named "IT support" and carries no task counts. Time entries are never
 * returned here.
 *
 * Work references (SQL 19): each project carries `reference` and each invoice
 * `project_reference`, the GK-P-YYYY-NNNN of a project of this same client.
 * Null before SQL 19. The client is still chosen only as below; a reference
 * is never read from the request.
 *
 * Phase 2: a `client`-role user is linked to a client and only sees their own;
 * for now staff pass the client_id to preview the portal.
 */
require __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') fail('Method not allowed.', 405);
$user = require_auth($conn);

// Staff who may preview an arbitrary client's portal. This response carries
// invoice data, which invoices.php restricts to these three roles, so the
// preview branch must match it — otherwise an employee, editor or trainer
// reads billing they are not allowed to see anywhere else.
const PORTAL_PREVIEW_ROLES = ['super_admin', 'admin', 'manager'];

// Isolation guarantee: a `client`-role user can ONLY ever see their own portal.
// We derive the client_id from their account and IGNORE any query param, so one
// client can never read another's projects/invoices/tickets by changing the URL.
if ($user['role'] === 'client') {
  $clientId = (int)($user['client_id'] ?? 0);
  if ($clientId <= 0) fail('Your account is not linked to a client.', 403);
} else {
  if (!in_array($user['role'], PORTAL_PREVIEW_ROLES, true)) fail('Not allowed.', 403);
  $clientId = (int)($_GET['client_id'] ?? 0);
  if ($clientId <= 0) fail('A client_id is required.');
}

$stmt = $conn->prepare('SELECT id, company, contact_name, email FROM clients WHERE id = ? AND deleted_at IS NULL LIMIT 1');
$stmt->bind_param('i', $clientId);
$stmt->execute();
$client = $stmt->get_result()->fetch_assoc();
if (!$client) fail('Client not found.', 404);
$client['id'] = (int)$client['id'];

/**
 * True once SQL 17 has added projects.kind. Kept here rather than shared, so
 * this security-critical file depends on nothing but _bootstrap.php.
 */
function portal_kind_ready(mysqli $conn): bool {
  try {
    // LIMIT 0 reads no rows; it only proves the column is there.
    return $conn->query('SELECT kind FROM projects LIMIT 0') !== false;
  } catch (mysqli_sql_exception $e) {
    if ($e->getCode() !== 1054) throw $e; // ER_BAD_FIELD_ERROR only
    return false;
  }
}

// Projects with task progress. The standing IT support project (SQL 17,
// projects.kind = 'it_support') is listed as "IT support" with no task
// counts: it holds ticket time, which a client never sees, not delivery work.
// Before SQL 17 there is no kind column, so every project reads as kind NULL.
/**
 * True once SQL 19 has added projects.reference. Kept here for the same
 * reason as portal_kind_ready().
 */
function portal_ref_ready(mysqli $conn): bool {
  try {
    return $conn->query('SELECT reference FROM projects LIMIT 0') !== false;
  } catch (mysqli_sql_exception $e) {
    if ($e->getCode() !== 1054) throw $e; // ER_BAD_FIELD_ERROR only
    return false;
  }
}

$kindCol = portal_kind_ready($conn) ? 'p.kind' : 'NULL AS kind';
$refReady = portal_ref_ready($conn);
$refCol = $refReady ? 'p.reference' : 'NULL AS reference';
$projects = [];
$stmt = $conn->prepare(
  "SELECT p.id, p.name, p.status, p.due_date, $kindCol, $refCol,
          (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.deleted_at IS NULL) AS task_count,
          (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.deleted_at IS NULL AND t.status = 'done') AS done_count
   FROM projects p WHERE p.client_id = ? AND p.deleted_at IS NULL ORDER BY p.id DESC"
);
$stmt->bind_param('i', $clientId);
$stmt->execute();
$res = $stmt->get_result();
while ($r = $res->fetch_assoc()) {
  $r['id'] = (int)$r['id'];
  $r['task_count'] = (int)$r['task_count'];
  $r['done_count'] = (int)$r['done_count'];
  if ($r['kind'] === 'it_support') {
    $r['name'] = 'IT support';
    $r['task_count'] = 0;
    $r['done_count'] = 0;
  } else {
    $r['kind'] = null; // only the IT support marker is ever shown to a client
  }
  $projects[] = $r;
}

// Invoices with totals
$invoices = [];
// The project join also requires the same client, so an invoice wrongly
// linked to another client's project never shows that project's reference.
$invRef = $refReady ? 'pj.reference AS project_reference' : 'NULL AS project_reference';
$invJoin = $refReady ? ' LEFT JOIN projects pj ON pj.id = i.project_id AND pj.client_id = i.client_id AND pj.deleted_at IS NULL' : '';
$stmt = $conn->prepare(
  "SELECT i.id, i.number, i.status, i.vat_rate, i.issued_at, i.due_at, $invRef,
          (SELECT COALESCE(SUM(qty * unit_price), 0) FROM invoice_items it WHERE it.invoice_id = i.id) AS subtotal
   FROM invoices i$invJoin WHERE i.client_id = ? AND i.deleted_at IS NULL ORDER BY i.id DESC"
);
$stmt->bind_param('i', $clientId);
$stmt->execute();
$res = $stmt->get_result();
while ($r = $res->fetch_assoc()) {
  $r['id'] = (int)$r['id'];
  $r['subtotal'] = (float)$r['subtotal'];
  $r['vat_rate'] = (float)$r['vat_rate'];
  $r['vat_amount'] = round($r['subtotal'] * $r['vat_rate'] / 100, 2);
  $r['total'] = round($r['subtotal'] + $r['vat_amount'], 2); // payable, inc VAT
  $invoices[] = $r;
}

// Tickets
$tickets = [];
$stmt = $conn->prepare(
  'SELECT id, subject, status, priority, created_at FROM tickets
   WHERE client_id = ? AND deleted_at IS NULL ORDER BY id DESC'
);
$stmt->bind_param('i', $clientId);
$stmt->execute();
$res = $stmt->get_result();
while ($r = $res->fetch_assoc()) {
  $r['id'] = (int)$r['id'];
  $tickets[] = $r;
}

ok([
  'client'   => $client,
  'projects' => $projects,
  'invoices' => $invoices,
  'tickets'  => $tickets,
]);
