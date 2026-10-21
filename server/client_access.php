<?php
/**
 * Client sign-in by work reference and email (docs/PRODUCT-SPEC.md 6.1,
 * qa/TEST-PLAN.md J03). Switched off unless config.php sets
 * $REFERENCE_SIGNIN_ENABLED = true (strictly true: 1, 'true' or 'yes' leave it
 * off). While off, every route of this file answers 404 and the sign-in page
 * shows nothing new.
 *
 *   GET  /client_access.php?action=status                 → { enabled: true }
 *   POST /client_access.php?action=request {reference, email} → always the same neutral 200
 *   POST /client_access.php?action=redeem  {token}        → { token, expires, user } (a client session)
 *
 * The reference is never the credential. It only narrows who may be sent a
 * link: the link goes to the registered address of an active `client`-role
 * user whose client owns that project or enquiry, and the person proves
 * themselves by opening that mailbox. The reference alone, the email alone,
 * or a reference of another client with this email, sends nothing.
 *
 * Rules (OWASP Forgot Password Cheat Sheet, read 2026-10-19, used as a pattern):
 * - Neutral: every outcome of `request` (match, no match, unknown reference,
 *   staff address, suspended account, two-factor account) answers the same
 *   body and status. Where the host can finish the response early (PHP-FPM
 *   or LiteSpeed) the answer is sent before any lookup; otherwise the work runs
 *   first and every answer is held to the same minimum time, CA_MIN_MS.
 * - Throttled: by address and by IP, counted on requests, never on matches,
 *   so a 429 says nothing about whether an account exists. An address is
 *   limited per IP (5) and, higher, from anywhere (15), so one IP cannot
 *   lock another out of its own requests at the per-pair limit.
 * - Tokens: 256 random bits, stored only as token_hash() (K-059) in
 *   magic_links, 15 minutes, single use, claimed by a guarded UPDATE, so
 *   concurrent redemptions mint at most one session. The token travels in the
 *   URL fragment (#access=), which browsers never send to a server, and is
 *   never written to the audit log. The link URL comes from $APP_URL, never
 *   from the Host header.
 * - Sessions: only for role `client` with a client id and two-factor off,
 *   exactly as auth.php magic_consume. A staff account, or a client with
 *   two-factor on, gets no session here (K-027). It is not account recovery:
 *   nothing here changes a password.
 *
 * Why the session insert is repeated here: auth.php dispatches on load, so its
 * functions and TOKEN_TTL_DAYS cannot be included. The insert below mirrors
 * magic_consume line for line; auth.php, oauth.php, users.php and
 * _bootstrap.php are not changed.
 *
 * Before SQL 19 (no reference columns) nothing ever matches, and the answer is
 * still the neutral one.
 */
require __DIR__ . '/_bootstrap.php';

// Strict on purpose: only the boolean true opens this file.
if (($GLOBALS['REFERENCE_SIGNIN_ENABLED'] ?? false) !== true) fail('Not found.', 404);

const CA_TTL_MINUTES = 15;          // link lifetime
const CA_SESSION_DAYS = 30;         // auth.php TOKEN_TTL_DAYS
const CA_MIN_MS = 1000;             // floor for every `request` answer when the response cannot be finished early
const CA_PER_EMAIL_IP = 5;          // requests for one address from one IP in 15 minutes
const CA_PER_EMAIL = 15;            // requests for one address in 15 minutes from anywhere: a higher ceiling,
                                    // so one IP cannot lock another out at the per-pair limit
const CA_PER_IP = 20;               // requests from one IP in 15 minutes, any address
const CA_REDEEM_FAILS_PER_IP = 20;  // failed redemptions from one IP in 15 minutes (a valid link is never blocked)
const CA_LINKS_PER_USER = 3;        // links issued to one user in 15 minutes (shared with magic links)
const CA_NEUTRAL = 'If the reference and email match a client account, we have sent a sign-in link to that email. It works once, for 15 minutes.';
const CA_BAD_LINK = 'This sign-in link is invalid or has expired.';
const CA_REF_PATTERN = '/^GK-[EP]-\d{4}-\d{4,9}$/';

