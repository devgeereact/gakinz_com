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

if ($action === 'start') {
  $params = http_build_query([
    'client_id'     => $clientId,
    'redirect_uri'  => $redirect,
    'response_type' => 'code',
    'scope'         => 'openid email profile',
    'access_type'   => 'online',
    'prompt'        => 'select_account',
  ]);
  header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $params);
  exit;
}

if ($action === 'callback') {
  $code = $_GET['code'] ?? '';
  $bounce = $appUrl !== '' ? rtrim($appUrl, '/') . '/login' : '/login';
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

  // Decode the id_token payload (we trust it: it came straight from Google's
  // token endpoint over TLS using our client secret).
  $parts = explode('.', $idToken);
  $payload = json_decode(base64_decode(strtr($parts[1] ?? '', '-_', '+/')), true) ?: [];
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
