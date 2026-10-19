<?php
/**
 * Site content (GAkinzOS → public site copy).
 * One row per public section in `site_content`. The CMS saves a draft; publishing
 * copies the draft to `published`, and only `published` ever reaches the public.
 *
 * PUBLIC (no auth):
 *   GET  /site.php?action=get        → {section: data} for every section that has
 *                                      been published. Never a draft. {} when
 *                                      nothing is published or the table is missing,
 *                                      so the public site falls back to its own copy.
 *
 * STAFF (require_auth EDITORS):
 *   GET  /site.php?action=draft      → {section: {draft, published, updated_at,
 *                                      updated_by_name, published_at, published_by_name}}
 *                                      for every known section
 *   POST /site.php?action=save       {section, data}      -- validate, store as the draft
 *   POST /site.php?action=publish    {sections?: string[]} -- copy draft to published for
 *                                      the given sections, or every section with a draft
 *
 * Every section has a fixed shape (SECTIONS below). Unknown sections, unknown
 * keys, wrong types, over-long text and over-long lists are refused, never
 * trimmed to fit, so the CMS shows the editor exactly what was wrong.
 *
 * Services (2026-10-19, D-038): a row may carry its whole service page. slug,
 * group, hook, needs, deliverables, exclusions and price_basis come all together
 * or not at all (detail stays optional), so a published service is either a
 * whole page or, as every row saved before this change, a title and summary
 * that edit a built-in service. Slugs are unique within the list.
 *
 * Business (2026-10-19): the `business` section holds the public email, phone,
 * address lines, opening note and social profiles. Every field is optional. A
 * profile is a platform from a fixed list and an https address, so structured
 * data can trust what it reads.
 */
require __DIR__ . '/_bootstrap.php';

const EDITORS = ['super_admin', 'admin', 'manager', 'editor'];
const SITE_MIGRATION =
  'Site content needs the 2026-10-14 site_content schema step. Run it (docs/DEPLOYMENT.md section 5), then try again.';
const MAX_ROWS = 12;
const SHORT = 300;
const LONG = 1200;
const SERVICE_LIST_MAX = 10;
const SERVICE_GROUPS = ['websites', 'it'];
const SOCIAL_PLATFORMS = ['linkedin', 'instagram', 'facebook', 'x', 'youtube', 'tiktok', 'github'];
const SOCIAL_MAX = 10;
const ADDRESS_MAX_LINES = 4;
const URL_MAX = 300;

/**
 * The allow-list of sections and their shapes.
 * `type` is 'object' (one record) or 'list' (1..MAX_ROWS records). Each field is
 * [kind, max-or-range, required]: kind is 'str', 'email', 'int', 'bool',
 * 'slug' (lower-case words joined by single hyphens), 'enum' (one of a list) or
 * 'strlist' (1..limit non-empty lines of at most SHORT characters),
 * 'phone' (digits with an optional leading +, spaces, brackets and hyphens),
 * 'url' (an https address with a host, no credentials, no spaces) and
 * 'sociallist' (1..SOCIAL_MAX profiles of platform, https url and optional label).
 * `together` names optional fields that must all be present once any one is.
 * `unique` names a field no two rows may share.
 */
const SECTIONS = [
  'hero' => ['type' => 'object', 'fields' => [
    'status' => ['str', SHORT, true],
    'lead' => ['str', LONG, true],
    'cta1' => ['str', SHORT, true],
    'cta2' => ['str', SHORT, true],
    'secs' => ['int', [4, 10], true],
  ]],
  'services' => ['type' => 'list', 'fields' => [
    'title' => ['str', SHORT, true],
    'summary' => ['str', LONG, true],
    'slug' => ['slug', 80, false],
    'group' => ['enum', SERVICE_GROUPS, false],
    'hook' => ['str', SHORT, false],
    'detail' => ['str', LONG, false],
    'needs' => ['strlist', SERVICE_LIST_MAX, false],
    'deliverables' => ['strlist', SERVICE_LIST_MAX, false],
    'exclusions' => ['strlist', SERVICE_LIST_MAX, false],
    'price_basis' => ['str', SHORT, false],
  ], 'together' => ['slug', 'group', 'hook', 'needs', 'deliverables', 'exclusions', 'price_basis'], 'unique' => 'slug'],
  'process' => ['type' => 'list', 'fields' => [
    'title' => ['str', SHORT, true],
    'detail' => ['str', LONG, true],
  ]],
  'packages' => ['type' => 'list', 'fields' => [
    'name' => ['str', SHORT, true],
    'price' => ['str', SHORT, true],
    'best' => ['str', LONG, true],
    'featured' => ['bool', null, false],
  ]],
  'addons' => ['type' => 'list', 'fields' => [
    'name' => ['str', SHORT, true],
    'price' => ['str', SHORT, true],
  ]],
  'terms' => ['type' => 'list', 'fields' => [
    'stage' => ['str', SHORT, true],
    'share' => ['str', SHORT, true],
  ]],
  'faqs' => ['type' => 'list', 'fields' => [
    'q' => ['str', SHORT, true],
    'a' => ['str', LONG, true],
  ]],
  'contact' => ['type' => 'object', 'fields' => [
    'email' => ['email', 200, true],
    'reply' => ['str', SHORT, true],
    'footer' => ['str', LONG, true],
  ]],
  // Business and social links (2026-10-19, spec 4.4): the public details shown
  // in the header, footer, About, legal pages and structured data. Every field
  // is optional; one left out falls back to the site's built-in value.
  'business' => ['type' => 'object', 'fields' => [
    'email' => ['email', 200, false],
    'phone' => ['phone', 30, false],
    'address' => ['strlist', ADDRESS_MAX_LINES, false],
    'hours' => ['str', SHORT, false],
    'social' => ['sociallist', SOCIAL_MAX, false],
  ]],
];

