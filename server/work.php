<?php
/**
 * Work / portfolio (GAkinzOS — Work module → public site).
 * Case studies, products, experiments and writing, with an ordered image set.
 *
 * PUBLIC (no auth) — published rows only:
 *   GET  /work.php?action=list[&kind=case_study]  → published records, newest/ordered
 *   GET  /work.php?action=get&slug=foo            → one published record + its images
 *
 * STAFF (require_auth EDITORS):
 *   GET  /work.php?action=listAll                 → every record incl. drafts, consent visible
 *   GET  /work.php?action=getAdmin&id=N           → one record in full, any status, + images
 *                 (or &slug=foo)
 *   POST /work.php?action=create      {title, slug?, kind?, client_name?, client_consent?, ...}
 *   POST /work.php?action=update      {id, ...}
 *   POST /work.php?action=publish     {id, status?}          -- draft | published
 *   POST /work.php?action=remove      {id}
 *   POST /work.php?action=reorder     {ids: [3, 1, 2]}
 *   POST /work.php?action=addImage    {work_id, file_id, alt, caption?, sort_order?}
 *        — also gives the file a non-expiring public share token if it has none,
 *          so attaching an image is one step and cannot leave a broken picture.
 *   POST /work.php?action=removeImage {id}  -- a work_images row id
 *
 * Consent rule: a record that names a client cannot be published unless
 * client_consent is set. A forgotten permission must fail closed — a refused
 * publish, never a named client on a public page.
 */
require __DIR__ . '/_bootstrap.php';

const EDITORS = ['super_admin', 'admin', 'manager', 'editor'];
const KINDS = ['case_study', 'product', 'experiment', 'writing'];
const STATUSES = ['draft', 'published'];

function slugify(string $s): string {
  $s = strtolower(trim($s));
  // ASCII only: anything else collapses to a hyphen.
  $s = preg_replace('/[^a-z0-9]+/', '-', $s);
  return trim($s, '-');
}

/** True when another (non-$ignoreId) record already holds this slug. */
function slug_taken(mysqli $conn, string $slug, int $ignoreId = 0): bool {
  $stmt = $conn->prepare('SELECT id FROM work WHERE slug = ? AND id <> ? LIMIT 1');
  $stmt->bind_param('si', $slug, $ignoreId);
  $stmt->execute();
  return (bool)$stmt->get_result()->fetch_assoc();
}

/** A nullable positive int from the request body. */
function nullable_id(array $src, string $key): ?int {
  if (!isset($src[$key]) || $src[$key] === '' || $src[$key] === null) return null;
  $v = (int)$src[$key];
  return $v > 0 ? $v : null;
}

/** A nullable YYYY-MM-DD date from the request body. */
function nullable_date(array $src, string $key): ?string {
  $v = str_field($src, $key, 10);
  if ($v === '') return null;
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) fail("$key must be a date in YYYY-MM-DD form.");
  return $v;
}

/** A nullable http(s) URL. Anything else is refused rather than rendered. */
function nullable_url(array $src, string $key): ?string {
  $v = str_field($src, $key, 500);
  if ($v === '') return null;
  if (!preg_match('~^https?://~i', $v)) fail("$key must start with http:// or https://.");
  return $v;
}

/** Cast the numeric columns of a work row. */
function shape_work(array $r): array {
  $r['id'] = (int)$r['id'];
  $r['client_consent'] = (int)$r['client_consent'];
  $r['featured'] = (int)$r['featured'];
  $r['sort_order'] = (int)$r['sort_order'];
  $r['post_id'] = $r['post_id'] !== null ? (int)$r['post_id'] : null;
  $r['cover_file_id'] = $r['cover_file_id'] !== null ? (int)$r['cover_file_id'] : null;
  return $r;
}

/**
 * Fold the joined cover columns into one `cover` object and drop them.
 * `share_token` is the public handle: files.php?token=... streams the binary.
 */
function fold_cover(array $r): array {
  $cover = null;
  if ($r['cover_file_id'] !== null && $r['cover_file_id'] !== 0) {
    $cover = [
      'file_id' => (int)$r['cover_file_id'],
      'alt' => (string)($r['cover_alt'] ?? ''),
      'caption' => $r['cover_caption'] !== null ? (string)$r['cover_caption'] : null,
      'share_token' => $r['cover_token'] !== null ? (string)$r['cover_token'] : null,
      'mime' => $r['cover_mime'] !== null ? (string)$r['cover_mime'] : null,
    ];
  }
  unset($r['cover_alt'], $r['cover_caption'], $r['cover_token'], $r['cover_mime']);
  $r['cover'] = $cover;
  return $r;
}

