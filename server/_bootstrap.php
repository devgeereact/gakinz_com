<?php
/**
 * Shared bootstrap for every GAkinz API endpoint.
 * Handles CORS (incl. preflight), JSON helpers, and request body parsing.
 * Each endpoint does: require __DIR__ . '/_bootstrap.php';  // gives $conn + helpers
 */
require __DIR__ . '/config.php';

// ── CORS ───────────────────────────────────────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ALLOWED_ORIGINS, true)) {
  header("Access-Control-Allow-Origin: $origin");
  header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Baseline security headers on every API response. Deliberately no
// Content-Security-Policy: the SPA has not been audited for one and a wrong
// policy would break the site.
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: DENY');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function body(): array {
  $raw = file_get_contents('php://input');
  if (!$raw) return $_POST ?? [];
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function ok($data, int $code = 200): void {
  http_response_code($code);
  echo json_encode($data);
  exit;
}

function fail(string $message, int $code = 400, array $extra = []): void {
  http_response_code($code);
  echo json_encode(array_merge(['error' => $message], $extra));
  exit;
}

function str_field(array $src, string $key, int $max = 5000): string {
  $v = trim((string)($src[$key] ?? ''));
  return mb_substr($v, 0, $max);
}

// ── Auth ──────────────────────────────────────────────────────────────────────
const VALID_ROLES = ['super_admin', 'admin', 'manager', 'trainer', 'editor', 'employee', 'client'];

function bearer_token(): string {
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
  if (preg_match('/Bearer\s+(\S+)/i', $h, $m)) return $m[1];
  return '';
}

function new_token(): string {
  return bin2hex(random_bytes(32)); // 64 hex chars
}

/**
 * Session, reset and magic-link tokens are stored hashed (K-059), so a copy of
 * the database or a backup holds no working credential. The stored form is the
 * first 62 hex characters of SHA-256 (248 bits): two characters shorter than a
 * raw 64-character token, so the two can never be confused, and it fits the
 * existing CHAR(64) columns with no schema change.
 */
function token_hash(string $token): string {
  return substr(hash('sha256', $token), 0, 62);
}

/**
 * WHERE fragment matching a presented token against `$col`. Rows written
 * before hashing hold the raw 64-character token; they still match until they
 * expire and the prune job removes them, so nobody is signed out by the
 * upgrade. A stolen 62-character hash presented as a token matches neither
 * branch: its own hash is different, and the raw branch requires 64 characters.
 * Bind the two values from token_params().
 */
function token_where(string $col = 'token'): string {
  return "($col = ? OR ($col = ? AND CHAR_LENGTH($col) = 64))";
}
function token_params(string $token): array {
  return [token_hash($token), $token];
}

/**
 * Validate the bearer token and return the user row, or 401.
 * Pass $roles to also require the user's role be in that list (else 403).
 * Call at the top of every protected endpoint — never trust a role from the client.
 */
function require_auth(mysqli $conn, array $roles = []): array {
  $token = bearer_token();
  if ($token === '') fail('Not authenticated.', 401);

  $stmt = $conn->prepare(
    'SELECT u.id, u.name, u.email, u.role, u.client_id, u.status
     FROM auth_tokens t JOIN users u ON u.id = t.user_id
     WHERE ' . token_where('t.token') . ' AND t.expires_at > NOW() AND u.deleted_at IS NULL LIMIT 1'
  );
  [$th, $traw] = token_params($token);
  $stmt->bind_param('ss', $th, $traw);
  $stmt->execute();
  $user = $stmt->get_result()->fetch_assoc();

  if (!$user) fail('Session expired. Please sign in again.', 401);
  if ($user['status'] !== 'active') fail('Account is not active.', 403);
  if ($roles && !in_array($user['role'], $roles, true)) fail('Not allowed.', 403);

  // Touch the session so the active-sessions list shows real last-seen times.
  // Best-effort: silently skip if the column isn't present on an un-migrated DB.
  if ($s = @$conn->prepare('UPDATE auth_tokens SET last_seen_at = NOW() WHERE ' . token_where())) {
    $s->bind_param('ss', $th, $traw);
    @$s->execute();
  }

  $user['id'] = (int)$user['id'];
  $user['client_id'] = $user['client_id'] !== null ? (int)$user['client_id'] : null;
  return $user;
}

function audit(mysqli $conn, ?int $userId, string $action, string $detail = ''): void {
  $ip = $_SERVER['REMOTE_ADDR'] ?? '';
  $stmt = $conn->prepare('INSERT INTO audit_log (user_id, action, detail, ip) VALUES (?, ?, ?, ?)');
  $stmt->bind_param('isss', $userId, $action, $detail, $ip);
  $stmt->execute();
}
