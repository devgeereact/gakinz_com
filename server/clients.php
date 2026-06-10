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

if ($method === 'GET') {
  require_auth($conn);
  $rows = [];
  $sql = 'SELECT id, company, contact_name, email, phone, tag, notes, source_lead_id, created_at
          FROM clients WHERE deleted_at IS NULL ORDER BY id DESC LIMIT 500';
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
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
  if ($tag === '' || !in_array($tag, TAGS, true)) $tag = 'one-off';

  $stmt = $conn->prepare('INSERT INTO clients (company, contact_name, email, phone, tag, notes) VALUES (?, ?, ?, ?, ?, ?)');
  $stmt->bind_param('ssssss', $company, $contact, $email, $phone, $tag, $notes);
  if (!$stmt->execute()) fail('Could not create the client.', 500);
  audit($conn, $user['id'], 'client_create', $company);
  ok(['id' => $conn->insert_id], 201);
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
  if (!in_array($tag, TAGS, true)) $tag = 'one-off';

  $stmt = $conn->prepare('UPDATE clients SET company=?, contact_name=?, email=?, phone=?, tag=?, notes=? WHERE id=? AND deleted_at IS NULL');
  $stmt->bind_param('ssssssi', $company, $contact, $email, $phone, $tag, $notes, $id);
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