/** Fields of one social profile. */
const SOCIAL_FIELDS = [
  'platform' => ['enum', SOCIAL_PLATFORMS, true],
  'url' => ['url', URL_MAX, true],
  'label' => ['str', 60, false],
];

/** True for a PHP array that came from a JSON array rather than a JSON object. */
function is_list_array(array $a): bool {
  return $a === [] || array_keys($a) === range(0, count($a) - 1);
}

/** Validate one record against its field map. Returns the cleaned record. */
function clean_record($rec, array $fields, string $where): array {
  if (!is_array($rec) || ($rec !== [] && is_list_array($rec))) fail("$where must be an object.");
  foreach (array_keys($rec) as $k) {
    if (!array_key_exists((string)$k, $fields)) fail("$where has an unknown field \"$k\".");
  }
  $out = [];
  foreach ($fields as $name => [$kind, $limit, $required]) {
    $label = "$where.$name";
    if (!array_key_exists($name, $rec) || $rec[$name] === null) {
      if ($required) fail("$label is required.");
      continue;
    }
    $v = $rec[$name];
    switch ($kind) {
      case 'str':
      case 'email':
        if (!is_string($v)) fail("$label must be text.");
        $v = trim($v);
        if ($v === '') {
          if ($required) fail("$label cannot be empty.");
          continue 2;
        }
        if (mb_strlen($v) > $limit) fail("$label must be $limit characters or fewer.");
        if ($kind === 'email' && !filter_var($v, FILTER_VALIDATE_EMAIL)) fail("$label must be a valid email address.");
        break;
      case 'int':
        // JSON 6 and 6.0 both decode to a whole number; "6" and 6.5 do not.
        if (is_float($v) && floor($v) === $v) $v = (int)$v;
        if (!is_int($v)) fail("$label must be a whole number.");
        if ($v < $limit[0] || $v > $limit[1]) fail("$label must be between {$limit[0]} and {$limit[1]}.");
        break;
      case 'bool':
        if (!is_bool($v)) fail("$label must be true or false.");
        break;
      case 'slug':
        if (!is_string($v)) fail("$label must be text.");
        $v = trim($v);
        if ($v === '') {
          if ($required) fail("$label cannot be empty.");
          continue 2;
        }
        if (strlen($v) > $limit || !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $v)) {
          fail("$label must be lower-case letters, numbers and single hyphens, $limit characters or fewer.");
        }
        break;
      case 'enum':
        if (!is_string($v) || !in_array($v, $limit, true)) fail("$label must be one of: " . implode(', ', $limit) . '.');
        break;
      case 'phone':
        if (!is_string($v)) fail("$label must be text.");
        $v = trim($v);
        if ($v === '') continue 2;
        if (strlen($v) > $limit || !preg_match('/^\+?[0-9][0-9 ()\-]*$/', $v) || preg_match_all('/[0-9]/', $v) < 7) {
          fail("$label must be a phone number of 7 or more digits, using only digits, spaces, brackets and hyphens, with an optional leading +.");
        }
        break;
      case 'url':
        if (!is_string($v)) fail("$label must be text.");
        $v = trim($v);
        if ($v === '') {
          if ($required) fail("$label cannot be empty.");
          continue 2;
        }
        if (strlen($v) > $limit) fail("$label must be $limit characters or fewer.");
        $parts = preg_match('/\s/', $v) ? false : parse_url($v);
        if (!$parts || strtolower($parts['scheme'] ?? '') !== 'https' || empty($parts['host']) || isset($parts['user']) || isset($parts['pass'])
            || !filter_var($v, FILTER_VALIDATE_URL) || !str_contains($parts['host'], '.')) {
          fail("$label must be a full https:// address, with no sign-in details.");
        }
        break;
      case 'sociallist':
        if (!is_array($v) || !is_list_array($v)) fail("$label must be a list of profiles.");
        if (count($v) < 1) fail("$label needs at least one profile, or leave it out.");
        if (count($v) > $limit) fail("$label can hold at most $limit profiles.");
        $profiles = [];
        $urls = [];
        foreach ($v as $j => $profile) {
          $p = clean_record($profile, SOCIAL_FIELDS, $label . '[' . ($j + 1) . ']');
          $key = strtolower($p['url']);
          if (isset($urls[$key])) fail($label . '[' . ($j + 1) . '].url is already listed.');
          $urls[$key] = true;
          $profiles[] = $p;
        }
        $v = $profiles;
        break;
      case 'strlist':
        if (!is_array($v) || !is_list_array($v)) fail("$label must be a list of lines.");
        if (count($v) < 1) fail("$label needs at least one line.");
        if (count($v) > $limit) fail("$label can hold at most $limit lines.");
        $lines = [];
        foreach ($v as $j => $line) {
          if (!is_string($line)) fail("$label line " . ($j + 1) . ' must be text.');
          $line = trim($line);
          if ($line === '') fail("$label line " . ($j + 1) . ' cannot be empty.');
          if (mb_strlen($line) > SHORT) fail("$label line " . ($j + 1) . ' must be ' . SHORT . ' characters or fewer.');
          $lines[] = $line;
        }
        $v = $lines;
        break;
    }
    $out[$name] = $v;
  }
  return $out;
}

