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
 *   POST /files.php?action=client_share {id, visible} → show or hide it in the client's portal (SQL 18)
 *   POST /files.php?action=delete       {id}
 *
 * Client (role `client` only, SQL 18):
 *   GET  /files.php?action=mine                 → the client's shared files
 *   GET  /files.php?action=mine_download&id=N   → stream one of them
 *
 * Client isolation: the client comes from the token and nothing else. A file
 * reaches a client only when staff made it visible, it is not deleted, and it
 * belongs to that client: attached to one of their live projects (and, if it
 * also names a client, naming the same one), or attached to them directly with
 * no project. Anything else, including another client's file, answers 404
 * exactly as a missing one does. A client never sees the stored file name, the
 * share token, the uploader or the client id.
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

const CLIENT_SHARE_MIGRATION = 'Sharing files to the portal needs the 2026-10-19 database update (SQL 18) first.';

// The files a client may see: visible, live, and theirs (see the header). Bind
// the client id three times. `p` is the file's project, when it has one.
const CLIENT_FILE_FROM = ' FROM files f
  LEFT JOIN projects p ON p.id = f.project_id
  WHERE f.client_visible = 1 AND f.deleted_at IS NULL AND (
    (f.project_id IS NULL AND f.client_id = ?)
    OR (f.project_id IS NOT NULL AND p.deleted_at IS NULL AND p.client_id = ? AND (f.client_id IS NULL OR f.client_id = ?))
  )';

/**
 * True once SQL 18 has run: files.client_visible and files.shared_at exist.
 * Cached for the request. Until then the client routes and client_share answer
 * 503 and the staff list reports client_visible as null.
 */
function fl_client_share_ready(mysqli $conn): bool {
  static $ready = null;
  if ($ready !== null) return $ready;
  try {
    // LIMIT 0 reads no rows; it only proves both columns are there.
    $ready = $conn->query('SELECT client_visible, shared_at FROM files LIMIT 0') !== false;
  } catch (mysqli_sql_exception $e) {
    if ($e->getCode() !== 1054) throw $e; // ER_BAD_FIELD_ERROR only
    $ready = false;
  }
  return $ready;
}

/**
 * True once SQL 17 has added projects.kind. Probed here, as portal.php does,
 * so the client routes depend on nothing but _bootstrap.php.
 */
function fl_kind_ready(mysqli $conn): bool {
  try {
    // LIMIT 0 reads no rows; it only proves the column is there.
    return $conn->query('SELECT kind FROM projects LIMIT 0') !== false;
  } catch (mysqli_sql_exception $e) {
    if ($e->getCode() !== 1054) throw $e; // ER_BAD_FIELD_ERROR only
    return false;
  }
}

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

// ── Client branch (SQL 18) ───────────────────────────────────────────────────
// Only these two routes accept a client, and they accept nobody else. Both
// always end the request, so a client never reaches the staff code below, and
// every staff route below refuses a client with 403.
if ($method === 'GET' && ($action === 'mine' || $action === 'mine_download')) {
  $user = require_auth($conn, ['client']);
  $clientId = (int)($user['client_id'] ?? 0);
  if ($clientId <= 0) fail('Your account is not linked to a client.', 403);
  $c = $conn->prepare('SELECT id FROM clients WHERE id = ? AND deleted_at IS NULL LIMIT 1');
  $c->bind_param('i', $clientId);
  $c->execute();
  if (!$c->get_result()->fetch_assoc()) fail('Client not found.', 404);
  if (!fl_client_share_ready($conn)) fail(CLIENT_SHARE_MIGRATION, 503);

  if ($action === 'mine') {
    // The standing IT support project (SQL 17) is named to a client as the
    // portal names it, whatever staff have called it internally.
    $kindCol = fl_kind_ready($conn) ? 'p.kind' : 'NULL';
    $stmt = $conn->prepare("SELECT f.id, f.name, f.mime, f.size, f.shared_at, p.name AS project_name, $kindCol AS project_kind" . CLIENT_FILE_FROM .
      ' ORDER BY f.shared_at DESC, f.id DESC LIMIT 500');
    $stmt->bind_param('iii', $clientId, $clientId, $clientId);
    $stmt->execute();
    ok(array_map('fl_client_shape', $stmt->get_result()->fetch_all(MYSQLI_ASSOC)));
  }

  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) fail('File not found.', 404);
  $stmt = $conn->prepare('SELECT f.name, f.`stored`, f.mime' . CLIENT_FILE_FROM . ' AND f.id = ? LIMIT 1');
  $stmt->bind_param('iiii', $clientId, $clientId, $clientId, $id);
  $stmt->execute();
  $f = $stmt->get_result()->fetch_assoc();
  if (!$f) fail('File not found.', 404); // another client's file answers as a missing one
  stream_file($f);
}

