<?php
/**
 * Work / portfolio (GAkinzOS — Work module → public site).
 * Case studies, products, experiments and writing, with an ordered image set.
 *
 * PUBLIC (no auth) — published rows only:
 *   GET  /work.php?action=list[&kind=case_study]  → published records, newest/ordered
 *   GET  /work.php?action=get&slug=foo            → one published record + its images
 *   GET  /work.php?action=hero                    → up to 5 published records flagged for
 *                 the homepage hero, in hero order, with their brand colour, hero word and
 *                 desktop and phone screenshots
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
 *   POST /work.php?action=setHero     {id, on}     -- put a published record in the hero, or take it out
 *   POST /work.php?action=heroOrder   {ids: [4, 2]} -- the full hero set, in its new order
 *
 * create and update also accept the hero presentation fields: brand_colour
 * (#RRGGBB), hero_word (one or two words), hero_desktop_file_id with
 * hero_desktop_alt, and hero_mobile_file_id with hero_mobile_alt. Each is
 * written only when its key is sent, so an older form that does not know about
 * them cannot wipe them. A screenshot is made publicly reachable the same way
 * addImage does it, and needs alt text.
 *
 * Consent rule: a record that names a client cannot be published unless
 * client_consent is set. A forgotten permission must fail closed — a refused
 * publish, never a named client on a public page.
 *
 * Hero rule: at most HERO_MAX records, all published. Unpublishing or removing a
 * record takes it out of the hero and closes the gap in the order.
 */
require __DIR__ . '/_bootstrap.php';

const EDITORS = ['super_admin', 'admin', 'manager', 'editor'];
const KINDS = ['case_study', 'product', 'experiment', 'writing'];
const STATUSES = ['draft', 'published'];
const HERO_MAX = 5;
const HERO_MIGRATION =
  'The homepage hero needs the 2026-10-14 work schema step. Run it (docs/DEPLOYMENT.md section 5), then try again.';

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
  foreach (['hero_order', 'hero_desktop_file_id', 'hero_mobile_file_id'] as $k) {
    if (array_key_exists($k, $r)) $r[$k] = $r[$k] !== null ? (int)$r[$k] : null;
  }
  return $r;
}

/**
 * True once the 2026-10-14 hero columns exist. Until that schema step runs,
 * every existing action keeps working with the hero fields reported as NULL.
 * Cached for the request.
 */
function hero_ready(mysqli $conn): bool {
  static $ready = null;
  if ($ready !== null) return $ready;
  try {
    // LIMIT 0 reads no rows; it only proves the columns are there.
    $res = $conn->query('SELECT hero_order, hero_mobile_alt FROM work LIMIT 0');
    $ready = $res !== false; // older mysqli reporting returns false instead of throwing
  } catch (mysqli_sql_exception $e) {
    if ($e->getCode() !== 1054) throw $e; // ER_BAD_FIELD_ERROR only
    $ready = false;
  }
  return $ready;
}

/**
 * The hero columns for a SELECT, with the screenshot files joined. On an
 * un-migrated database the same aliases are selected as NULL so every branch
 * returns one stable shape.
 */
function hero_select(mysqli $conn): array {
  if (!hero_ready($conn)) {
    return [
      'NULL AS hero_order, NULL AS brand_colour, NULL AS hero_word,
       NULL AS hero_desktop_file_id, NULL AS hero_desktop_alt, NULL AS hero_desktop_token, NULL AS hero_desktop_mime,
       NULL AS hero_mobile_file_id, NULL AS hero_mobile_alt, NULL AS hero_mobile_token, NULL AS hero_mobile_mime',
      '',
    ];
  }
  return [
    'w.hero_order, w.brand_colour, w.hero_word,
     w.hero_desktop_file_id, w.hero_desktop_alt, hd.share_token AS hero_desktop_token, hd.mime AS hero_desktop_mime,
     w.hero_mobile_file_id, w.hero_mobile_alt, hm.share_token AS hero_mobile_token, hm.mime AS hero_mobile_mime',
    ' LEFT JOIN files hd ON hd.id = w.hero_desktop_file_id AND hd.deleted_at IS NULL
      LEFT JOIN files hm ON hm.id = w.hero_mobile_file_id AND hm.deleted_at IS NULL',
  ];
}