// Private pages: never cached, indexed, or leaking a referrer.
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');
header('X-Robots-Tag: noindex, nofollow');

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($action === 'status' && $method === 'GET') {
  ok(['enabled' => true]);
}
if ($action === 'request' && $method === 'POST') {
  $in = body();
  $reference = strtoupper(trim(is_string($in['reference'] ?? null) ? $in['reference'] : ''));
  $email = strtolower(trim(is_string($in['email'] ?? null) ? $in['email'] : ''));
  ca_request($conn, $reference, $email);
}
if ($action === 'redeem' && $method === 'POST') {
  ca_redeem($conn);
}
fail('Not found.', 404);

// ── Request a link ───────────────────────────────────────────────────────────
function ca_request(mysqli $conn, string $reference, string $email): void {
  $started = microtime(true);
  // Shape checks only. They depend on what was typed, never on stored data.
  if ($reference === '' || $email === '') fail('Enter your reference and the email address we have for you.');
  if (strlen($email) > 200 || !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Enter a valid email address.');
  if (!preg_match(CA_REF_PATTERN, $reference)) fail('Enter the reference as it appears on your documents, for example GK-P-2026-0001.');

  // The address is kept as a fingerprint (a truncated SHA-256), not in plain
  // text, so the audit log can count requests without holding every address
  // typed. Not keyed: there is no server secret to key it with.
  $emailKey = 'e:' . substr(hash('sha256', 'client_access|' . $email), 0, 40);
  $ip = $_SERVER['REMOTE_ADDR'] ?? '';
  $stmt = $conn->prepare(
    "SELECT COALESCE(SUM(detail = ? AND ip = ?), 0) AS pair, COALESCE(SUM(detail = ?), 0) AS mine,
            COALESCE(SUM(ip = ?), 0) AS from_ip FROM audit_log
     WHERE action = 'client_access_request' AND created_at > (NOW() - INTERVAL 15 MINUTE)"
  );
  $stmt->bind_param('ssss', $emailKey, $ip, $emailKey, $ip);
  $stmt->execute();
  $tries = $stmt->get_result()->fetch_assoc();
  if ((int)($tries['pair'] ?? 0) >= CA_PER_EMAIL_IP || (int)($tries['mine'] ?? 0) >= CA_PER_EMAIL
      || (int)($tries['from_ip'] ?? 0) >= CA_PER_IP) {
    fail('Too many requests. Please wait a few minutes and try again.', 429);
  }
  audit($conn, null, 'client_access_request', $emailKey);

  $neutral = ['ok' => true, 'message' => CA_NEUTRAL];
  if (ca_finish_early($neutral)) {
    // The visitor already has the answer; what follows cannot change its timing.
    ca_issue($conn, $reference, $email);
    exit;
  }
  ca_issue($conn, $reference, $email);
  $waitUs = (int)round((CA_MIN_MS / 1000 - (microtime(true) - $started)) * 1_000_000);
  if ($waitUs > 0) usleep($waitUs);
  ok($neutral);
}

/**
 * Sends the answer and closes the connection, where the server allows it
 * (PHP-FPM or LiteSpeed). Returns false on any other server (the PHP
 * built-in server used by the tests included), and the caller pads instead.
 */
function ca_finish_early(array $payload): bool {
  $finish = function_exists('fastcgi_finish_request') ? 'fastcgi_finish_request'
    : (function_exists('litespeed_finish_request') ? 'litespeed_finish_request' : null);
  if ($finish === null) return false;
  ignore_user_abort(true);
  http_response_code(200);
  echo json_encode($payload);
  $finish();
  return true;
}

/**
 * The lookups run in full on every request, so a no-match takes the same path
 * as a match up to the decision. Issues and emails a link only when every
 * rule holds; otherwise does nothing. Never answers the visitor itself.
 */
function ca_issue(mysqli $conn, string $reference, string $email): void {
  try {
    $clientIds = ca_reference_clients($conn, $reference);

    $stmt = $conn->prepare('SELECT id, name, email, role, client_id, status, totp_enabled FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $u = $stmt->get_result()->fetch_assoc();

    $eligible = $u
      && $u['role'] === 'client'
      && $u['status'] === 'active'
      && empty($u['totp_enabled'])
      && $u['client_id'] !== null
      && strtolower((string)$u['email']) === $email
      && in_array((int)$u['client_id'], $clientIds, true);
    if (!$eligible) return;
    if (($GLOBALS['SMTP_HOST'] ?? '') === '') return; // as magic_request: no mail() fallback for sign-in links

    $uid = (int)$u['id'];
    // Flood guard shared with magic links: three links per user per 15 minutes.
    $cnt = $conn->prepare('SELECT COUNT(*) AS c FROM magic_links WHERE user_id = ? AND created_at > (NOW() - INTERVAL 15 MINUTE)');
    $cnt->bind_param('i', $uid);
    $cnt->execute();
    if ((int)($cnt->get_result()->fetch_assoc()['c'] ?? 0) >= CA_LINKS_PER_USER) return;

    $token = new_token();
    $stored = token_hash($token);
    $ttl = CA_TTL_MINUTES;
    // The database clock sets the expiry, the same clock the claim checks.
    $ins = $conn->prepare('INSERT INTO magic_links (user_id, token, expires_at) VALUES (?, ?, NOW() + INTERVAL ? MINUTE)');
    $ins->bind_param('isi', $uid, $stored, $ttl);
    $ins->execute();

    $appUrl = rtrim((string)($GLOBALS['APP_URL'] ?? 'https://gakinz.com'), '/');
    $link = "$appUrl/login#access=$token";
    require_once __DIR__ . '/_smtp.php';
    $sent = gk_send_email([
      'to' => (string)$u['email'],
      'subject' => 'Your GAkinz sign-in link',
      'body' => "Hello {$u['name']},\n\nSomeone asked to sign in to your GAkinz client portal with reference $reference and this email address. Use this link to sign in. It works once, for " . CA_TTL_MINUTES . " minutes:\n$link\n\nIf this was not you, ignore this email. Nobody can sign in without this link.\n\nGAkinz",
    ]);
    // Never the token, never the link: only that one was issued, and to whom.
    audit($conn, $uid, 'client_access_link', $sent['ok'] ? 'sent' : 'send failed');
  } catch (Throwable $e) {
    // The visitor's answer is fixed already; a failure here is for the log only.
    error_log('GAkinz client access: link not issued (' . get_class($e) . ')');
  }
}

/** Client ids that own this reference: a live project's client, or the client converted from the enquiry. */
function ca_reference_clients(mysqli $conn, string $reference): array {
  $ids = [];
  if (!is_file(__DIR__ . '/_reference.php')) return $ids;
  require_once __DIR__ . '/_reference.php';
  if (!gk_ref_ready($conn)) return $ids; // before SQL 19 nothing matches
  $stmt = $conn->prepare(
    'SELECT p.client_id AS cid FROM projects p JOIN clients c ON c.id = p.client_id AND c.deleted_at IS NULL
      WHERE p.reference = ? AND p.deleted_at IS NULL
     UNION
     SELECT c.id AS cid FROM enquiries e JOIN clients c ON c.source_lead_id = e.id AND c.deleted_at IS NULL
      WHERE e.reference = ? AND e.deleted_at IS NULL'
  );
  $stmt->bind_param('ss', $reference, $reference);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($r = $res->fetch_assoc()) $ids[] = (int)$r['cid'];
  return $ids;
}

// ── Redeem a link ────────────────────────────────────────────────────────────
function ca_redeem(mysqli $conn): void {
  $ip = $_SERVER['REMOTE_ADDR'] ?? '';
  // A valid, unused, unexpired link is looked up before the failure throttle
  // applies, so junk posted from a shared address (an office, a mobile
  // carrier) cannot block a real client's link. Only a failure is throttled.
  $in = body();
  $token = is_string($in['token'] ?? null) ? $in['token'] : '';
  if (!preg_match('/^[0-9a-f]{64}$/', $token)) ca_redeem_failed($conn, null);

  // Hashed rows only: this endpoint never wrote a raw token.
  $hash = token_hash($token);
  $stmt = $conn->prepare('SELECT id, user_id FROM magic_links WHERE token = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1');
  $stmt->bind_param('s', $hash);
  $stmt->execute();
  $m = $stmt->get_result()->fetch_assoc();
  if (!$m) ca_redeem_failed($conn, null);
  $mid = (int)$m['id'];
  $uid = (int)$m['user_id'];

  // Claim first. Only the request whose UPDATE changes the row continues, so
  // concurrent clicks cannot mint several sessions.
  $upd = $conn->prepare('UPDATE magic_links SET used_at = NOW() WHERE id = ? AND used_at IS NULL AND expires_at > NOW()');
  $upd->bind_param('i', $mid);
  $upd->execute();
  if ($upd->affected_rows !== 1) ca_redeem_failed($conn, $uid);

  $stmt = $conn->prepare('SELECT id, name, email, role, client_id, status, totp_enabled FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('i', $uid);
  $stmt->execute();
  $u = $stmt->get_result()->fetch_assoc();
  if (!$u || $u['status'] !== 'active') fail('This account is not active.', 403);
  // Never a session for staff, never past two-factor, never without a client.
  if ($u['role'] !== 'client' || $u['client_id'] === null || !empty($u['totp_enabled'])) {
    $why = $u['role'] !== 'client' ? 'role ' . $u['role'] : ($u['client_id'] === null ? 'no client' : 'two-factor enabled');
    audit($conn, $uid, 'client_access_refused', $why);
    fail('This link cannot sign in this account. Please sign in with your password.', 403);
  }

  // The same session row auth.php login and magic_consume write.
  $tok = new_token();
  $exp = (new DateTime('+' . CA_SESSION_DAYS . ' days'))->format('Y-m-d H:i:s');
  $ua = mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
  $stored = token_hash($tok);
  if ($stmt = @$conn->prepare('INSERT INTO auth_tokens (user_id, token, user_agent, ip, last_seen_at, expires_at) VALUES (?, ?, ?, ?, NOW(), ?)')) {
    $stmt->bind_param('issss', $uid, $stored, $ua, $ip, $exp);
    $stmt->execute();
  } else {
    $stmt = $conn->prepare('INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (?, ?, ?)');
    $stmt->bind_param('iss', $uid, $stored, $exp);
    $stmt->execute();
  }
  audit($conn, $uid, 'login_client_access', '');
  ok([
    'token'   => $tok,
    'expires' => $exp,
    'user'    => [
      'id' => $uid, 'name' => $u['name'], 'email' => $u['email'], 'role' => $u['role'],
      'client_id' => (int)$u['client_id'],
    ],
  ]);
}

/**
 * One answer for a missing, wrong, used or expired link, counted for the
 * throttle. Past the limit the answer is 429 instead, which tells a guesser
 * nothing a 400 would not.
 */
function ca_redeem_failed(mysqli $conn, ?int $uid): void {
  $ip = $_SERVER['REMOTE_ADDR'] ?? '';
  $stmt = $conn->prepare(
    "SELECT COUNT(*) AS c FROM audit_log
     WHERE action = 'client_access_redeem_failed' AND ip = ? AND created_at > (NOW() - INTERVAL 15 MINUTE)"
  );
  $stmt->bind_param('s', $ip);
  $stmt->execute();
  if ((int)($stmt->get_result()->fetch_assoc()['c'] ?? 0) >= CA_REDEEM_FAILS_PER_IP) {
    fail('Too many attempts. Please wait a few minutes and try again.', 429);
  }
  audit($conn, $uid, 'client_access_redeem_failed', '');
  fail(CA_BAD_LINK, 400);
}
