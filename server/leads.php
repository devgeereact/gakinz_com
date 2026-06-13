<?php
/**
 * Leads / enquiries (GAkinzOS §6 Leads). The public contact form fills the
 * `enquiries` table; this endpoint reads and manages them. Protected — every
 * call requires a valid token; mutations require a staff role.
 *
 *   GET  /leads.php                    → list leads (newest first)
 *   POST /leads.php?action=status      {id, status}  → move a lead's stage
 *   POST /leads.php?action=note        {id, note}    → append a note (audit)
 *
 * Stages: new | contacted | proposal | won | lost
 */
require __DIR__ . '/_bootstrap.php';

const STAGES = ['new', 'contacted', 'proposal', 'won', 'lost'];
const STAFF = ['super_admin', 'admin', 'manager', 'editor'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
  require_auth($conn, STAFF); // staff only — a client must never read all leads
  $rows = [];
  $sql = 'SELECT id, name, email, company, budget, project_type, message, status, source, created_at
          FROM enquiries WHERE deleted_at IS NULL ORDER BY id DESC LIMIT 500';
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
      $rows[] = $r;
    }
  }
  ok($rows);
}

if ($method === 'POST' && $action === 'status') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $status = str_field($in, 'status', 30);
  if ($id <= 0) fail('A lead id is required.');
  if (!in_array($status, STAGES, true)) fail('Invalid stage.');

  $stmt = $conn->prepare('UPDATE enquiries SET status = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('si', $status, $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Lead not found.', 404);

  audit($conn, $user['id'], 'lead_status', "#$id → $status");
  ok(['ok' => true]);
}

fail('Method not allowed.', 405);
