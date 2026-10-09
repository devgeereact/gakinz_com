<?php
/**
 * Google SSO (GAkinzOS — Auth). OAuth 2.0 authorization-code flow.
 *
 *   GET /oauth.php?action=status    → { google: bool }  (is SSO configured?)
 *   GET /oauth.php?action=start     → 302 to Google consent
 *   GET /oauth.php?action=callback  → exchange code, match an existing active
 *                                     user by email, issue a token, redirect to
 *                                     the SPA login with the token in the hash.
 *
 * Config (config.php): $GOOGLE_CLIENT_ID, $GOOGLE_CLIENT_SECRET,
 *   $GOOGLE_REDIRECT (this file's public URL + ?action=callback),
 *   $APP_URL (SPA origin to bounce back to).
 *
 * No auto-provisioning: SSO only logs in users that already exist (an admin
 * creates the account first). This prevents anyone with a Google account from
 * gaining access.
 */
require __DIR__ . '/_bootstrap.php';

const TOKEN_TTL_DAYS = 30;

$action = $_GET['action'] ?? '';
$clientId = $GLOBALS['GOOGLE_CLIENT_ID'] ?? '';
$clientSecret = $GLOBALS['GOOGLE_CLIENT_SECRET'] ?? '';
$redirect = $GLOBALS['GOOGLE_REDIRECT'] ?? '';
$appUrl = $GLOBALS['APP_URL'] ?? '';
$configured = $clientId !== '' && $clientSecret !== '' && $redirect !== '';

if ($action === 'status') {
  ok(['google' => $configured]);
}

if (!$configured) fail('Google SSO is not configured on the server.', 503);
if (!function_exists('curl_init')) fail('Google SSO needs the PHP cURL extension.', 503);

// CSRF state. There is no PHP session anywhere in this codebase and no
// migration runner to add a table for it, so the state lives in a short-lived
// HttpOnly cookie: set on start, compared on callback, cleared either way.
// SameSite must be Lax, not Strict — the callback arrives as a top-level
// navigation from accounts.google.com, and Strict would withhold the cookie
// and break every sign-in.
const OAUTH_STATE_COOKIE = 'gk_oauth_state';
const OAUTH_STATE_TTL = 600; // 10 minutes

function oauth_set_state(string $state): void {
  setcookie(OAUTH_STATE_COOKIE, $state, [
    'expires'  => time() + OAUTH_STATE_TTL,
    'path'     => '/',
    'secure'   => true,
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
}

function oauth_clear_state(): void {
  setcookie(OAUTH_STATE_COOKIE, '', [
    'expires'  => time() - 3600,
    'path'     => '/',
    'secure'   => true,
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
}

if ($action === 'start') {
  $state = bin2hex(random_bytes(16));
  oauth_set_state($state);
  $params = http_build_query([
    'client_id'     => $clientId,
    'redirect_uri'  => $redirect,
    'response_type' => 'code',
    'scope'         => 'openid email profile',
    'access_type'   => 'online',
    'prompt'        => 'select_account',
    'state'         => $state,
  ]);
  header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $params);
  exit;
}

if ($action === 'callback') {
  $code = $_GET['code'] ?? '';
  $bounce = $appUrl !== '' ? rtrim($appUrl, '/') . '/login' : '/login';

  // CSRF: the state we issued on start must come back unchanged. A callback
  // with no cookie, no state, or a mismatched one is rejected before the code
  // is spent, so an attacker cannot graft their own Google account onto a
  // victim's browser session.
  $sentState = (string)($_GET['state'] ?? '');
  $ourState  = (string)($_COOKIE[OAUTH_STATE_COOKIE] ?? '');
  oauth_clear_state();
  if ($sentState === '' || $ourState === '' || !hash_equals($ourState, $sentState)) {
    header("Location: $bounce#sso_error=bad_state");
    exit;
  }

  if ($code === '') { header("Location: $bounce#sso_error=cancelled"); exit; }

  // Exchange the code for tokens.
  $post = http_build_query([
    'code'          => $code,
    'client_id'     => $clientId,
    'client_secret' => $clientSecret,
    'redirect_uri'  => $redirect,
    'grant_type'    => 'authorization_code',
  ]);
  $ch = curl_init('https://oauth2.googleapis.com/token');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $post,
    CURLOPT_TIMEOUT => 15,
  ]);
  $resp = curl_exec($ch);
  curl_close($ch);
  $tok = json_decode((string)$resp, true);
  $idToken = $tok['id_token'] ?? '';
  if ($idToken === '') { header("Location: $bounce#sso_error=exchange_failed"); exit; }

  // Decode the id_token payload. It came straight from Google's token endpoint
  // over TLS using our client secret, so the signature is not re-checked here,
  // but the claims that say who the token was minted for still are: `aud` must
  // be our own client id and `iss` must be Google. Without those a token issued
  // for a different application would be accepted as ours.
  $parts = explode('.', $idToken);
  $payload = json_decode(base64_decode(strtr($parts[1] ?? '', '-_', '+/')), true) ?: [];
  $aud = (string)($payload['aud'] ?? '');
  $iss = (string)($payload['iss'] ?? '');
  if (!hash_equals($clientId, $aud)) { header("Location: $bounce#sso_error=bad_audience"); exit; }
  if (!in_array($iss, ['https://accounts.google.com', 'accounts.google.com'], true)) {
    header("Location: $bounce#sso_error=bad_issuer");
    exit;
  }
  $email = strtolower((string)($payload['email'] ?? ''));
  $verified = !empty($payload['email_verified']);
  if ($email === '' || !$verified) { header("Location: $bounce#sso_error=no_email"); exit; }

  // Match an existing, active user — never auto-create.
  $stmt = $conn->prepare('SELECT id, status FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('s', $email);
  $stmt->execute();
  $u = $stmt->get_result()->fetch_assoc();
  if (!$u) { header("Location: $bounce#sso_error=no_account"); exit; }
  if ($u['status'] !== 'active') { header("Location: $bounce#sso_error=inactive"); exit; }

  $uid = (int)$u['id'];
  $token = bin2hex(random_bytes(32));
  $exp = (new DateTime('+' . TOKEN_TTL_DAYS . ' days'))->format('Y-m-d H:i:s');
  $ua = mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
  $ip = $_SERVER['REMOTE_ADDR'] ?? '';
  if ($stmt = @$conn->prepare('INSERT INTO auth_tokens (user_id, token, user_agent, ip, last_seen_at, expires_at) VALUES (?, ?, ?, ?, NOW(), ?)')) {
    $stmt->bind_param('issss', $uid, $token, $ua, $ip, $exp);
    $stmt->execute();
  } else {
    $stmt = $conn->prepare('INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (?, ?, ?)');
    $stmt->bind_param('iss', $uid, $token, $exp);
    $stmt->execute();
  }
  audit($conn, $uid, 'login_sso', $email);
  header("Location: $bounce#sso_token=$token");
  exit;
}

fail('Unknown action.', 404);
