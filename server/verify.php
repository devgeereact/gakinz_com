<?php
/**
 * Public certificate verification (GAkinzOS §6.8, Phase 6, D-058). No auth.
 *   GET /verify.php?id=GK-XXXX-XXXX-XXXX → { id, recipient, programme, issued_at } | 404 | 429
 *
 * A reference that is revoked, unknown, malformed or a guess all get the same 404 "No matching certificate.",
 * so the answer never says which. Guessing is impractical (60 bits, see certificates.php) and is also throttled:
 * each miss writes one audit row with the caller's IP and no reference, and a connection with VERIFY_MAX_MISSES
 * misses inside VERIFY_WINDOW_MINUTES gets 429 for everything, even a real reference, until the window passes.
 * A hit writes nothing. The answer is never cached, so a revoke takes effect at once.
 */
require __DIR__ . '/_bootstrap.php';

const VERIFY_WINDOW_MINUTES = 10;
const VERIFY_MAX_MISSES = 20;

if ($_SERVER['REQUEST_METHOD'] !== 'GET') fail('Method not allowed.', 405);
header('Cache-Control: no-store');

$id = strtoupper(preg_replace('/\s+/', '', (string)($_GET['id'] ?? '')));
if ($id === '') fail('No certificate reference supplied.');

$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$stmt = $conn->prepare(
  "SELECT COUNT(*) AS c FROM audit_log
   WHERE action = 'certificate_lookup_miss' AND ip = ?
     AND created_at > (NOW() - INTERVAL " . VERIFY_WINDOW_MINUTES . " MINUTE)"
);
$stmt->bind_param('s', $ip);
$stmt->execute();
if ((int)($stmt->get_result()->fetch_assoc()['c'] ?? 0) >= VERIFY_MAX_MISSES) {
  fail('Too many lookups from this connection. Please wait a few minutes and try again.', 429);
}

$row = null;
// Only a well-formed reference reaches the database; anything else is a miss without a query.
if (preg_match('/^GK-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/', $id)) {
  $stmt = $conn->prepare(
    'SELECT public_id AS id, recipient, programme, DATE_FORMAT(issued_at, "%e %M %Y") AS issued_at
     FROM certificates WHERE public_id = ? AND revoked_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('s', $id);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
}

if (!$row) {
  audit($conn, null, 'certificate_lookup_miss'); // no detail: the guess is not kept
  fail('No matching certificate.', 404);
}
ok($row);