/**
 * Strip everything a public reader must not see. The client name is OMITTED
 * (key absent, not blank) unless consent was recorded.
 */
function public_view(array $r): array {
  if ((int)$r['client_consent'] !== 1 || trim((string)$r['client_name']) === '') {
    unset($r['client_name']);
  }
  unset($r['client_consent']);
  return $r;
}

/** The ordered image set for one record. */
function work_images(mysqli $conn, int $workId): array {
  $stmt = $conn->prepare(
    'SELECT wi.id, wi.file_id, wi.caption, wi.alt, wi.sort_order, f.share_token, f.mime
     FROM work_images wi
     LEFT JOIN files f ON f.id = wi.file_id AND f.deleted_at IS NULL
     WHERE wi.work_id = ?
     ORDER BY wi.sort_order ASC, wi.id ASC'
  );
  $stmt->bind_param('i', $workId);
  $stmt->execute();
  $res = $stmt->get_result();
  $out = [];
  while ($r = $res->fetch_assoc()) {
    $r['id'] = (int)$r['id'];
    $r['file_id'] = (int)$r['file_id'];
    $r['sort_order'] = (int)$r['sort_order'];
    $out[] = $r;
  }
  return $out;
}

/** A fresh 40-hex share token that no file row already holds. */
function unused_share_token(mysqli $conn): string {
  // Deliberately NOT filtered by deleted_at: a soft-deleted row still occupies
  // the value, and the UNIQUE index below counts it.
  $chk = $conn->prepare('SELECT id FROM files WHERE share_token = ? LIMIT 1');
  for ($i = 0; $i < 5; $i++) {
    // Same construction as the `share` action in files.php: 40 hex characters,
    // which is exactly the width of files.share_token CHAR(40).
    $token = bin2hex(random_bytes(20));
    $chk->bind_param('s', $token);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) return $token;
  }
  fail('Could not issue a unique public link. Please try again.', 500);
}

/**
 * Give a file a public share handle that will not rot, and return
 * [share_token, token_issued, expiry_cleared].
 *
 * An image on a published work record has to stay reachable. The public lookup
 * in files.php serves a file only while `expires_at IS NULL OR expires_at >
 * NOW()`, so a link issued from the Files module with its default 7-day window
 * would 404 the portfolio page a week after launch. Attaching an image here is
 * a deliberate act of publication by an editor, so it issues a token when there
 * is none and lifts any expiry.
 *
 * An existing token is never rotated: links already handed to a client keep
 * working. Only the expiry is lifted.
 *
 * files.share_token has no UNIQUE constraint on an un-migrated database (unlike
 * proposals.share_token), and the public lookup uses LIMIT 1, so a duplicate
 * would silently serve the wrong file. Two guards: the token is checked unused
 * before the write, the write only lands while the row still has none, and
 * schema.sql adds the UNIQUE index so a race fails loudly rather than quietly.
 *
 * Authenticated callers only. A GET must never reach this.
 */
