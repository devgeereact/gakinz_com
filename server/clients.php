<?php
/**
 * Clients / CRM (GAkinzOS §6 Clients). Protected.
 *
 *   GET  /clients.php                 → list clients (newest first)
 *   POST /clients.php?action=create   {company, contact_name?, email?, phone?, tag?, notes?}
 *   POST /clients.php?action=update   {id, ...fields}
 *   POST /clients.php?action=convert  {lead_id}   → create a client from an enquiry, mark it won
 *
 * Tags: retainer | one-off | vip | dormant
 */
require __DIR__ . '/_bootstrap.php';

const TAGS = ['retainer', 'one-off', 'vip', 'dormant'];
const STAFF = ['super_admin', 'admin', 'manager', 'editor'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET' && isset($_GET['id'])) {
  require_auth($conn, STAFF); // staff only
  $id = (int)$_GET['id'];

  $stmt = $conn->prepare('SELECT id, company, contact_name, email, phone, tag, retainer_amount, notes, source_lead_id, created_at
                          FROM clients WHERE id = ? AND deleted_at IS NULL LIMIT 1'); // (detail)
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $client = $stmt->get_result()->fetch_assoc();
  if (!$client) fail('Client not found.', 404);
  $client['id'] = (int)$client['id'];
  $client['retainer_amount'] = (float)($client['retainer_amount'] ?? 0);
  $client['source_lead_id'] = $client['source_lead_id'] !== null ? (int)$client['source_lead_id'] : null;

  $timeline = [];
  $ltv = 0.0;          // lifetime value: settled invoices, inc VAT
  $outstanding = 0.0;  // unpaid invoices, inc VAT
  $projectCount = 0;
  $proposalCount = 0;
  $openTickets = 0;

  // Proposals
  $stmt = $conn->prepare('SELECT id, title, status, created_at FROM proposals WHERE client_id = ? AND deleted_at IS NULL ORDER BY id DESC');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($r = $res->fetch_assoc()) {
    $proposalCount++;
    $timeline[] = ['type' => 'proposal', 'id' => (int)$r['id'], 'label' => $r['title'], 'status' => $r['status'], 'amount' => null, 'date' => $r['created_at']];
  }

  // Projects
  $stmt = $conn->prepare('SELECT id, name, status, created_at FROM projects WHERE client_id = ? AND deleted_at IS NULL ORDER BY id DESC');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($r = $res->fetch_assoc()) {
    $projectCount++;
    $timeline[] = ['type' => 'project', 'id' => (int)$r['id'], 'label' => $r['name'], 'status' => $r['status'], 'amount' => null, 'date' => $r['created_at']];
  }

  // Invoices (inc VAT) → LTV + outstanding
  $stmt = $conn->prepare(
    'SELECT i.id, i.number, i.status, i.vat_rate, i.issued_at,
            (SELECT COALESCE(SUM(qty * unit_price), 0) FROM invoice_items it WHERE it.invoice_id = i.id) AS subtotal
     FROM invoices i WHERE i.client_id = ? AND i.deleted_at IS NULL ORDER BY i.id DESC'
  );
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($r = $res->fetch_assoc()) {
    $sub = (float)$r['subtotal'];
    $total = round($sub + $sub * (float)$r['vat_rate'] / 100, 2);
    if ($r['status'] === 'paid') $ltv += $total;
    else $outstanding += $total;
    $timeline[] = ['type' => 'invoice', 'id' => (int)$r['id'], 'label' => $r['number'] ?? ('#' . $r['id']), 'status' => $r['status'], 'amount' => $total, 'date' => $r['issued_at']];
  }

  // Tickets
  $stmt = $conn->prepare('SELECT id, subject, status, created_at FROM tickets WHERE client_id = ? AND deleted_at IS NULL ORDER BY id DESC');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($r = $res->fetch_assoc()) {
    if ($r['status'] !== 'resolved') $openTickets++;
    $timeline[] = ['type' => 'ticket', 'id' => (int)$r['id'], 'label' => $r['subject'], 'status' => $r['status'], 'amount' => null, 'date' => $r['created_at']];
  }

  // Newest first across all record types.
  usort($timeline, fn($a, $b) => strcmp((string)$b['date'], (string)$a['date']));

  ok([
    'client' => $client,
    'stats'  => [
      'ltv'         => round($ltv, 2),
      'outstanding' => round($outstanding, 2),
      'projects'    => $projectCount,
      'proposals'   => $proposalCount,
      'open_tickets'=> $openTickets,
    ],
    'timeline' => $timeline,
  ]);
}

if ($method === 'GET') {
  require_auth($conn, STAFF); // staff only — never expose the client list to a client login
  $rows = [];
  $sql = 'SELECT id, company, contact_name, email, phone, tag, retainer_amount, notes, source_lead_id, created_at
          FROM clients WHERE deleted_at IS NULL ORDER BY id DESC LIMIT 500';
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
      $r['retainer_amount'] = (float)($r['retainer_amount'] ?? 0);
      $r['source_lead_id'] = $r['source_lead_id'] !== null ? (int)$r['source_lead_id'] : null;
      $rows[] = $r;
    }
  }
  ok($rows);
}