/**
 * Fold the joined screenshot columns into `hero_desktop` and `hero_mobile`
 * objects, the same shape as `cover`: {file_id, alt, share_token, mime} or null.
 */
function fold_hero(array $r): array {
  foreach (['desktop', 'mobile'] as $k) {
    $fid = $r["hero_{$k}_file_id"] ?? null;
    $shot = null;
    if ($fid !== null && (int)$fid > 0) {
      $shot = [
        'file_id' => (int)$fid,
        'alt' => (string)($r["hero_{$k}_alt"] ?? ''),
        'share_token' => $r["hero_{$k}_token"] !== null ? (string)$r["hero_{$k}_token"] : null,
        'mime' => $r["hero_{$k}_mime"] !== null ? (string)$r["hero_{$k}_mime"] : null,
      ];
    }
    unset($r["hero_{$k}_alt"], $r["hero_{$k}_token"], $r["hero_{$k}_mime"]);
    $r["hero_$k"] = $shot;
  }
  return $r;
}

/** Renumber the hero 1..n in its current order, closing any gap. */
function hero_compact(mysqli $conn): void {
  $res = $conn->query('SELECT id FROM work WHERE hero_order IS NOT NULL ORDER BY hero_order ASC, id ASC');
  // `updated_at = updated_at`: moving in the hero is not an edit of the record.
  $upd = $conn->prepare('UPDATE work SET hero_order = ?, updated_at = updated_at WHERE id = ?');
  $n = 0;
  while ($row = $res->fetch_assoc()) {
    $n++;
    $id = (int)$row['id'];
    $upd->bind_param('ii', $n, $id);
    if (!$upd->execute()) fail('Could not save the hero order.', 500);
  }
}

/**
 * Take one record out of the hero and close the gap. Returns true when it was
 * in the hero. A no-op on an un-migrated database.
 */
function hero_drop(mysqli $conn, int $id): bool {
  if (!hero_ready($conn)) return false;
  $stmt = $conn->prepare('UPDATE work SET hero_order = NULL, updated_at = updated_at WHERE id = ? AND hero_order IS NOT NULL');
  $stmt->bind_param('i', $id);
  if (!$stmt->execute()) fail('Could not update the hero.', 500);
  if ($stmt->affected_rows < 1) return false;
  hero_compact($conn);
  return true;
}

/**
 * Read the hero presentation fields from a create/update body. Only keys that
 * were sent are returned, so an older client that omits them leaves the stored
 * values alone. Column names are the fixed keys below, never request input.
 */
function read_hero_fields(array $in): array {
  $out = [];

  if (array_key_exists('brand_colour', $in)) {
    $v = $in['brand_colour'];
    if ($v !== null && !is_string($v)) fail('brand_colour must be a colour such as #1A2B3C.');
    $v = trim((string)$v);
    if ($v !== '' && !preg_match('/^#[0-9A-Fa-f]{6}$/', $v)) fail('brand_colour must be a colour such as #1A2B3C.');
    $out['brand_colour'] = $v === '' ? null : strtoupper($v);
  }

  if (array_key_exists('hero_word', $in)) {
    $v = $in['hero_word'];
    if ($v !== null && !is_string($v)) fail('hero_word must be text.');
    $v = trim(preg_replace('/\s+/u', ' ', (string)$v));
    if (mb_strlen($v) > 40) fail('The hero word must be 40 characters or fewer.');
    if ($v !== '' && count(explode(' ', $v)) > 2) fail('The hero word must be one or two words.');
    $out['hero_word'] = $v === '' ? null : $v;
  }

  foreach (['desktop', 'mobile'] as $k) {
    $fileKey = "hero_{$k}_file_id";
    $altKey = "hero_{$k}_alt";
    $hasFile = array_key_exists($fileKey, $in);
    if (!$hasFile && array_key_exists($altKey, $in)) fail("$altKey must be sent together with $fileKey.");
    if (!$hasFile) continue;
    $fid = nullable_id($in, $fileKey);
    if ($fid === null) {
      $out[$fileKey] = null;
      $out[$altKey] = null;
      continue;
    }
    $alt = $in[$altKey] ?? '';
    if (!is_string($alt)) fail('Alt text is required for every image.');
    $alt = trim($alt);
    if ($alt === '') fail('Alt text is required for every image.');
    if (mb_strlen($alt) > 200) fail("$altKey must be 200 characters or fewer.");
    $out[$fileKey] = $fid;
    $out[$altKey] = $alt;
  }

  return $out;
}

