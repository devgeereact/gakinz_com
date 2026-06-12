<?php
/**
 * Authentication (§6.1). Email + password → opaque bearer token.
 * Roles are stored on the user and enforced server-side via require_auth();
 * the client never asserts its own role.
 *
 *   POST /auth.php?action=login   {email, password}      → { token, expires, user }
 *   GET  /auth.php?action=me      (Bearer)               → { user }
 *   POST /auth.php?action=logout  (Bearer)               → { ok: true }
 *   POST /auth.php?action=forgot  {email}                → { ok: true }   (always ok; no enumeration)
 *   POST /auth.php?action=reset   {token, password}      → { ok: true }
 *
 * On an empty users table the seed super-admin is created:
 *   dev@gakinz.com / Testing123! / super_admin
 */
require __DIR__ . '/_bootstrap.php';

const TOKEN_TTL_DAYS = 30;
const RESET_TTL_MINUTES = 60;

ensure_seed($conn);

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
  case 'login':   if ($method === 'POST') return login($conn); break;
  case 'me':      if ($method === 'GET')  return me($conn); break;
  case 'logout':  if ($method === 'POST') return logout($conn); break;
  case 'forgot':  if ($method === 'POST') return forgot($conn); break;
  case 'reset':   if ($method === 'POST') return reset_password($conn); break;
}
fail('Unknown auth action.', 404);

// ── Actions ───────────────────────────────────────────────────────────────────
function login(mysqli $conn): void {
  $in = body();
  $email = strtolower(str_field($in, 'email', 200));
  $pass  = (string)($in['password'] ?? '');
  if ($email === '' || $pass === '') fail('Email and password are required.');

  $stmt = $conn->prepare('SELECT id, name, email, role, client_id, status, password_hash FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('s', $email);
  $stmt->execute();
  $u = $stmt->get_result()->fetch_assoc();

  if (!$u || !password_verify($pass, $u['password_hash'])) {
    audit($conn, $u ? (int)$u['id'] : null, 'login_failed', $email);
    fail('Email or password is incorrect.', 401);
  }
  if ($u['status'] !== 'active') fail('Account is not active.', 403);

  $token = new_token();
  $exp = (new DateTime("+" . TOKEN_TTL_DAYS . " days"))->format('Y-m-d H:i:s');
  $uid = (int)$u['id'];
  $stmt = $conn->prepare('INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (?, ?, ?)');
  $stmt->bind_param('iss', $uid, $token, $exp);
  $stmt->execute();
  audit($conn, $uid, 'login', '');

  ok([
    'token'   => $token,
    'expires' => $exp,
    'user'    => [
      'id'    => $uid,
      'name'  => $u['name'],
      'email' => $u['email'],
      'role'  => $u['role'],
      'client_id' => $u['client_id'] !== null ? (int)$u['client_id'] : null,
    ],
  ]);
}

function me(mysqli $conn): void {
  $u = require_auth($conn);
  ok(['user' => $u]);
}

function logout(mysqli $conn): void {
  $token = bearer_token();
  if ($token !== '') {
    $stmt = $conn->prepare('DELETE FROM auth_tokens WHERE token = ?');
    $stmt->bind_param('s', $token);
    $stmt->execute();
  }
  ok(['ok' => true]);
}

function forgot(mysqli $conn): void {
  $email = strtolower(str_field(body(), 'email', 200));
  $stmt = $conn->prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('s', $email);
  $stmt->execute();
  $u = $stmt->get_result()->fetch_assoc();

  if ($u) {
    $token = new_token();
    $exp = (new DateTime("+" . RESET_TTL_MINUTES . " minutes"))->format('Y-m-d H:i:s');
    $uid = (int)$u['id'];
    $stmt = $conn->prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)');
    $stmt->bind_param('iss', $uid, $token, $exp);
    $stmt->execute();
    audit($conn, $uid, 'password_reset_requested', '');
    // Email delivery (Resend) is Phase 2. Until then, retrieve the token from
    // the password_resets table to complete a reset manually.
  }
  // Always succeed — do not reveal whether the email exists.
  ok(['ok' => true]);
}

function reset_password(mysqli $conn): void {
  $in = body();
  $token = str_field($in, 'token', 64);
  $pass  = (string)($in['password'] ?? '');
  if ($token === '' || strlen($pass) < 8) fail('A token and an 8+ character password are required.');

  $stmt = $conn->prepare('SELECT id, user_id FROM password_resets WHERE token = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1');
  $stmt->bind_param('s', $token);
  $stmt->execute();
  $r = $stmt->get_result()->fetch_assoc();
  if (!$r) fail('This reset link is invalid or has expired.', 400);

  $hash = password_hash($pass, PASSWORD_BCRYPT);
  $uid = (int)$r['user_id'];
  $rid = (int)$r['id'];

  $stmt = $conn->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
  $stmt->bind_param('si', $hash, $uid);
  $stmt->execute();

  $stmt = $conn->prepare('UPDATE password_resets SET used_at = NOW() WHERE id = ?');
  $stmt->bind_param('i', $rid);
  $stmt->execute();

  // Invalidate existing sessions after a password change
  $stmt = $conn->prepare('DELETE FROM auth_tokens WHERE user_id = ?');
  $stmt->bind_param('i', $uid);
  $stmt->execute();

  audit($conn, $uid, 'password_reset', '');
  ok(['ok' => true]);
}

// ── Seed ──────────────────────────────────────────────────────────────────────
function ensure_seed(mysqli $conn): void {
  $res = $conn->query('SELECT COUNT(*) AS c FROM users');
  $row = $res ? $res->fetch_assoc() : ['c' => 1];
  if ((int)$row['c'] > 0) return;

  $name = 'GAkinz Admin';
  $email = 'dev@gakinz.com';
  $role = 'super_admin';
  $hash = password_hash('Testing123!', PASSWORD_BCRYPT);
  $stmt = $conn->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
  $stmt->bind_param('ssss', $name, $email, $hash, $role);
  $stmt->execute();
}