if ($method === 'POST' && $action === 'create') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $company = str_field($in, 'company', 200);
  if ($company === '') fail('A company name is required.');
  $contact = str_field($in, 'contact_name', 200);
  $email   = str_field($in, 'email', 200);
  $phone   = str_field($in, 'phone', 60);
  $tag     = str_field($in, 'tag', 30);
  $notes   = str_field($in, 'notes', 5000);
  $retainer = max(0, (float)($in['retainer_amount'] ?? 0));
  if ($tag === '' || !in_array($tag, TAGS, true)) $tag = 'one-off';

  $stmt = $conn->prepare('INSERT INTO clients (company, contact_name, email, phone, tag, retainer_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
  $stmt->bind_param('sssssds', $company, $contact, $email, $phone, $tag, $retainer, $notes);
  if (!$stmt->execute()) fail('Could not create the client.', 500);
  $newId = $conn->insert_id; // read before audit(), which inserts its own row
  audit($conn, $user['id'], 'client_create', $company);
  ok(['id' => $newId], 201);
}

if ($method === 'POST' && $action === 'update') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  if ($id <= 0) fail('A client id is required.');
  $company = str_field($in, 'company', 200);
  if ($company === '') fail('A company name is required.');
  $contact = str_field($in, 'contact_name', 200);
  $email   = str_field($in, 'email', 200);
  $phone   = str_field($in, 'phone', 60);
  $tag     = str_field($in, 'tag', 30);
  $notes   = str_field($in, 'notes', 5000);
  $retainer = max(0, (float)($in['retainer_amount'] ?? 0));
  if (!in_array($tag, TAGS, true)) $tag = 'one-off';

  $stmt = $conn->prepare('UPDATE clients SET company=?, contact_name=?, email=?, phone=?, tag=?, retainer_amount=?, notes=? WHERE id=? AND deleted_at IS NULL');
  $stmt->bind_param('sssssdsi', $company, $contact, $email, $phone, $tag, $retainer, $notes, $id);
  if (!$stmt->execute()) fail('Could not update the client.', 500);
  audit($conn, $user['id'], 'client_update', "#$id");
  ok(['ok' => true]);
}

if ($method === 'POST' && $action === 'convert') {
  $user = require_auth($conn, STAFF);
  $leadId = (int)(body()['lead_id'] ?? 0);
  if ($leadId <= 0) fail('A lead id is required.');

  $stmt = $conn->prepare('SELECT name, email, company FROM enquiries WHERE id = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('i', $leadId);
  $stmt->execute();
  $lead = $stmt->get_result()->fetch_assoc();
  if (!$lead) fail('Lead not found.', 404);

  // Avoid duplicate conversion
  $chk = $conn->prepare('SELECT id FROM clients WHERE source_lead_id = ? AND deleted_at IS NULL LIMIT 1');
  $chk->bind_param('i', $leadId);
  $chk->execute();
  if ($existing = $chk->get_result()->fetch_assoc()) {
    ok(['id' => (int)$existing['id'], 'existing' => true]);
  }

  $company = $lead['company'] !== '' && $lead['company'] !== null ? $lead['company'] : $lead['name'];
  $contact = $lead['name'];
  $email   = $lead['email'];
  $tag     = 'one-off';
  $stmt = $conn->prepare('INSERT INTO clients (company, contact_name, email, tag, source_lead_id) VALUES (?, ?, ?, ?, ?)');
  $stmt->bind_param('ssssi', $company, $contact, $email, $tag, $leadId);
  if (!$stmt->execute()) fail('Could not convert the lead.', 500);
  $clientId = $conn->insert_id;

  // Mark the originating enquiry as won
  $upd = $conn->prepare("UPDATE enquiries SET status = 'won' WHERE id = ?");
  $upd->bind_param('i', $leadId);
  $upd->execute();

  audit($conn, $user['id'], 'lead_convert', "lead #$leadId → client #$clientId");
  ok(['id' => $clientId], 201);
}

fail('Method not allowed.', 405);
