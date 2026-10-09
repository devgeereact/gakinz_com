<?php
/**
 * Figma connector (GAkinzOS — Design). Protected.
 * Resolves a Figma file URL to its name, last-modified time and thumbnail.
 * Needs $FIGMA_TOKEN (a Figma personal access token) in config.php.
 *
 *   GET /figma.php?url=<figma_url>   → { key, name, last_modified, thumbnail, version }
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager', 'editor'];
if ($_SERVER['REQUEST_METHOD'] !== 'GET') fail('Method not allowed.', 405);
require_auth($conn, STAFF);

$token = $GLOBALS['FIGMA_TOKEN'] ?? '';
if ($token === '') fail('Figma is not configured on the server.', 503);
if (!function_exists('curl_init')) fail('The Figma connector needs the PHP cURL extension.', 503);

$url = trim($_GET['url'] ?? '');
if (!preg_match('#figma\.com/(?:file|design|proto)/([\w-]+)#i', $url, $m)) {
  fail('That is not a Figma file URL.');
}
$key = $m[1];

$ch = curl_init("https://api.figma.com/v1/files/$key?depth=1");
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => ['X-Figma-Token: ' . $token],
  CURLOPT_TIMEOUT => 12,
]);
$body = curl_exec($ch);
$code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($code === 403) {
  error_log('GAkinz Figma: token rejected (403) — check $FIGMA_TOKEN and the token\'s access to this file.');
  fail('Figma rejected this request.', 403);
}
if ($code === 404) fail('Figma file not found.', 404);
if ($code >= 400) fail('Could not reach Figma.', 502);

$data = json_decode((string)$body, true);
if (!is_array($data)) fail('Unexpected Figma response.', 502);

ok([
  'key'           => $key,
  'name'          => $data['name'] ?? 'Untitled',
  'last_modified' => $data['lastModified'] ?? null,
  'thumbnail'     => $data['thumbnailUrl'] ?? null,
  'version'       => $data['version'] ?? null,
]);