/** Fields that come all together or not at all: refuse a record holding only some. */
function check_together(array $rec, array $together, string $where): void {
  $present = array_values(array_filter($together, fn($f) => array_key_exists($f, $rec)));
  if ($present && count($present) < count($together)) {
    $missing = array_values(array_diff($together, $present));
    fail("$where is missing " . implode(', ', $missing) . '. A service page needs all of ' . implode(', ', $together) . ', or none of them.');
  }
}

/** Validate a whole section's data. Returns the cleaned data, ready to store. */
function clean_section(string $section, $data): array {
  $shape = SECTIONS[$section];
  if ($shape['type'] === 'object') return clean_record($data, $shape['fields'], $section);

  if (!is_array($data) || !is_list_array($data)) fail("$section must be a list.");
  if (count($data) < 1) fail("$section needs at least one entry.");
  if (count($data) > MAX_ROWS) fail("$section can hold at most " . MAX_ROWS . ' entries.');
  $out = [];
  $seen = [];
  foreach ($data as $i => $rec) {
    $where = $section . '[' . ($i + 1) . ']';
    $clean = clean_record($rec, $shape['fields'], $where);
    if (isset($shape['together'])) check_together($clean, $shape['together'], $where);
    if (isset($shape['unique']) && array_key_exists($shape['unique'], $clean)) {
      $key = $clean[$shape['unique']];
      if (isset($seen[$key])) fail("$where.{$shape['unique']} \"$key\" is already used by another entry.");
      $seen[$key] = true;
    }
    $out[] = $clean;
  }
  return $out;
}

/** A section name from the request, refused unless it is on the allow-list. */
function known_section($v): string {
  if (!is_string($v) || !array_key_exists($v, SECTIONS)) {
    fail('Unknown section. Use one of: ' . implode(', ', array_keys(SECTIONS)) . '.');
  }
  return $v;
}

/** True when a query failed only because site_content does not exist yet. */
function site_table_missing(Throwable $e): bool {
  return $e instanceof mysqli_sql_exception && $e->getCode() === 1146; // ER_NO_SUCH_TABLE
}

/**
 * Run a statement-building closure, turning a missing table into either
 * `null` (public read) or a clear refusal (staff actions).
 */