/** Write the hero presentation fields read by read_hero_fields(). */
function write_hero_fields(mysqli $conn, int $id, array $h): void {
  if (!$h) return;
  $set = implode(', ', array_map(fn($k) => "$k = ?", array_keys($h)));
  $types = implode('', array_map(fn($k) => substr($k, -8) === '_file_id' ? 'i' : 's', array_keys($h))) . 'i';
  $vals = array_values($h);
  $vals[] = $id;
  $stmt = $conn->prepare("UPDATE work SET $set WHERE id = ?");
  $stmt->bind_param($types, ...$vals);
  if (!$stmt->execute()) fail('Could not save the hero details.', 500);
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

// The hero columns and their screenshot joins, or NULL placeholders before the
// 2026-10-14 schema step has run. Fixed SQL fragments, never request input.
[$HERO_COLUMNS, $HERO_JOIN] = hero_select($conn);

// ── Public: published list ───────────────────────────────────────────────────
if ($method === 'GET' && ($action === 'list' || $action === '')) {
  $kind = str_field($_GET, 'kind', 20);
  if ($kind !== '' && !in_array($kind, KINDS, true)) fail('Invalid kind.');

  $sql = 'SELECT ' . WORK_COLUMNS . ', ' . COVER_COLUMNS . ', ' . $HERO_COLUMNS . '
          FROM work w ' . COVER_JOIN . $HERO_JOIN . '
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
    $rows[] = public_view(fold_hero(fold_cover(shape_work($r))));
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
    'SELECT ' . WORK_COLUMNS . ', w.problem, w.built, w.outcome, ' . COVER_COLUMNS . ', ' . $HERO_COLUMNS . '
     FROM work w ' . COVER_JOIN . $HERO_JOIN . '
     WHERE w.slug = ? AND w.status = "published" LIMIT 1'
  );
  $stmt->bind_param('s', $slug);
  $stmt->execute();
  $r = $stmt->get_result()->fetch_assoc();
  if (!$r) fail('Work not found.', 404);
  $r = public_view(fold_hero(fold_cover(shape_work($r))));
  $r['images'] = work_images($conn, $r['id']);
  ok($r);
}

// ── Public: the homepage hero ────────────────────────────────────────────────
// Published records with a hero_order, in that order, at most HERO_MAX. The
// status filter is a hard-coded literal, as in `get`, and public_view() applies
// the same consent rule as `list`. Only the fields the hero renders are sent.
if ($method === 'GET' && $action === 'hero') {
  if (!hero_ready($conn)) ok([]); // un-migrated: no hero yet, the site uses its own
  $stmt = $conn->prepare(
    'SELECT w.id, w.slug, w.kind, w.title, w.client_name, w.client_consent, w.sector, w.summary,
            w.live_url, w.status, ' . $HERO_COLUMNS . '
     FROM work w' . $HERO_JOIN . '
     WHERE w.status = "published" AND w.hero_order IS NOT NULL
     ORDER BY w.hero_order ASC, w.id ASC LIMIT ' . HERO_MAX
  );
  $stmt->execute();
  $res = $stmt->get_result();
  $rows = [];
  while ($r = $res->fetch_assoc()) {
    $r['id'] = (int)$r['id'];
    $r['hero_order'] = (int)$r['hero_order'];
    $r = fold_hero($r);
    unset($r['hero_desktop_file_id'], $r['hero_mobile_file_id']);
    $rows[] = public_view($r);
  }
  ok($rows);
}

