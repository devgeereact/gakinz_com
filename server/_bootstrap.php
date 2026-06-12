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

function fail(string $message, int $code = 400): void {
  http_response_code($code);
  echo json_encode(['error' => $message]);
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
     WHERE t.token = ? AND t.expires_at > NOW() AND u.deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('s', $token);
  $stmt->execute();
  $user = $stmt->get_result()->fetch_assoc();

  if (!$user) fail('Session expired. Please sign in again.', 401);
  if ($user['status'] !== 'active') fail('Account is not active.', 403);
  if ($roles && !in_array($user['role'], $roles, true)) fail('Not allowed.', 403);

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
