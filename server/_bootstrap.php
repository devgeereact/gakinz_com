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