// ── Public share-link download (no auth) ─────────────────────────────────────
if ($method === 'GET' && isset($_GET['token'])) {
  $token = preg_replace('/[^a-f0-9]/', '', (string)$_GET['token']);
  if ($token === '') fail('Invalid link.', 404);
  $stmt = $conn->prepare('SELECT name, `stored`, mime, expires_at FROM files WHERE share_token = ? AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1');
  $stmt->bind_param('s', $token);
  $stmt->execute();
  $f = $stmt->get_result()->fetch_assoc();
  if (!$f) fail('This link is invalid or has expired.', 404);
  // A link that never expires is what every public Work image and hero shot
  // uses, so a browser may keep it for a day. A link with an expiry stays
  // uncached, so it stops working the moment it lapses.
  stream_file($f, $f['expires_at'] === null ? 'public, max-age=86400' : 'private, no-store');
}

// ── Authenticated download ───────────────────────────────────────────────────
if ($method === 'GET' && isset($_GET['download'])) {
  require_auth($conn, STAFF);
  $id = (int)$_GET['download'];
  $stmt = $conn->prepare('SELECT name, `stored`, mime FROM files WHERE id = ? AND deleted_at IS NULL LIMIT 1');
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
  // Before SQL 18 the sharing columns are absent: report them as null, so the
  // Files screen knows to hide the "Visible to client" switch.
  $shareCols = fl_client_share_ready($conn) ? 'f.client_visible, f.shared_at' : 'NULL AS client_visible, NULL AS shared_at';
  $sql = "SELECT f.id, f.client_id, f.project_id, f.name, f.mime, f.size, f.share_token, f.expires_at, f.created_at,
                 $shareCols, c.company AS client_company, p.name AS project_name, u.name AS uploaded_by_name
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
      $r['client_visible'] = $r['client_visible'] !== null ? (int)$r['client_visible'] === 1 : null;
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
  $stmt = $conn->prepare('INSERT INTO files (client_id, project_id, name, `stored`, mime, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
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

// Show or hide a file in its client's portal. Only a file that resolves to one
// client can be shown: attached to a live project of a client (and naming no
// other client), or attached to a client directly. Hiding always works.
if ($method === 'POST' && $action === 'client_share') {
  $user = require_auth($conn, STAFF);
  if (!fl_client_share_ready($conn)) fail(CLIENT_SHARE_MIGRATION, 503);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  if ($id <= 0) fail('A file id is required.');
  $raw = $in['visible'] ?? null;
  if (!is_bool($raw) && $raw !== 0 && $raw !== 1) fail('Say whether the file is visible to the client (true or false).');
  $visible = $raw ? 1 : 0;

  $stmt = $conn->prepare('SELECT f.id, f.client_id, f.project_id, f.client_visible, p.client_id AS project_client_id, p.deleted_at AS project_deleted_at
    FROM files f LEFT JOIN projects p ON p.id = f.project_id WHERE f.id = ? AND f.deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $f = $stmt->get_result()->fetch_assoc();
  if (!$f) fail('File not found.', 404);

  if ($visible === 1) {
    if ($f['project_id'] !== null) {
      if ($f['project_deleted_at'] !== null) fail('This file’s project was removed, so there is nobody to share it with.', 409);
      $owner = $f['project_client_id'] !== null ? (int)$f['project_client_id'] : 0;
      if ($owner <= 0) fail('This file’s project has no client, so there is nobody to share it with.', 409);
      if ($f['client_id'] !== null && (int)$f['client_id'] !== $owner) {
        fail('This file names a different client from its project. Fix that before sharing it.', 409);
      }
    } elseif ($f['client_id'] === null) {
      fail('Attach this file to a project or a client before sharing it.', 409);
    }
  }

  // shared_at is assigned before client_visible on purpose: MySQL applies the
  // assignments left to right, so the CASE still reads the old visibility. A
  // file that is already visible keeps its original shared_at.
  $stmt = $conn->prepare('UPDATE files SET
      shared_at = CASE WHEN ? = 1 THEN IF(client_visible = 1 AND shared_at IS NOT NULL, shared_at, NOW()) ELSE NULL END,
      client_visible = ?
    WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('iii', $visible, $visible, $id);
  $stmt->execute();
  // Audit what the write actually changed: no row changes when the file was
  // already in that state (or a concurrent request got there first).
  if ($stmt->affected_rows > 0) {
    audit($conn, $user['id'], 'file_client_share', "#$id " . ($visible ? 'visible to client' : 'hidden from client'));
  }
  $stmt = $conn->prepare('SELECT client_visible, shared_at FROM files WHERE id = ? LIMIT 1');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $now = $stmt->get_result()->fetch_assoc();
  ok(['id' => $id, 'client_visible' => (int)$now['client_visible'] === 1, 'shared_at' => $now['shared_at']]);
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

// ── Helpers ──────────────────────────────────────────────────────────────────

/** The fields a client may read about one of their shared files. */
function fl_client_shape(array $r): array {
  $mime = (string)($r['mime'] ?? '');
  return [
    'id' => (int)$r['id'],
    'name' => (string)$r['name'],
    // The type the download is sent as (see stream_file).
    'mime' => isset(allowed_mimes()[$mime]) ? $mime : 'application/octet-stream',
    'size' => (int)$r['size'],
    'shared_at' => $r['shared_at'],
    'project_name' => ($r['project_kind'] ?? null) === 'it_support' ? 'IT support' : ($r['project_name'] ?? null),
  ];
}

/**
 * The on-disk path for a stored name, or null. The stored name comes from the
 * database, so it is never trusted: it must be one plain file name (no
 * separator and no leading dot, so never `..` or `.htaccess`), and the
 * resolved path must sit directly inside the upload directory, which also
 * rules out a symlink pointing elsewhere.
 */
function stored_path(string $stored): ?string {
  // \z, not $: a `$` would also match before a trailing newline.
  if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{0,254}\z/', $stored)) return null;
  $dir = realpath(UPLOAD_DIR);
  $real = realpath(UPLOAD_DIR . '/' . $stored);
  if ($dir === false || $real === false || dirname($real) !== $dir || !is_file($real)) return null;
  return $real;
}

/**
 * The Content-Disposition value for a download (RFC 6266). Control characters
 * are dropped so the name can never break the header (upload strips line
 * breaks; older rows may not have). `filename` is an ASCII-only fallback, with
 * any other byte, quote or backslash replaced by `_`; `filename*` carries the
 * real UTF-8 name, percent-encoded.
 */
function attachment_disposition(string $name): string {
  $name = (string)preg_replace('/[\x00-\x1F\x7F]+/', '', $name);
  // One `_` per character when the name is valid UTF-8, else one per byte.
  $ascii = preg_replace('/[^\x20-\x7E]|["\\\\]/u', '_', $name) ?? (string)preg_replace('/[^\x20-\x7E]|["\\\\]/', '_', $name);
  return 'attachment; filename="' . $ascii . '"; filename*=UTF-8\'\'' . rawurlencode($name);
}

/**
 * Stream a stored file and end the request. Every route sends the same
 * download headers; only the caching differs (see the share-link route).
 */
function stream_file(array $f, string $cacheControl = 'private, no-store'): void {
  $path = stored_path((string)($f['stored'] ?? ''));
  if ($path === null) fail('File is missing on disk.', 404);
  // Override the JSON content-type set in _bootstrap. Only a type on the
  // allowlist is ever echoed back: rows predating the upload allowlist hold
  // whatever the uploader's browser claimed, and the share link serves them
  // to anyone with the token.
  $mime = (string)($f['mime'] ?? '');
  if (!isset(allowed_mimes()[$mime])) $mime = 'application/octet-stream';
  header('Content-Type: ' . $mime);
  header('Content-Disposition: ' . attachment_disposition((string)$f['name']));
  header('Content-Length: ' . filesize($path));
  header('X-Content-Type-Options: nosniff');
  header('Cache-Control: ' . $cacheControl);
  readfile($path);
  exit;
}