// ── Staff: everything, drafts included, consent visible ──────────────────────
if ($method === 'GET' && $action === 'listAll') {
  require_auth($conn, EDITORS);
  // The narrative columns are included so the CMS can round-trip a record it
  // has listed. EDITORS-gated, so there is no disclosure question; the cost is
  // payload size, and the edit form should prefer getAdmin for a single record.
  $res = $conn->query(
    'SELECT ' . WORK_COLUMNS . ', w.problem, w.built, w.outcome, ' . COVER_COLUMNS . ', ' . $HERO_COLUMNS . '
     FROM work w ' . COVER_JOIN . $HERO_JOIN . '
     ORDER BY w.featured DESC, w.sort_order ASC, w.id DESC LIMIT 500'
  );
  $rows = [];
  while ($r = $res->fetch_assoc()) {
    $rows[] = fold_hero(fold_cover(shape_work($r)));
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
    'SELECT ' . WORK_COLUMNS . ', w.problem, w.built, w.outcome, ' . COVER_COLUMNS . ', ' . $HERO_COLUMNS . '
     FROM work w ' . COVER_JOIN . $HERO_JOIN . '
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
  $r = fold_hero(fold_cover(shape_work($r)));
  $r['images'] = work_images($conn, $r['id']);
  ok($r);
}

// ── Staff: create / update ───────────────────────────────────────────────────
if ($method === 'POST' && ($action === 'create' || $action === 'update')) {
  $user = require_auth($conn, EDITORS);
  $in = body();
  $f = read_fields($in);
  $h = read_hero_fields($in);
  $uid = $user['id'];

  if (!hero_ready($conn)) {
    // Before the schema step, an empty hero field is harmless and ignored; a
    // real value must not be silently dropped.
    foreach ($h as $v) {
      if ($v !== null) fail(HERO_MIGRATION, 503);
    }
    $h = [];
  }
  // Make each screenshot publicly reachable BEFORE it is recorded, exactly as
  // addImage does, so a hero can never point at a file that will not load.
  // This also 404s a missing or deleted file.
  foreach (['hero_desktop_file_id', 'hero_mobile_file_id'] as $k) {
    if (!empty($h[$k])) ensure_public_share($conn, (int)$h[$k], $uid);
  }

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
    write_hero_fields($conn, $newId, $h);
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
  write_hero_fields($conn, $id, $h);
  audit($conn, $uid, 'work_update', "#$id");
  // A draft cannot sit in the hero: saving one takes it out and closes the gap.
  $heroRemoved = $f['status'] !== 'published' && hero_drop($conn, $id);
  if ($heroRemoved) audit($conn, $uid, 'work_hero_off', "#$id unpublished");
  ok(['ok' => true, 'slug' => $slug, 'hero_removed' => $heroRemoved]);
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
  // Unpublishing takes the record out of the hero and closes the gap.
  $heroRemoved = $status !== 'published' && hero_drop($conn, $id);
  if ($heroRemoved) audit($conn, $user['id'], 'work_hero_off', "#$id unpublished");
  ok(['ok' => true, 'status' => $status, 'hero_removed' => $heroRemoved]);
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
  // If it was in the hero, close the gap it left.
  if (hero_ready($conn)) hero_compact($conn);
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

// ── Staff: put a record in the homepage hero, or take it out ─────────────────
// The limit and the published-only rule are checked inside a transaction with
// the hero rows locked, so two editors switching records on at once cannot
// push the hero past HERO_MAX or hand out the same position twice.
if ($method === 'POST' && $action === 'setHero') {
  $user = require_auth($conn, EDITORS);
  if (!hero_ready($conn)) fail(HERO_MIGRATION, 503);
  $in = body();
  $id = (int)($in['id'] ?? 0);
  if ($id <= 0) fail('A work id is required.');
  if (!array_key_exists('on', $in) || !is_bool($in['on'])) fail('Say whether the record goes in the hero: on must be true or false.');
  $on = $in['on'];

  $conn->begin_transaction();
  $stop = function (string $msg, int $code) use ($conn): void {
    $conn->rollback();
    fail($msg, $code);
  };

  $stmt = $conn->prepare('SELECT status, hero_order FROM work WHERE id = ? LIMIT 1 FOR UPDATE');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  if (!$row) $stop('Work not found.', 404);
  $current = $row['hero_order'] !== null ? (int)$row['hero_order'] : null;

  if ($on) {
    if ($current !== null) {
      $conn->commit();
      ok(['ok' => true, 'hero_order' => $current]); // already in the hero
    }
    if ($row['status'] !== 'published') $stop('Publish this record before putting it in the hero.', 409);
    $cnt = $conn->query('SELECT COUNT(*) AS c, COALESCE(MAX(hero_order), 0) AS m FROM work WHERE hero_order IS NOT NULL FOR UPDATE')->fetch_assoc();
    if ((int)$cnt['c'] >= HERO_MAX) $stop('The hero holds ' . HERO_MAX . ' projects. Switch one off first.', 409);
    $next = (int)$cnt['m'] + 1;
    $upd = $conn->prepare('UPDATE work SET hero_order = ?, updated_at = updated_at WHERE id = ?');
    $upd->bind_param('ii', $next, $id);
    if (!$upd->execute()) $stop('Could not update the hero.', 500);
    hero_compact($conn); // keeps 1..n even if an older gap was left behind
    $conn->commit();
    $re = $conn->prepare('SELECT hero_order FROM work WHERE id = ?');
    $re->bind_param('i', $id);
    $re->execute();
    $order = (int)$re->get_result()->fetch_assoc()['hero_order'];
    audit($conn, $user['id'], 'work_hero_on', "#$id at $order");
    ok(['ok' => true, 'hero_order' => $order]);
  }

  if ($current === null) {
    $conn->commit();
    ok(['ok' => true, 'hero_order' => null]); // already out
  }
  hero_drop($conn, $id);
  $conn->commit();
  audit($conn, $user['id'], 'work_hero_off', "#$id");
  ok(['ok' => true, 'hero_order' => null]);
}

// ── Staff: reorder the homepage hero ─────────────────────────────────────────
// `ids` must be exactly the records currently in the hero, each once, in the
// new order. A partial list is refused rather than guessed at.
if ($method === 'POST' && $action === 'heroOrder') {
  $user = require_auth($conn, EDITORS);
  if (!hero_ready($conn)) fail(HERO_MIGRATION, 503);
  $ids = body()['ids'] ?? null;
  if (!is_array($ids) || !$ids) fail('An ordered list of ids is required.');
  if (count($ids) > HERO_MAX) fail('The hero holds at most ' . HERO_MAX . ' projects.');
  $clean = [];
  foreach ($ids as $raw) {
    if (!is_int($raw) && !(is_string($raw) && ctype_digit($raw))) fail('Every id in the list must be a positive integer.');
    $v = (int)$raw;
    if ($v <= 0) fail('Every id in the list must be a positive integer.');
    if (in_array($v, $clean, true)) fail('Each project may appear in the hero order only once.');
    $clean[] = $v;
  }

  $conn->begin_transaction();
  $res = $conn->query('SELECT id FROM work WHERE hero_order IS NOT NULL FOR UPDATE');
  $inHero = [];
  while ($r = $res->fetch_assoc()) $inHero[] = (int)$r['id'];
  $a = $clean;
  sort($a);
  sort($inHero);
  if ($a !== $inHero) {
    $conn->rollback();
    fail('The order must list every project currently in the hero, and only those.', 409);
  }
  $upd = $conn->prepare('UPDATE work SET hero_order = ?, updated_at = updated_at WHERE id = ?');
  foreach ($clean as $i => $id) {
    $order = $i + 1;
    $upd->bind_param('ii', $order, $id);
    if (!$upd->execute()) {
      $conn->rollback();
      fail('Could not save the hero order.', 500);
    }
  }
  $conn->commit();
  audit($conn, $user['id'], 'work_hero_order', implode(',', $clean));
  ok(['ok' => true, 'count' => count($clean)]);
}

fail('Method not allowed.', 405);
