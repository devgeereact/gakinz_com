<?php
/**
 * Files & Documents (GAkinzOS — Files). Protected.
 * Per-project / per-client file storage. Binary lives on disk under uploads/;
 * the DB row is metadata + an optional expiring public share token.
 *
 *   GET  /files.php                     → list (?project_id / ?client_id)
 *   GET  /files.php?download=N          → stream the file (auth)
 *   GET  /files.php?token=XYZ           → stream via a public share link (no auth, checks expiry)
 *   POST /files.php?action=upload       (multipart: file=<binary>, project_id?, client_id?)
 *   POST /files.php?action=share        {id, days?}   → issue/refresh a public link
 *   POST /files.php?action=delete       {id}
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager', 'editor', 'employee'];
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const UPLOAD_DIR = __DIR__ . '/uploads';

// Upload allowlist. Extension → the MIME types finfo may report for it. An
// upload must satisfy both: a known extension, and a sniffed type that belongs
// to that extension. The browser-supplied Content-Type is never trusted and
// never stored, because it is attacker-controlled and gets replayed verbatim
// on the unauthenticated share link.
const ALLOWED_UPLOADS = [
  'jpg'  => ['image/jpeg'],
  'jpeg' => ['image/jpeg'],
  'png'  => ['image/png'],
  'gif'  => ['image/gif'],
  'webp' => ['image/webp'],
  'bmp'  => ['image/bmp', 'image/x-ms-bmp'],
  'tif'  => ['image/tiff'],
  'tiff' => ['image/tiff'],
  'pdf'  => ['application/pdf'],
  'txt'  => ['text/plain'],
  'csv'  => ['text/plain', 'text/csv', 'application/csv'],
  'rtf'  => ['text/rtf', 'application/rtf', 'text/plain'],
  'doc'  => ['application/msword', 'application/vnd.ms-office', 'application/x-ole-storage'],
  'xls'  => ['application/vnd.ms-excel', 'application/vnd.ms-office', 'application/x-ole-storage'],
  'ppt'  => ['application/vnd.ms-powerpoint', 'application/vnd.ms-office', 'application/x-ole-storage'],
  'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
  'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'],
  'pptx' => ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip'],
  'odt'  => ['application/vnd.oasis.opendocument.text', 'application/zip'],
  'ods'  => ['application/vnd.oasis.opendocument.spreadsheet', 'application/zip'],
  'odp'  => ['application/vnd.oasis.opendocument.presentation', 'application/zip'],
];

// Every MIME any allowed extension may resolve to. A download only ever sends
// a type from this set, so a stored row can never dictate an arbitrary header.
function allowed_mimes(): array {
  static $flat = null;
  if ($flat === null) {
    $flat = [];
    foreach (ALLOWED_UPLOADS as $types) foreach ($types as $t) $flat[$t] = true;
  }
  return $flat;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function ensure_upload_dir(): void {
  if (!is_dir(UPLOAD_DIR)) @mkdir(UPLOAD_DIR, 0755, true);
  // Block direct web access — everything is streamed through this script.
  $ht = UPLOAD_DIR . '/.htaccess';
  if (!file_exists($ht)) @file_put_contents($ht, "Require all denied\nDeny from all\n");
}

// ── Public share-link download (no auth) ─────────────────────────────────────
if ($method === 'GET' && isset($_GET['token'])) {
  $token = preg_replace('/[^a-f0-9]/', '', (string)$_GET['token']);
  if ($token === '') fail('Invalid link.', 404);
  $stmt = $conn->prepare('SELECT name, stored, mime FROM files WHERE share_token = ? AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1');
  $stmt->bind_param('s', $token);
  $stmt->execute();
  $f = $stmt->get_result()->fetch_assoc();
  if (!$f) fail('This link is invalid or has expired.', 404);
  stream_file($f);
}

// ── Authenticated download ───────────────────────────────────────────────────
if ($method === 'GET' && isset($_GET['download'])) {
  require_auth($conn, STAFF);
  $id = (int)$_GET['download'];
  $stmt = $conn->prepare('SELECT name, stored, mime FROM files WHERE id = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $f = $stmt->get_result()->fetch_assoc();
  if (!$f) fail('File not found.', 404);
  stream_file($f);
}

// ── List ─────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
  require_auth($conn, STAFF);
  // Filters are bound, not concatenated. They are integers either way, but the
  // project rule is prepared statements only and this is the pattern to copy.
  $where = 'f.deleted_at IS NULL';
  $types = '';
  $args = [];
  if (isset($_GET['project_id'])) { $where .= ' AND f.project_id = ?'; $types .= 'i'; $args[] = (int)$_GET['project_id']; }
  if (isset($_GET['client_id']))  { $where .= ' AND f.client_id = ?';  $types .= 'i'; $args[] = (int)$_GET['client_id']; }
  $rows = [];
  $sql = "SELECT f.id, f.client_id, f.project_id, f.name, f.mime, f.size, f.share_token, f.expires_at, f.created_at,
                 c.company AS client_company, p.name AS project_name, u.name AS uploaded_by_name
          FROM files f
          LEFT JOIN clients c ON c.id = f.client_id
          LEFT JOIN projects p ON p.id = f.project_id
          LEFT JOIN users u ON u.id = f.uploaded_by
          WHERE $where ORDER BY f.id DESC LIMIT 500";
  $stmt = $conn->prepare($sql);
  if (!$stmt) fail('Could not list files.', 500);
  if ($types !== '') $stmt->bind_param($types, ...$args);
  $stmt->execute();
  if ($res = $stmt->get_result()) {
    while ($r = $res->fetch_assoc()) {
      $r['id'] = (int)$r['id'];
      $r['client_id'] = $r['client_id'] !== null ? (int)$r['client_id'] : null;
      $r['project_id'] = $r['project_id'] !== null ? (int)$r['project_id'] : null;
      $r['size'] = (int)$r['size'];
      $rows[] = $r;
    }
  }
  ok($rows);
}

// ── Upload (multipart) ───────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'upload') {
  $user = require_auth($conn, STAFF);
  if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) fail('No file was uploaded.');
  $file = $_FILES['file'];
  if ($file['size'] > MAX_BYTES) fail('File is too large (20 MB max).', 413);

  $orig = mb_substr(preg_replace('/[\r\n]+/', ' ', (string)$file['name']), 0, 255);
  $ext = strtolower(preg_replace('/[^A-Za-z0-9]/', '', (string)pathinfo($orig, PATHINFO_EXTENSION)));
  if ($ext === '' || !isset(ALLOWED_UPLOADS[$ext])) {
    fail('That file type is not allowed. Images, PDFs and common documents only.', 415);
  }

  // Sniff the real type from the bytes still in the temp file, before anything
  // is moved into the upload directory. An extension on its own proves nothing.
  if (!function_exists('finfo_open')) fail('Uploads are unavailable: the PHP fileinfo extension is missing.', 503);
  $finfo = finfo_open(FILEINFO_MIME_TYPE);
  $mime = $finfo ? (string)finfo_file($finfo, $file['tmp_name']) : '';
  if ($finfo) finfo_close($finfo);
  if ($mime === '' || !in_array($mime, ALLOWED_UPLOADS[$ext], true)) {
    fail('That file type is not allowed, or its contents do not match its extension.', 415);
  }

  ensure_upload_dir();
  $stored = bin2hex(random_bytes(16)) . '.' . $ext;
  $dest = UPLOAD_DIR . '/' . $stored;
  if (!move_uploaded_file($file['tmp_name'], $dest)) fail('Could not store the file.', 500);

  $size = (int)$file['size'];
  $projectId = isset($_POST['project_id']) && $_POST['project_id'] !== '' ? (int)$_POST['project_id'] : null;
  $clientId = isset($_POST['client_id']) && $_POST['client_id'] !== '' ? (int)$_POST['client_id'] : null;
  $uid = $user['id'];

  // Columns: client_id(i) project_id(i) name(s) stored(s) mime(s) size(i) uploaded_by(i)
  $stmt = $conn->prepare('INSERT INTO files (client_id, project_id, name, stored, mime, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
  if (!$stmt) { @unlink($dest); fail('Could not record the file.', 500); }
  $stmt->bind_param('iisssii', $clientId, $projectId, $orig, $stored, $mime, $size, $uid);
  if (!$stmt->execute()) { @unlink($dest); fail('Could not record the file.', 500); }
  $newId = $conn->insert_id; // read before audit(), which inserts its own row
  audit($conn, $uid, 'file_upload', $orig);
  ok(['id' => $newId], 201);
}

if ($method === 'POST' && $action === 'share') {
  $user = require_auth($conn, STAFF);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  $days = max(1, min(90, (int)($in['days'] ?? 7)));
  if ($id <= 0) fail('A file id is required.');
  $token = bin2hex(random_bytes(20));
  $expires = (new DateTime("+$days days"))->format('Y-m-d H:i:s');
  $stmt = $conn->prepare('UPDATE files SET share_token = ?, expires_at = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('ssi', $token, $expires, $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('File not found.', 404);
  audit($conn, $user['id'], 'file_share', "#$id {$days}d");
  ok(['token' => $token, 'expires_at' => $expires]);
}

if ($method === 'POST' && $action === 'delete') {
  $user = require_auth($conn, STAFF);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('A file id is required.');
  $stmt = $conn->prepare('UPDATE files SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  if ($stmt->affected_rows < 1) fail('File not found.', 404);
  audit($conn, $user['id'], 'file_delete', "#$id");
  ok(['ok' => true]);
}

fail('Method not allowed.', 405);

// ── Helper ───────────────────────────────────────────────────────────────────
function stream_file(array $f): void {
  $path = UPLOAD_DIR . '/' . $f['stored'];
  if (!is_file($path)) fail('File is missing on disk.', 404);
  // Override the JSON content-type set in _bootstrap. Only a type on the
  // allowlist is ever echoed back: rows predating the upload allowlist hold
  // whatever the uploader's browser claimed, and the share link serves them
  // to anyone with the token.
  $mime = (string)($f['mime'] ?? '');
  if (!isset(allowed_mimes()[$mime])) $mime = 'application/octet-stream';
  header('Content-Type: ' . $mime);
  header('Content-Disposition: attachment; filename="' . addslashes($f['name']) . '"');
  header('Content-Length: ' . filesize($path));
  header('X-Content-Type-Options: nosniff');
  readfile($path);
  exit;
}
