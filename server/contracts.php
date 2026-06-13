<?php
/**
 * Contracts & e-Signature (GAkinzOS — Contracts). Protected.
 * Typed-name e-signature with an audit trail (name, IP, timestamp). Templates +
 * merge live client-side; this stores the rendered body. NDA triage tag.
 *
 *   GET  /contracts.php              → list (with client/project)
 *   GET  /contracts.php?id=N         → one contract (with body)
 *   POST /contracts.php?action=create {client_id?, project_id?, kind?, title, body?, nda_triage?, signer_name?, signer_email?}
 *   POST /contracts.php?action=status {id, status}            status: draft | sent | void
 *   POST /contracts.php?action=sign   {id, signed_name}       records typed e-signature → status signed
 *   POST /contracts.php?action=delete {id}
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET' && isset($_GET['id'])) {
  require_auth($conn, STAFF);
  $id = (int)$_GET['id'];
  $stmt = $conn->prepare(
    'SELECT k.id, k.client_id, k.project_id, k.kind, k.title, k.body, k.status, k.nda_triage,
            k.signer_name, k.signer_email, k.signed_name, k.signed_ip, k.signed_at, k.created_at,
            c.company AS client_company, p.name AS project_name
     FROM contracts k
     LEFT JOIN clients c ON c.id = k.client_id
     LEFT JOIN projects p ON p.id = k.project_id
     WHERE k.id = ? AND k.deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $k = $stmt->get_result()->fetch_assoc();
  if (!$k) fail('Contract not found.', 404);
  $k['id'] = (int)$k['id'];
  $k['client_id'] = $k['client_id'] !== null ? (int)$k['client_id'] : null;
  $k['project_id'] = $k['project_id'] !== null ? (int)$k['project_id'] : null;
  ok($k);
}

if ($method === 'GET') {
  require_auth($conn, STAFF);
  $rows = [];
  $sql = 'SELECT k.id, k.client_id, k.project_id, k.kind, k.title, k.status, k.nda_triage,
                 k.signer_name, k.signed_at, k.created_at,
                 c.company AS client_company, p.name AS project_name
          FROM contracts k
          LEFT JOIN clients c ON c.id = k.client_id
          LEFT JOIN projects p ON p.id = k.project_id
          WHERE k.deleted_at IS NULL ORDER BY k.id DESC LIMIT 500';
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
      $r['client_id'] = $r['client_id'] !== null ? (int)$r['client_id'] : null;
      $r['project_id'] = $r['project_id'] !== null ? (int)$r['project_id'] : null;
      $rows[] = $r;
    }
  }
  ok($rows);
}

if ($method === 'POST' && $action === 'create') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $title = str_field($in, 'title', 200);
  if ($title === '') fail('A title is required.');
  $clientId = isset($in['client_id']) && $in['client_id'] !== '' ? (int)$in['client_id'] : null;
  $projectId = isset($in['project_id']) && $in['project_id'] !== '' ? (int)$in['project_id'] : null;
  $kind = str_field($in, 'kind', 20);
  if (!in_array($kind, ['agreement', 'nda'], true)) $kind = 'agreement';
  $body = str_field($in, 'body', 60000);
  $triage = str_field($in, 'nda_triage', 10);
  $triage = in_array($triage, ['green', 'yellow', 'red'], true) ? $triage : null;
  $signerName = str_field($in, 'signer_name', 200);
  $signerEmail = str_field($in, 'signer_email', 200);
  $uid = $user['id'];

  $stmt = $conn->prepare('INSERT INTO contracts (client_id, project_id, kind, title, body, nda_triage, signer_name, signer_email, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  $stmt->bind_param('iissssssi', $clientId, $projectId, $kind, $title, $body, $triage, $signerName, $signerEmail, $uid);
  if (!$stmt->execute()) fail('Could not create the contract.', 500);
  audit($conn, $uid, 'contract_create', $title);
  ok(['id' => $conn->insert_id], 201);
}

if ($method === 'POST' && $action === 'status') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $status = str_field($in, 'status', 20);
  if ($id <= 0) fail('A contract id is required.');
  if (!in_array($status, ['draft', 'sent', 'void'], true)) fail('Invalid status.');
  $stmt = $conn->prepare('UPDATE contracts SET status = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('si', $status, $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Contract not found.', 404);
  audit($conn, $user['id'], 'contract_status', "#$id → $status");
  ok(['ok' => true]);
}

if ($method === 'POST' && $action === 'sign') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $signed = str_field($in, 'signed_name', 200);
  if ($id <= 0) fail('A contract id is required.');
  if ($signed === '') fail('A typed full name is required to sign.');
  $ip = $_SERVER['REMOTE_ADDR'] ?? '';
  $stmt = $conn->prepare("UPDATE contracts SET status = 'signed', signed_name = ?, signed_ip = ?, signed_at = NOW() WHERE id = ? AND deleted_at IS NULL AND status <> 'void'");
  $stmt->bind_param('ssi', $signed, $ip, $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Contract not found or cannot be signed.', 404);
  audit($conn, $user['id'], 'contract_sign', "#$id by $signed");
  ok(['ok' => true]);
}

if ($method === 'POST' && $action === 'delete') {
  $user = require_auth($conn, STAFF);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('A contract id is required.');
  $stmt = $conn->prepare('UPDATE contracts SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Contract not found.', 404);
  audit($conn, $user['id'], 'contract_delete', "#$id");
  ok(['ok' => true]);
}

fail('Method not allowed.', 405);