function ensure_public_share(mysqli $conn, int $fileId, int $uid): array {
  $stmt = $conn->prepare('SELECT share_token, expires_at FROM files WHERE id = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('i', $fileId);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  if (!$row) fail('File not found.', 404);

  $token = trim((string)($row['share_token'] ?? ''));
  $needClear = $row['expires_at'] !== null;
  $issued = false;
  $cleared = false;

  if ($token === '') {
    $token = unused_share_token($conn);
    $upd = $conn->prepare(
      'UPDATE files SET share_token = ?, expires_at = NULL
       WHERE id = ? AND deleted_at IS NULL AND (share_token IS NULL OR share_token = "")'
    );
    $upd->bind_param('si', $token, $fileId);
    // Under PHP 8.1+ mysqli throws on a duplicate key; under the older mode it
    // returns false. Fail loudly either way — a half-issued token must never
    // pass for a working link.
    $wrote = false;
    try {
      $wrote = $upd->execute();
    } catch (Throwable $e) {
      fail('Could not issue a public link for that file.', 500);
    }
    if (!$wrote) fail('Could not issue a public link for that file.', 500);

    if ($upd->affected_rows > 0) {
      $issued = true;
      $cleared = $needClear;   // the same statement lifted it
      $needClear = false;
      audit($conn, $uid, 'file_share_permanent', "#$fileId issued for a work image");
      if ($cleared) audit($conn, $uid, 'file_share_expiry_cleared', "#$fileId attached to a work image");
    } else {
      // Another request issued one between the read and the write. Take theirs
      // rather than overwriting a link that may already be in circulation.
      $re = $conn->prepare('SELECT share_token FROM files WHERE id = ? AND deleted_at IS NULL LIMIT 1');
      $re->bind_param('i', $fileId);
      $re->execute();
      $now = $re->get_result()->fetch_assoc();
      $token = trim((string)($now['share_token'] ?? ''));
      if ($token === '') fail('Could not issue a public link for that file.', 500);
    }
  }

  if ($needClear) {
    $clr = $conn->prepare('UPDATE files SET expires_at = NULL WHERE id = ? AND deleted_at IS NULL');
    $clr->bind_param('i', $fileId);
    if (!$clr->execute()) fail('Could not make that file link permanent.', 500);
    $cleared = true;
    audit($conn, $uid, 'file_share_expiry_cleared', "#$fileId attached to a work image");
  }

  return [$token, $issued, $cleared];
}

/** Read and validate the writable fields shared by create and update. */
function read_fields(array $in): array {
  $f = [];
  $f['title'] = str_field($in, 'title', 200);
  if ($f['title'] === '') fail('A title is required.');

  $f['kind'] = str_field($in, 'kind', 20) ?: 'case_study';
  if (!in_array($f['kind'], KINDS, true)) fail('Invalid kind. Use one of: ' . implode(', ', KINDS) . '.');

  $f['status'] = str_field($in, 'status', 10) ?: 'draft';
  if (!in_array($f['status'], STATUSES, true)) fail('Invalid status. Use one of: ' . implode(', ', STATUSES) . '.');

  $f['client_name'] = str_field($in, 'client_name', 160);
  $f['client_consent'] = !empty($in['client_consent']) ? 1 : 0;
  $f['sector'] = str_field($in, 'sector', 80);
  $f['summary'] = str_field($in, 'summary', 400);
  $f['problem'] = str_field($in, 'problem', 60000);
  $f['built'] = str_field($in, 'built', 60000);
  $f['outcome'] = str_field($in, 'outcome', 60000);
  $f['live_url'] = nullable_url($in, 'live_url');
  $f['repo_url'] = nullable_url($in, 'repo_url');
  $f['post_id'] = nullable_id($in, 'post_id');
  $f['started_on'] = nullable_date($in, 'started_on');
  $f['completed_on'] = nullable_date($in, 'completed_on');
  $f['cover_file_id'] = nullable_id($in, 'cover_file_id');
  $f['featured'] = !empty($in['featured']) ? 1 : 0;
  $f['sort_order'] = (int)($in['sort_order'] ?? 0);

  // Fail closed: a named client may not go public without recorded consent.
  if ($f['status'] === 'published' && $f['client_name'] !== '' && $f['client_consent'] !== 1) {
    fail('This record names a client, so it cannot be published until client consent is recorded.', 409);
  }
  return $f;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Selected once so the public and staff branches cannot drift apart.
const WORK_COLUMNS =
  'w.id, w.slug, w.kind, w.title, w.client_name, w.client_consent, w.sector, w.summary,
   w.live_url, w.repo_url, w.post_id, w.started_on, w.completed_on, w.cover_file_id,
   w.featured, w.sort_order, w.status, w.created_at, w.updated_at';

const COVER_JOIN =
  'LEFT JOIN work_images ci ON ci.work_id = w.id AND ci.file_id = w.cover_file_id
   LEFT JOIN files f ON f.id = w.cover_file_id AND f.deleted_at IS NULL';

const COVER_COLUMNS =
  'ci.alt AS cover_alt, ci.caption AS cover_caption, f.share_token AS cover_token, f.mime AS cover_mime';

// ── Public: published list ───────────────────────────────────────────────────
if ($method === 'GET' && ($action === 'list' || $action === '')) {
  $kind = str_field($_GET, 'kind', 20);
  if ($kind !== '' && !in_array($kind, KINDS, true)) fail('Invalid kind.');

  $sql = 'SELECT ' . WORK_COLUMNS . ', ' . COVER_COLUMNS . '
          FROM work w ' . COVER_JOIN . '
          WHERE w.status = ?';
  if ($kind !== '') $sql .= ' AND w.kind = ?';
  $sql .= ' ORDER BY w.featured DESC, w.sort_order ASC, w.id DESC LIMIT 200';

  $published = 'published';
  $stmt = $conn->prepare($sql);
  if ($kind !== '') {
    $stmt->bind_param('ss', $published, $kind);
  } else {
    $stmt->bind_param('s', $published);
  }
  $stmt->execute();
  $res = $stmt->get_result();
  $rows = [];
  while ($r = $res->fetch_assoc()) {
    $rows[] = public_view(fold_cover(shape_work($r)));
  }
  ok($rows);
}

// ── Public: one published record by slug ─────────────────────────────────────
// The status filter is a hard-coded literal with no conditional around it. Keep
// it that way: staff read through getAdmin, never by relaxing this.
if ($method === 'GET' && $action === 'get') {
  $slug = str_field($_GET, 'slug', 160);
  if ($slug === '') fail('A slug is required.');
  $stmt = $conn->prepare(
    'SELECT ' . WORK_COLUMNS . ', w.problem, w.built, w.outcome, ' . COVER_COLUMNS . '
     FROM work w ' . COVER_JOIN . '
     WHERE w.slug = ? AND w.status = "published" LIMIT 1'
  );
  $stmt->bind_param('s', $slug);
  $stmt->execute();
  $r = $stmt->get_result()->fetch_assoc();
  if (!$r) fail('Work not found.', 404);
  $r = public_view(fold_cover(shape_work($r)));
  $r['images'] = work_images($conn, $r['id']);
  ok($r);
}

// ── Staff: everything, drafts included, consent visible ──────────────────────
if ($method === 'GET' && $action === 'listAll') {
  require_auth($conn, EDITORS);
  // The narrative columns are included so the CMS can round-trip a record it
  // has listed. EDITORS-gated, so there is no disclosure question; the cost is
  // payload size, and the edit form should prefer getAdmin for a single record.
  $res = $conn->query(
    'SELECT ' . WORK_COLUMNS . ', w.problem, w.built, w.outcome, ' . COVER_COLUMNS . '
     FROM work w ' . COVER_JOIN . '
     ORDER BY w.featured DESC, w.sort_order ASC, w.id DESC LIMIT 500'
  );
  $rows = [];
  while ($r = $res->fetch_assoc()) {
    $rows[] = fold_cover(shape_work($r));
  }
  ok($rows);
}

// ── Staff: one record in full, whatever its status ───────────────────────────
// Deliberately a separate action rather than an authenticated mode of the
// public `get`. The public branch stays a single hard-coded status literal with
// no conditional in it, so it can be audited at a glance; that is the branch
// that leaks a client name if it is ever wrong, and it must not acquire a
// reason to think. require_auth() also exits on a missing token, so `get` could
// not soft-authenticate without a second code path inside the public branch.
if ($method === 'GET' && $action === 'getAdmin') {
  require_auth($conn, EDITORS);
  $id = (int)($_GET['id'] ?? 0);
  $slug = str_field($_GET, 'slug', 160);
  if ($id <= 0 && $slug === '') fail('A work id or slug is required.');

  // The ternary picks a column name, never a value. Both are bound.
  $stmt = $conn->prepare(
    'SELECT ' . WORK_COLUMNS . ', w.problem, w.built, w.outcome, ' . COVER_COLUMNS . '
     FROM work w ' . COVER_JOIN . '
     WHERE ' . ($id > 0 ? 'w.id = ?' : 'w.slug = ?') . ' LIMIT 1'
  );
  if ($id > 0) {
    $stmt->bind_param('i', $id);
  } else {
    $stmt->bind_param('s', $slug);
  }
  $stmt->execute();
  $r = $stmt->get_result()->fetch_assoc();
  if (!$r) fail('Work not found.', 404);
  // No public_view(): staff need to see client_name and the consent state in
  // order to decide whether the record can be published at all.
  $r = fold_cover(shape_work($r));
  $r['images'] = work_images($conn, $r['id']);
  ok($r);
}

// ── Staff: create / update ───────────────────────────────────────────────────
if ($method === 'POST' && ($action === 'create' || $action === 'update')) {
  $user = require_auth($conn, EDITORS);
  $in = body();
  $f = read_fields($in);
  $uid = $user['id'];

  $slugIn = str_field($in, 'slug', 160);
  $slug = slugify($slugIn !== '' ? $slugIn : $f['title']);
  if ($slug === '') fail('Could not build a slug from that title. Please supply a slug.');
  $slug = mb_substr($slug, 0, 160);

  if ($action === 'create') {
    if (slug_taken($conn, $slug)) fail("The slug \"$slug\" is already in use. Please choose another.", 409);
    $stmt = $conn->prepare(
      'INSERT INTO work
         (slug, kind, title, client_name, client_consent, sector, summary, problem, built, outcome,
          live_url, repo_url, post_id, started_on, completed_on, cover_file_id, featured, sort_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->bind_param(
      'ssssisssssssissiiis',
      $slug, $f['kind'], $f['title'], $f['client_name'], $f['client_consent'], $f['sector'], $f['summary'],
      $f['problem'], $f['built'], $f['outcome'], $f['live_url'], $f['repo_url'], $f['post_id'],
      $f['started_on'], $f['completed_on'], $f['cover_file_id'], $f['featured'], $f['sort_order'], $f['status']
    );
    if (!$stmt->execute()) fail('Could not create the work record.', 500);
    $newId = $conn->insert_id;
    audit($conn, $uid, 'work_create', "#$newId $slug");
    ok(['id' => $newId, 'slug' => $slug], 201);
  }

  $id = (int)($in['id'] ?? 0);
  if ($id <= 0) fail('A work id is required.');
  if (slug_taken($conn, $slug, $id)) fail("The slug \"$slug\" is already in use. Please choose another.", 409);
  $stmt = $conn->prepare(
    'UPDATE work SET
       slug = ?, kind = ?, title = ?, client_name = ?, client_consent = ?, sector = ?, summary = ?,
       problem = ?, built = ?, outcome = ?, live_url = ?, repo_url = ?, post_id = ?,
       started_on = ?, completed_on = ?, cover_file_id = ?, featured = ?, sort_order = ?, status = ?
     WHERE id = ?'
  );
  $stmt->bind_param(
    'ssssisssssssissiiisi',
    $slug, $f['kind'], $f['title'], $f['client_name'], $f['client_consent'], $f['sector'], $f['summary'],
    $f['problem'], $f['built'], $f['outcome'], $f['live_url'], $f['repo_url'], $f['post_id'],
    $f['started_on'], $f['completed_on'], $f['cover_file_id'], $f['featured'], $f['sort_order'], $f['status'],
    $id
  );
  if (!$stmt->execute()) fail('Could not update the work record.', 500);
  if ($stmt->affected_rows < 1) {
    $chk = $conn->prepare('SELECT id FROM work WHERE id = ? LIMIT 1');
    $chk->bind_param('i', $id);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) fail('Work not found.', 404);
  }
  audit($conn, $uid, 'work_update', "#$id");
  ok(['ok' => true, 'slug' => $slug]);
}

// ── Staff: publish / unpublish ───────────────────────────────────────────────
// The consent gate lives here. It reads the stored row, never the request.
if ($method === 'POST' && $action === 'publish') {
  $user = require_auth($conn, EDITORS);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  if ($id <= 0) fail('A work id is required.');
  $status = str_field($in, 'status', 10) ?: 'published';
  if (!in_array($status, STATUSES, true)) fail('Invalid status. Use one of: ' . implode(', ', STATUSES) . '.');

  $chk = $conn->prepare('SELECT client_name, client_consent FROM work WHERE id = ? LIMIT 1');
  $chk->bind_param('i', $id);
  $chk->execute();
  $row = $chk->get_result()->fetch_assoc();
  if (!$row) fail('Work not found.', 404);

  if ($status === 'published' && trim((string)$row['client_name']) !== '' && (int)$row['client_consent'] !== 1) {
    audit($conn, $user['id'], 'work_publish_refused', "#$id no client consent");
    fail('This record names a client, so it cannot be published until client consent is recorded.', 409);
  }

  $stmt = $conn->prepare('UPDATE work SET status = ? WHERE id = ?');
  $stmt->bind_param('si', $status, $id);
  if (!$stmt->execute()) fail('Could not change the status.', 500);
  audit($conn, $user['id'], 'work_publish', "#$id -> $status");
  ok(['ok' => true, 'status' => $status]);
}

// ── Staff: remove ────────────────────────────────────────────────────────────
// A hard delete: the table carries no deleted_at, and work_images cascades.
if ($method === 'POST' && $action === 'remove') {
  $user = require_auth($conn, EDITORS);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('A work id is required.');
  $stmt = $conn->prepare('DELETE FROM work WHERE id = ?');
  $stmt->bind_param('i', $id);
  if (!$stmt->execute()) fail('Could not remove the work record.', 500);
  if ($stmt->affected_rows < 1) fail('Work not found.', 404);
  audit($conn, $user['id'], 'work_remove', "#$id");
  ok(['ok' => true]);
}

// ── Staff: reorder ───────────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'reorder') {
  $user = require_auth($conn, EDITORS);
  $in = body();
  $ids = $in['ids'] ?? null;
  if (!is_array($ids) || !$ids) fail('An ordered list of ids is required.');
  if (count($ids) > 500) fail('Too many ids in one reorder.');

  $stmt = $conn->prepare('UPDATE work SET sort_order = ? WHERE id = ?');
  $n = 0;
  foreach ($ids as $i => $raw) {
    $id = (int)$raw;
    if ($id <= 0) fail('Every id in the list must be a positive integer.');
    $order = (int)$i;
    $stmt->bind_param('ii', $order, $id);
    if (!$stmt->execute()) fail('Could not save the new order.', 500);
    $n++;
  }
  audit($conn, $user['id'], 'work_reorder', "$n records");
  ok(['ok' => true, 'count' => $n]);
}

// ── Staff: link an uploaded file as an image ─────────────────────────────────
if ($method === 'POST' && $action === 'addImage') {
  $user = require_auth($conn, EDITORS);
  $in = body();
  $workId = (int)($in['work_id'] ?? 0);
  $fileId = (int)($in['file_id'] ?? 0);
  if ($workId <= 0) fail('A work id is required.');
  if ($fileId <= 0) fail('A file id is required.');

  $alt = str_field($in, 'alt', 300);
  // Every public image needs real alt text; there is no silent empty default.
  if ($alt === '') fail('Alt text is required for every image.');
  $caption = str_field($in, 'caption', 300);
  $sort = (int)($in['sort_order'] ?? 0);

  $chk = $conn->prepare('SELECT id FROM work WHERE id = ? LIMIT 1');
  $chk->bind_param('i', $workId);
  $chk->execute();
  if (!$chk->get_result()->fetch_assoc()) fail('Work not found.', 404);

  // Make the file publicly reachable BEFORE the row is written. Done the other
  // way round, a failure here would leave an attached image that silently never
  // renders — the quiet breakage this is meant to remove. This also 404s a
  // missing or deleted file, so no separate existence check is needed.
  list($shareToken, $tokenIssued, $expiryCleared) = ensure_public_share($conn, $fileId, $user['id']);

  $stmt = $conn->prepare(
    'INSERT INTO work_images (work_id, file_id, caption, alt, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  $stmt->bind_param('iissi', $workId, $fileId, $caption, $alt, $sort);
  if (!$stmt->execute()) fail('Could not attach the image.', 500);
  $imageId = $conn->insert_id;
  audit($conn, $user['id'], 'work_add_image', "work #$workId file #$fileId");
  ok([
    'id' => $imageId,
    'share_token' => $shareToken,
    'token_issued' => $tokenIssued,
    'expiry_cleared' => $expiryCleared,
  ], 201);
}

// ── Staff: unlink an image ───────────────────────────────────────────────────
if ($method === 'POST' && $action === 'removeImage') {
  $user = require_auth($conn, EDITORS);
  $id = (int)(body()['id'] ?? 0);
  if ($id <= 0) fail('An image id is required.');
  $stmt = $conn->prepare('DELETE FROM work_images WHERE id = ?');
  $stmt->bind_param('i', $id);
  if (!$stmt->execute()) fail('Could not remove the image.', 500);
  if ($stmt->affected_rows < 1) fail('Image not found.', 404);
  audit($conn, $user['id'], 'work_remove_image', "#$id");
  ok(['ok' => true]);
}

fail('Method not allowed.', 405);
