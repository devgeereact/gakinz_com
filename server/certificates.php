<?php
/**
 * Certificates: the staff side of the register (GAkinzOS §6.8, Phase 6, D-058).
 * The public side, which anyone can use to check a reference, is verify.php.
 *
 * STAFF (require_auth CERT_ROLES, which is super_admin and admin: a certificate states that someone completed
 * something, so only the owner roles issue or withdraw one):
 *   GET  /certificates.php                 → every certificate, newest first (revoked ones included)
 *   POST /certificates.php?action=issue    {recipient, programme, issued_at?} → 201 {id, public_id}
 *   POST /certificates.php?action=revoke   {id}  → {ok}. A revoked certificate stops verifying at once and is
 *                                           kept in the register. 404 for a missing id, 409 if already revoked.
 *
 * The reference (public_id) is GK- and three groups of four characters from a 30-character alphabet with no
 * 0, 1, I, L, O or U (60 bits), drawn from random_int(). It carries no sequence, name or date, so one reference
 * says nothing about another. Every issue and revoke is audited with the reference, never the recipient.
 * No schema change: the table already exists (server/schema.sql).
 */
require __DIR__ . '/_bootstrap.php';

const CERT_ROLES = ['super_admin', 'admin'];
const CERT_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

/** A fresh reference such as GK-7F3A-2C9D-X4K2. */
function cert_new_reference(): string {
  $groups = [];
  for ($g = 0; $g < 3; $g++) {
    $chars = '';
    for ($i = 0; $i < 4; $i++) $chars .= CERT_ALPHABET[random_int(0, strlen(CERT_ALPHABET) - 1)];
    $groups[] = $chars;
  }
  return 'GK-' . implode('-', $groups);
}

if ($method === 'GET') {
  require_auth($conn, CERT_ROLES);
  $rows = [];
  $res = $conn->query(
    'SELECT id, public_id, recipient, programme, issued_at, revoked_at, created_at
     FROM certificates ORDER BY id DESC LIMIT 500'
  );
  while ($r = $res->fetch_assoc()) {
    $r['id'] = (int)$r['id'];
    $rows[] = $r;
  }
  ok($rows);
}

if ($method === 'POST' && $action === 'issue') {
  $user = require_auth($conn, CERT_ROLES);
  $in = body();
  $recipient = str_field($in, 'recipient', 200);
  $programme = str_field($in, 'programme', 200);
  if ($recipient === '') fail('The recipient is required.');
  if ($programme === '') fail('The programme is required.');

  // The date the certificate states. Today when none is sent; a past date is fine (a late entry), a future one is not.
  $issued = str_field($in, 'issued_at', 10);
  if ($issued === '') {
    $issued = null; // the database fills in today
  } else {
    $d = DateTime::createFromFormat('!Y-m-d', $issued);
    if (!$d || $d->format('Y-m-d') !== $issued) fail('The date must be a real date written YYYY-MM-DD.');
    if ($issued > date('Y-m-d', time() + 86400)) fail('The date cannot be in the future.');
  }

  // A clash on the unique reference is one in a billion; try a few times and then give up cleanly.
  for ($attempt = 0; $attempt < 5; $attempt++) {
    $publicId = cert_new_reference();
    $stmt = $conn->prepare('INSERT INTO certificates (public_id, recipient, programme, issued_at) VALUES (?, ?, ?, COALESCE(?, CURDATE()))');
    $stmt->bind_param('ssss', $publicId, $recipient, $programme, $issued);
    if ($stmt->execute()) {
      $newId = (int)$conn->insert_id; // read before audit(), which inserts its own row
      audit($conn, $user['id'], 'certificate_issue', $publicId);
      ok(['id' => $newId, 'public_id' => $publicId], 201);
    }
    if ($conn->errno !== 1062) break;
  }
  fail('Could not issue the certificate.', 500);
}

if ($method === 'POST' && $action === 'revoke') {
  $user = require_auth($conn, CERT_ROLES);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('A certificate id is required.');

  $stmt = $conn->prepare('SELECT public_id, revoked_at FROM certificates WHERE id = ?');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  if (!$row) fail('Certificate not found.', 404);
  if ($row['revoked_at'] !== null) fail('That certificate is already revoked.', 409);

  // The extra condition keeps two simultaneous revokes from both writing an audit row.
  $stmt = $conn->prepare('UPDATE certificates SET revoked_at = NOW() WHERE id = ? AND revoked_at IS NULL');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  if ($stmt->affected_rows === 1) audit($conn, $user['id'], 'certificate_revoke', (string)$row['public_id']);
  ok(['ok' => true]);
}

fail('Unknown certificates action.', 404);