function with_table(mysqli $conn, callable $fn, bool $public = false) {
  try {
    $result = $fn();
  } catch (mysqli_sql_exception $e) {
    if (!site_table_missing($e)) throw $e;
    if ($public) return null;
    fail(SITE_MIGRATION, 503);
  }
  // With mysqli reporting off (older PHP) a missing table returns false
  // instead of throwing. Treat it the same way.
  if ($result === false && $conn->errno === 1146) {
    if ($public) return null;
    fail(SITE_MIGRATION, 503);
  }
  return $result;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── Public: published copy only ──────────────────────────────────────────────
// Selects the `published` column alone; a draft can never be in this response.
if ($method === 'GET' && ($action === 'get' || $action === '')) {
  $res = with_table($conn, fn() => $conn->query(
    'SELECT section, published FROM site_content WHERE published IS NOT NULL'
  ), true);
  $out = [];
  if ($res) {
    while ($r = $res->fetch_assoc()) {
      if (!array_key_exists($r['section'], SECTIONS)) continue; // a retired section stays private
      $data = json_decode((string)$r['published'], true);
      if (is_array($data)) $out[$r['section']] = $data;
    }
  }
  // Short public cache: an edit appears within a minute without hammering MySQL.
  header('Cache-Control: public, max-age=60');
  ok((object)$out); // {} rather than [] when nothing is published
}

// ── Staff: drafts and published copy side by side ────────────────────────────
if ($method === 'GET' && $action === 'draft') {
  require_auth($conn, EDITORS);
  $res = with_table($conn, fn() => $conn->query(
    'SELECT s.section, s.draft, s.published, s.updated_at, s.published_at,
            ub.name AS updated_by_name, pb.name AS published_by_name
     FROM site_content s
     LEFT JOIN users ub ON ub.id = s.updated_by
     LEFT JOIN users pb ON pb.id = s.published_by'
  ));
  $rows = [];
  while ($r = $res->fetch_assoc()) $rows[$r['section']] = $r;

  $out = [];
  foreach (array_keys(SECTIONS) as $section) {
    $r = $rows[$section] ?? null;
    $out[$section] = [
      'draft' => $r && $r['draft'] !== null ? json_decode($r['draft'], true) : null,
      'published' => $r && $r['published'] !== null ? json_decode($r['published'], true) : null,
      'updated_at' => $r['updated_at'] ?? null,
      'updated_by_name' => $r['updated_by_name'] ?? null,
      'published_at' => $r['published_at'] ?? null,
      'published_by_name' => $r['published_by_name'] ?? null,
    ];
  }
  header('Cache-Control: no-store');
  ok($out);
}

// ── Staff: save a draft ──────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'save') {
  $user = require_auth($conn, EDITORS);
  $in = body();
  $section = known_section($in['section'] ?? null);
  if (!array_key_exists('data', $in)) fail('Nothing to save: data is required.');
  $data = clean_section($section, $in['data']);
  $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if ($json === false) fail('Could not encode that content.', 400);
  $uid = $user['id'];

  with_table($conn, function () use ($conn, $section, $json, $uid) {
    $stmt = $conn->prepare(
      'INSERT INTO site_content (section, draft, updated_by) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE draft = VALUES(draft), updated_by = VALUES(updated_by)'
    );
    if (!$stmt) return false;
    $stmt->bind_param('ssi', $section, $json, $uid);
    if (!$stmt->execute()) fail('Could not save the draft.', 500);
    return true;
  });
  audit($conn, $uid, 'site_save', $section);
  ok(['ok' => true, 'section' => $section, 'draft' => $data]);
}

// ── Staff: publish drafts ────────────────────────────────────────────────────
// Re-validates each stored draft before it goes public, so a draft written
// before a shape tightened cannot reach the site in the old shape.
if ($method === 'POST' && $action === 'publish') {
  $user = require_auth($conn, EDITORS);
  $in = body();
  $requested = null;
  if (array_key_exists('sections', $in) && $in['sections'] !== null) {
    if (!is_array($in['sections']) || !is_list_array($in['sections']) || !$in['sections']) {
      fail('sections must be a non-empty list of section names.');
    }
    $requested = array_values(array_unique(array_map('known_section', $in['sections'])));
  }

  $res = with_table($conn, fn() => $conn->query('SELECT section, draft FROM site_content WHERE draft IS NOT NULL'));
  $drafts = [];
  while ($r = $res->fetch_assoc()) {
    if (array_key_exists($r['section'], SECTIONS)) $drafts[$r['section']] = $r['draft'];
  }

  $targets = $requested ?? array_keys($drafts);
  if (!$targets) fail('There is nothing saved to publish.', 409);
  foreach ($targets as $section) {
    if (!array_key_exists($section, $drafts)) fail("There is no saved draft for $section yet.", 409);
    clean_section($section, json_decode($drafts[$section], true));
  }

  $uid = $user['id'];
  // `updated_at = updated_at`: publishing is not an edit of the draft.
  $stmt = $conn->prepare(
    'UPDATE site_content SET published = draft, published_by = ?, published_at = NOW(), updated_at = updated_at
     WHERE section = ? AND draft IS NOT NULL'
  );
  $conn->begin_transaction();
  foreach ($targets as $section) {
    $stmt->bind_param('is', $uid, $section);
    if (!$stmt->execute()) {
      $conn->rollback();
      fail('Could not publish the site content.', 500);
    }
  }
  $conn->commit();
  sort($targets);
  audit($conn, $uid, 'site_publish', implode(',', $targets));
  ok(['ok' => true, 'published' => $targets]);
}

fail('Method not allowed.', 405);
