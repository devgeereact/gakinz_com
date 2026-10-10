<?php
/**
 * Authentication (§6.1). Email + password → opaque bearer token.
 * Roles are stored on the user and enforced server-side via require_auth();
 * the client never asserts its own role.
 *
 *   POST /auth.php?action=login   {email, password}      → { token, expires, user }
 *   GET  /auth.php?action=me      (Bearer)               → { user, totp_enabled }
 *   POST /auth.php?action=logout  (Bearer)               → { ok: true }
 *   POST /auth.php?action=forgot  {email}                → { ok: true }   (always ok; no enumeration)
 *   POST /auth.php?action=reset   {token, password}      → { ok: true }
 *
 * On an empty users table a seed super-admin is created from
 * $SEED_ADMIN_EMAIL / $SEED_ADMIN_PASSWORD in config.php. With no
 * $SEED_ADMIN_EMAIL nothing is seeded. If no password is configured a random
 * one is generated and written to the PHP error log, never to a file in the
 * document root.
 */
require __DIR__ . '/_bootstrap.php';

const TOKEN_TTL_DAYS = 30;
const RESET_TTL_MINUTES = 60;
// Magic links. Declared here, above the dispatch below: a top-level const
// placed after the switch is never reached, because every action returns.
const MAGIC_TTL_MINUTES = 15;
const MAGIC_ROLES = ['client'];

ensure_seed($conn);

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
  case 'login':   if ($method === 'POST') return login($conn); break;
  case 'me':      if ($method === 'GET')  return me($conn); break;
  case 'logout':  if ($method === 'POST') return logout($conn); break;
  case 'forgot':  if ($method === 'POST') return forgot($conn); break;
  case 'reset':   if ($method === 'POST') return reset_password($conn); break;
  case 'sessions': if ($method === 'GET')  return sessions($conn); break;
  case 'revoke':   if ($method === 'POST') return revoke_session($conn); break;
  case 'twofa_setup':   if ($method === 'POST') return twofa_setup($conn); break;
  case 'twofa_enable':  if ($method === 'POST') return twofa_enable($conn); break;
  case 'twofa_disable': if ($method === 'POST') return twofa_disable($conn); break;
  case 'twofa_recodes': if ($method === 'POST') return twofa_recodes($conn); break;
  case 'magic_request': if ($method === 'POST') return magic_request($conn); break;
  case 'magic_consume': if ($method === 'POST') return magic_consume($conn); break;
}
fail('Unknown auth action.', 404);

