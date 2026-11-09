<?php
/**
 * Who is signed in (§6.1). Sign-in itself is Clerk (D-052, D-057): Clerk proves who the person is by an email
 * code or Google, and require_auth() in _bootstrap.php links that Clerk user to a users row by email. The row's
 * role, never anything the browser sends, decides what they may do.
 *
 *   GET /auth.php?action=me   (Bearer)   → { user, totp_enabled }
 *
 * Retired on 2026-11-09 (D-057), now 404: password login, forgot and reset, magic links, the two-factor setup
 * actions, session listing and revoke, and logout. The files for the Google and reference sign-ins
 * (oauth.php, client_access.php) are 404 stubs. The server still accepts an existing stored session token in
 * require_auth() until the soak ends and the tables are dropped (docs/WORKBOOK.md, Phase 9).
 *
 * On an empty users table a super admin is created from $SEED_ADMIN_EMAIL in config.php, with no password:
 * the person signs in through Clerk with that address. With no $SEED_ADMIN_EMAIL nothing is seeded.
 */
require __DIR__ . '/_bootstrap.php';

ensure_seed($conn);

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($action === 'me' && $method === 'GET') return me($conn);
fail('Unknown auth action.', 404);

function me(mysqli $conn): void {
  $u = require_auth($conn);
  // The caller's own two-factor state, so My account can offer the right
  // controls to every role (users.php, the only other source, is admin-only).
  // Kept beside `user`, not inside it, so the stored session shape is
  // unchanged. Null on an un-migrated DB without the totp columns.
  // try/catch, not @: under PHP 8 mysqli throws on a missing column.
  $totp = null;
  try {
    $stmt = $conn->prepare('SELECT totp_enabled FROM users WHERE id = ? LIMIT 1');
    $uid = $u['id'];
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if ($row) $totp = !empty($row['totp_enabled']);
  } catch (Throwable $e) {
    $totp = null;
  }
  ok(['user' => $u, 'totp_enabled' => $totp]);
}

// ── Seed ──────────────────────────────────────────────────────────────────────
function ensure_seed(mysqli $conn): void {
  $res = $conn->query('SELECT COUNT(*) AS c FROM users');
  $row = $res ? $res->fetch_assoc() : ['c' => 1];
  if ((int)$row['c'] > 0) return;

  // No configured address means no seeding. Never invent one: a guessed
  // address would create a live super-admin nobody owns.
  $email = strtolower(trim((string)($GLOBALS['SEED_ADMIN_EMAIL'] ?? '')));
  if ($email === '') return;

  // No password exists to leak or guess: '!' is not a valid hash, so nothing can match it, and the owner
  // signs in through Clerk with this address.
  $name = 'GAkinz Admin';
  $role = 'super_admin';
  $hash = '!';
  $stmt = $conn->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
  $stmt->bind_param('ssss', $name, $email, $hash, $role);
  $stmt->execute();
}