// ── Actions ───────────────────────────────────────────────────────────────────
function login(mysqli $conn): void {
  $in = body();
  $email = strtolower(str_field($in, 'email', 200));
  $pass  = (string)($in['password'] ?? '');
  if ($email === '' || $pass === '') fail('Email and password are required.');

  // Brute-force throttle: block after too many recent failures for this email
  // or IP. Reuses audit_log (failure rows store the email in `detail`). Counts
  // failed second-factor attempts too, so TOTP guessing is throttled as well.
  $ip = $_SERVER['REMOTE_ADDR'] ?? '';
  $stmt = $conn->prepare(
    "SELECT COUNT(*) AS c FROM audit_log
     WHERE action IN ('login_failed', 'login_2fa_failed')
       AND created_at > (NOW() - INTERVAL 15 MINUTE)
       AND (detail = ? OR ip = ?)"
  );
  $stmt->bind_param('ss', $email, $ip);
  $stmt->execute();
  if ((int)($stmt->get_result()->fetch_assoc()['c'] ?? 0) >= 10) {
    fail('Too many attempts. Please wait a few minutes and try again.', 429);
  }

  // totp columns are optional (un-migrated DB): fall back to a query without them.
  $stmt = @$conn->prepare('SELECT id, name, email, role, client_id, status, password_hash, totp_secret, totp_enabled, totp_recovery FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1');
  if (!$stmt) {
    $stmt = $conn->prepare('SELECT id, name, email, role, client_id, status, password_hash FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1');
  }
  $stmt->bind_param('s', $email);
  $stmt->execute();
  $u = $stmt->get_result()->fetch_assoc();

  if (!$u || !password_verify($pass, $u['password_hash'])) {
    audit($conn, $u ? (int)$u['id'] : null, 'login_failed', $email);
    fail('Email or password is incorrect.', 401);
  }
  if ($u['status'] !== 'active') fail('Account is not active.', 403);

  // Two-factor gate: if enabled, a valid TOTP code (or a one-time recovery code)
  // must accompany the login.
  if (!empty($u['totp_enabled']) && !empty($u['totp_secret'])) {
    $code = preg_replace('/\s+/', '', (string)($in['code'] ?? ''));
    if ($code === '') fail('Two-factor code required.', 401, ['two_factor_required' => true]);
    $okTotp = gk_totp_verify($u['totp_secret'], $code);
    if (!$okTotp) {
      // Fall back to a recovery code (consumed on use).
      $consumed = gk_consume_recovery($conn, (int)$u['id'], $u['totp_recovery'] ?? '', $code);
      if (!$consumed) {
        audit($conn, (int)$u['id'], 'login_2fa_failed', $email);
        fail('That code is invalid or expired.', 401, ['two_factor_required' => true]);
      }
      audit($conn, (int)$u['id'], 'login_2fa_recovery', $email);
    }
  }

  $token = new_token();
  $exp = (new DateTime("+" . TOKEN_TTL_DAYS . " days"))->format('Y-m-d H:i:s');
  $uid = (int)$u['id'];
  $ua = mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
  // Record device + IP for the active-sessions list. Falls back to the original
  // insert if the DB hasn't been migrated with the session-tracking columns.
  if ($stmt = @$conn->prepare('INSERT INTO auth_tokens (user_id, token, user_agent, ip, last_seen_at, expires_at) VALUES (?, ?, ?, ?, NOW(), ?)')) {
    $stmt->bind_param('issss', $uid, $token, $ua, $ip, $exp);
    $stmt->execute();
  } else {
    $stmt = $conn->prepare('INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (?, ?, ?)');
    $stmt->bind_param('iss', $uid, $token, $exp);
    $stmt->execute();
  }
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

function logout(mysqli $conn): void {
  $token = bearer_token();
  if ($token !== '') {
    // Read the owner first so the audit row can be attributed, then drop it.
    $stmt = $conn->prepare('SELECT user_id FROM auth_tokens WHERE token = ? LIMIT 1');
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $uid = $row ? (int)$row['user_id'] : null;

    $stmt = $conn->prepare('DELETE FROM auth_tokens WHERE token = ?');
    $stmt->bind_param('s', $token);
    $stmt->execute();
    if ($uid !== null) audit($conn, $uid, 'logout', '');
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
    $uid = (int)$u['id'];
    // Flood guard: cap recent reset requests per user so the table can't be
    // filled by repeated calls. Silently stop after 3 in 15 minutes.
    $stmt = $conn->prepare('SELECT COUNT(*) AS c FROM password_resets WHERE user_id = ? AND created_at > (NOW() - INTERVAL 15 MINUTE)');
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    if ((int)($stmt->get_result()->fetch_assoc()['c'] ?? 0) >= 3) { ok(['ok' => true]); }
    $token = new_token();
    $exp = (new DateTime("+" . RESET_TTL_MINUTES . " minutes"))->format('Y-m-d H:i:s');
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

  $stmt = $conn->prepare('UPDATE users SET password_hash = ? WHERE id = ? AND deleted_at IS NULL');
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

// ── Sessions (device tracking) ─────────────────────────────────────────────────
// A user sees their own live sessions (device, IP, last seen) and can revoke any
// one — e.g. a forgotten login on another machine.
function sessions(mysqli $conn): void {
  $u = require_auth($conn);
  $uid = $u['id'];
  $current = bearer_token();
  $rows = [];
  $stmt = $conn->prepare(
    'SELECT id, token, user_agent, ip, last_seen_at, created_at, expires_at
     FROM auth_tokens WHERE user_id = ? AND expires_at > NOW() ORDER BY last_seen_at DESC, id DESC'
  );
  $stmt->bind_param('i', $uid);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($r = $res->fetch_assoc()) {
    $rows[] = [
      'id'           => (int)$r['id'],
      'user_agent'   => $r['user_agent'],
      'ip'           => $r['ip'],
      'last_seen_at' => $r['last_seen_at'],
      'created_at'   => $r['created_at'],
      'expires_at'   => $r['expires_at'],
      'current'      => hash_equals((string)$r['token'], $current),
    ];
  }
  ok($rows);
}

function revoke_session(mysqli $conn): void {
  $u = require_auth($conn);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('A session id is required.');
  $uid = $u['id'];
  // Scope to the caller's own tokens — never let one user revoke another's.
  $stmt = $conn->prepare('DELETE FROM auth_tokens WHERE id = ? AND user_id = ?');
  $stmt->bind_param('ii', $id, $uid);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('Session not found.', 404);
  audit($conn, $uid, 'session_revoke', "#$id");
  ok(['ok' => true]);
}

// ── Two-factor (TOTP) ───────────────────────────────────────────────────────
// Standard RFC-6238 TOTP (30s step, 6 digits, SHA1) — works with Google
// Authenticator, 1Password, Authy, etc. Implemented without any library.
function gk_base32_encode(string $bin): string {
  $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  $bits = '';
  foreach (str_split($bin) as $c) $bits .= str_pad(decbin(ord($c)), 8, '0', STR_PAD_LEFT);
  $out = '';
  foreach (str_split($bits, 5) as $chunk) {
    $out .= $alphabet[bindec(str_pad($chunk, 5, '0', STR_PAD_RIGHT))];
  }
  return $out;
}
function gk_base32_decode(string $b32): string {
  $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  $b32 = strtoupper(preg_replace('/[^A-Z2-7]/', '', $b32));
  $bits = '';
  foreach (str_split($b32) as $c) $bits .= str_pad(decbin(strpos($alphabet, $c)), 5, '0', STR_PAD_LEFT);
  $out = '';
  foreach (str_split($bits, 8) as $byte) {
    if (strlen($byte) === 8) $out .= chr(bindec($byte));
  }
  return $out;
}
function gk_totp_at(string $secretB32, int $counter): string {
  $key = gk_base32_decode($secretB32);
  $bin = pack('N*', 0) . pack('N*', $counter); // 64-bit big-endian counter
  $hash = hash_hmac('sha1', $bin, $key, true);
  $offset = ord($hash[19]) & 0xf;
  $val = ((ord($hash[$offset]) & 0x7f) << 24)
       | ((ord($hash[$offset + 1]) & 0xff) << 16)
       | ((ord($hash[$offset + 2]) & 0xff) << 8)
       | (ord($hash[$offset + 3]) & 0xff);
  return str_pad((string)($val % 1000000), 6, '0', STR_PAD_LEFT);
}
function gk_totp_verify(string $secretB32, string $code): bool {
  $code = preg_replace('/\D/', '', $code);
  if (strlen($code) !== 6) return false;
  $t = (int)floor(time() / 30);
  // Allow ±1 step for clock drift.
  for ($i = -1; $i <= 1; $i++) {
    if (hash_equals(gk_totp_at($secretB32, $t + $i), $code)) return true;
  }
  return false;
}

function twofa_setup(mysqli $conn): void {
  $u = require_auth($conn);
  $uid = $u['id'];

  // Re-enrolling replaces the secret and drops the account back to disabled, so
  // on an account that already has two-factor on this needs a current code.
  // Without it a stolen bearer token could silently switch two-factor off.
  $stmt = $conn->prepare('SELECT totp_secret, totp_enabled FROM users WHERE id = ? LIMIT 1');
  $stmt->bind_param('i', $uid);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  if ($row && !empty($row['totp_enabled'])) {
    $code = (string)(body()['code'] ?? '');
    if (!gk_totp_verify((string)$row['totp_secret'], $code)) {
      audit($conn, $uid, '2fa_setup_denied', '');
      fail('Enter a current code to replace your two-factor setup.');
    }
  }

  $secret = gk_base32_encode(random_bytes(20));
  // Store the pending secret but DON'T enable until a code is verified.
  $stmt = $conn->prepare('UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?');
  $stmt->bind_param('si', $secret, $uid);
  $stmt->execute();
  audit($conn, $uid, '2fa_setup', '');
  $label = rawurlencode('GAkinz:' . $u['email']);
  $issuer = rawurlencode('GAkinz');
  $otpauth = "otpauth://totp/$label?secret=$secret&issuer=$issuer&period=30&digits=6";
  ok(['secret' => $secret, 'otpauth' => $otpauth]);
}

function twofa_enable(mysqli $conn): void {
  $u = require_auth($conn);
  $code = (string)(body()['code'] ?? '');
  $uid = $u['id'];
  $stmt = $conn->prepare('SELECT totp_secret FROM users WHERE id = ? LIMIT 1');
  $stmt->bind_param('i', $uid);
  $stmt->execute();
  $secret = $stmt->get_result()->fetch_assoc()['totp_secret'] ?? '';
  if ($secret === '') fail('Start setup first.');
  if (!gk_totp_verify($secret, $code)) fail('That code is invalid. Check your authenticator and try again.');
  [$plain, $hashed] = gk_gen_recovery();
  $stmt = $conn->prepare('UPDATE users SET totp_enabled = 1, totp_recovery = ? WHERE id = ?');
  $stmt->bind_param('si', $hashed, $uid);
  $stmt->execute();
  audit($conn, $uid, '2fa_enabled', '');
  // Return the recovery codes ONCE (plaintext is never stored).
  ok(['ok' => true, 'recovery_codes' => $plain]);
}

function twofa_disable(mysqli $conn): void {
  $u = require_auth($conn);
  $code = (string)(body()['code'] ?? '');
  $uid = $u['id'];
  $stmt = $conn->prepare('SELECT totp_secret, totp_enabled FROM users WHERE id = ? LIMIT 1');
  $stmt->bind_param('i', $uid);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  if (!$row || empty($row['totp_enabled'])) ok(['ok' => true]); // already off / not found
  if (!gk_totp_verify((string)$row['totp_secret'], $code)) fail('Enter a current code to turn off two-factor.');
  $stmt = $conn->prepare('UPDATE users SET totp_enabled = 0, totp_secret = NULL, totp_recovery = NULL WHERE id = ?');
  $stmt->bind_param('i', $uid);
  $stmt->execute();
  audit($conn, $uid, '2fa_disabled', '');
  ok(['ok' => true]);
}

// Regenerate recovery codes (requires a current TOTP code). Invalidates old ones.
function twofa_recodes(mysqli $conn): void {
  $u = require_auth($conn);
  $code = (string)(body()['code'] ?? '');
  $uid = $u['id'];
  $stmt = $conn->prepare('SELECT totp_secret, totp_enabled FROM users WHERE id = ? LIMIT 1');
  $stmt->bind_param('i', $uid);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  if (!$row || empty($row['totp_enabled'])) fail('Two-factor is not enabled.');
  if (!gk_totp_verify((string)$row['totp_secret'], $code)) fail('Enter a current code to regenerate recovery codes.');
  [$plain, $hashed] = gk_gen_recovery();
  $stmt = $conn->prepare('UPDATE users SET totp_recovery = ? WHERE id = ?');
  $stmt->bind_param('si', $hashed, $uid);
  $stmt->execute();
  audit($conn, $uid, '2fa_recodes', '');
  ok(['ok' => true, 'recovery_codes' => $plain]);
}

// Generate 10 recovery codes → [plaintext[], json(bcrypt hashes)].
function gk_gen_recovery(): array {
  $plain = [];
  $hashed = [];
  for ($i = 0; $i < 10; $i++) {
    $c = substr(bin2hex(random_bytes(5)), 0, 10); // 10 hex chars
    $code = substr($c, 0, 5) . '-' . substr($c, 5, 5);
    $plain[] = $code;
    $hashed[] = password_hash($code, PASSWORD_BCRYPT);
  }
  return [$plain, json_encode($hashed)];
}

// Try to consume a recovery code; on match removes it and persists the rest.
function gk_consume_recovery(mysqli $conn, int $uid, ?string $json, string $code): bool {
  $code = strtolower(trim($code));
  $hashes = $json ? (json_decode($json, true) ?: []) : [];
  if (!is_array($hashes) || !$hashes) return false;
  foreach ($hashes as $i => $h) {
    if (is_string($h) && password_verify($code, $h)) {
      array_splice($hashes, $i, 1);
      $rest = json_encode($hashes);
      $stmt = $conn->prepare('UPDATE users SET totp_recovery = ? WHERE id = ?');
      $stmt->bind_param('si', $rest, $uid);
      $stmt->execute();
      return true;
    }
  }
  return false;
}

// ── Magic-link login (passwordless) ─────────────────────────────────────────
// Customer convenience only. A link never signs in a staff account and never
// stands in for two-factor: staff, and any client who has two-factor on, sign
// in with password and code (plan findings A22, A23).

function magic_request(mysqli $conn): void {
  $email = strtolower(str_field(body(), 'email', 200));
  $stmt = $conn->prepare('SELECT id, name, status, role, totp_enabled FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('s', $email);
  $stmt->execute();
  $u = $stmt->get_result()->fetch_assoc();
  // Always succeed (no account enumeration). Only actually send for active
  // client accounts without two-factor, the only accounts a link can sign in.
  $eligible = $u && $u['status'] === 'active' && in_array($u['role'], MAGIC_ROLES, true) && empty($u['totp_enabled']);
  if ($eligible && ($GLOBALS['SMTP_HOST'] ?? '') !== '') {
    $uid = (int)$u['id'];
    // Flood guard: max 3 in 15 min.
    $cnt = $conn->prepare('SELECT COUNT(*) AS c FROM magic_links WHERE user_id = ? AND created_at > (NOW() - INTERVAL 15 MINUTE)');
    $cnt->bind_param('i', $uid);
    $cnt->execute();
    if ((int)($cnt->get_result()->fetch_assoc()['c'] ?? 0) < 3) {
      $token = new_token();
      $exp = (new DateTime('+' . MAGIC_TTL_MINUTES . ' minutes'))->format('Y-m-d H:i:s');
      $stmt = $conn->prepare('INSERT INTO magic_links (user_id, token, expires_at) VALUES (?, ?, ?)');
      $stmt->bind_param('iss', $uid, $token, $exp);
      $stmt->execute();
      $appUrl = rtrim($GLOBALS['APP_URL'] ?? 'https://gakinz.com', '/');
      $link = "$appUrl/login#magic=$token";
      require_once __DIR__ . '/_smtp.php';
      gk_send_email([
        'to' => $email,
        'subject' => 'Your GAkinz sign-in link',
        'body' => "Hello {$u['name']},\n\nUse this link to sign in (valid " . MAGIC_TTL_MINUTES . " minutes):\n$link\n\nIf you didn't request this, ignore this email.\n\nGAkinz",
      ]);
      audit($conn, $uid, 'magic_request', '');
    }
  }
  ok(['ok' => true]);
}

function magic_consume(mysqli $conn): void {
  $token = str_field(body(), 'token', 64);
  if ($token === '') fail('Invalid link.', 400);
  $stmt = $conn->prepare(
    'SELECT m.id, m.user_id FROM magic_links m
     WHERE m.token = ? AND m.used_at IS NULL AND m.expires_at > NOW() LIMIT 1'
  );
  $stmt->bind_param('s', $token);
  $stmt->execute();
  $m = $stmt->get_result()->fetch_assoc();
  if (!$m) fail('This sign-in link is invalid or has expired.', 400);
  $uid = (int)$m['user_id'];
  $mid = (int)$m['id'];

  // Burn the link first, atomically. Only the request whose UPDATE changes the
  // row may continue, so concurrent clicks cannot mint several sessions.
  $upd = $conn->prepare('UPDATE magic_links SET used_at = NOW() WHERE id = ? AND used_at IS NULL AND expires_at > NOW()');
  $upd->bind_param('i', $mid);
  $upd->execute();
  if ($upd->affected_rows !== 1) fail('This sign-in link is invalid or has expired.', 400);

  // Load the user (must still be active).
  $stmt = $conn->prepare('SELECT id, name, email, role, client_id, status, totp_enabled FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('i', $uid);
  $stmt->execute();
  $u = $stmt->get_result()->fetch_assoc();
  if (!$u || $u['status'] !== 'active') fail('This account is not active.', 403);
  if (!in_array($u['role'], MAGIC_ROLES, true)) {
    audit($conn, $uid, 'login_magic_refused', 'role ' . $u['role']);
    fail('Sign-in links are for client accounts. Please sign in with your password.', 403);
  }
  if (!empty($u['totp_enabled'])) {
    audit($conn, $uid, 'login_magic_refused', 'two-factor enabled');
    fail('This account uses two-factor authentication. Please sign in with your password and code.', 403);
  }

  // Issue a session token (records device/IP like a normal login).
  $tok = new_token();
  $exp = (new DateTime('+' . TOKEN_TTL_DAYS . ' days'))->format('Y-m-d H:i:s');
  $ua = mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
  $ip = $_SERVER['REMOTE_ADDR'] ?? '';
  if ($stmt = @$conn->prepare('INSERT INTO auth_tokens (user_id, token, user_agent, ip, last_seen_at, expires_at) VALUES (?, ?, ?, ?, NOW(), ?)')) {
    $stmt->bind_param('issss', $uid, $tok, $ua, $ip, $exp);
    $stmt->execute();
  } else {
    $stmt = $conn->prepare('INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (?, ?, ?)');
    $stmt->bind_param('iss', $uid, $tok, $exp);
    $stmt->execute();
  }
  audit($conn, $uid, 'login_magic', $u['email']);
  ok([
    'token'   => $tok,
    'expires' => $exp,
    'user'    => [
      'id' => $uid, 'name' => $u['name'], 'email' => $u['email'], 'role' => $u['role'],
      'client_id' => $u['client_id'] !== null ? (int)$u['client_id'] : null,
    ],
  ]);
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

  $name = 'GAkinz Admin';
  $role = 'super_admin';
  // Never ship a known default password. Use the configured one, else generate
  // a strong random password and write it to the PHP error log only. It is
  // never written to a file under the document root, where a web request could
  // fetch it.
  $plain = (string)($GLOBALS['SEED_ADMIN_PASSWORD'] ?? '');
  if ($plain === '') {
    $plain = bin2hex(random_bytes(12)); // 24 random hex chars
    error_log("GAkinz seed super-admin created for $email with generated password: $plain — sign in, change it immediately, then set \$SEED_ADMIN_PASSWORD in config.php.");
  }
  $hash = password_hash($plain, PASSWORD_BCRYPT);
  $stmt = $conn->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
  $stmt->bind_param('ssss', $name, $email, $hash, $role);
  $stmt->execute();
}
