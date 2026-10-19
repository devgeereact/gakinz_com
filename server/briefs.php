<?php
/**
 * Project brief and agreed measurements (docs/PRODUCT-SPEC.md sections 6.4 and
 * 6.5), and the manual, sanitised GEE OS handoff export. Both tables belong to
 * the project, so they share one endpoint. Staff only, with the roles of
 * projects.php: a client gets 403 on every route, reads included.
 *
 *   GET  /briefs.php?project_id=N                  → {project, brief|null, measurements[]}
 *   POST /briefs.php?action=save                   {project_id, ...brief fields}  upsert
 *   POST /briefs.php?action=measure_create         {project_id, label, ...}
 *   POST /briefs.php?action=measure_update         {id, project_id, ...}
 *   POST /briefs.php?action=measure_delete         {id, project_id}               soft delete
 *   GET  /briefs.php?action=handoff&project_id=N   → text/markdown attachment
 *
 * Saving a brief: no field is required. A field left out of the body keeps its
 * stored value; null or a blank string clears it. Unknown keys are ignored.
 * Each text field has a length cap (BRIEF_FIELDS); a longer value is refused,
 * never cut.
 *
 * Measurements: a measurement is addressed by its id AND its project_id, and
 * both must match one live row on a live project, so a mismatched project_id
 * answers 404 exactly as a missing measurement does. Result is one of
 * PASS, FAIL, PARTIAL or NOT TESTED; kind is technical or business, and
 * observation_window is kept for business observations only.
 *
 * Handoff export (?action=handoff). It carries ONLY:
 *   - project reference: the project id and name
 *   - client reference: the client ID number, nothing else about the client
 *   - approved scope: deliverables, exclusions, quote reference
 *   - acceptance criteria: each measurement's label, target, method, result
 *   - open decisions and next action
 *   - evidence locations (each measurement's evidence_location)
 * It EXCLUDES, by construction (they are never selected for the export):
 *   - client personal data: company, contact name, email, phone, address,
 *     client notes, portal users, and anything else from the clients table
 *   - the brief's other fields: problem, intended users, agreed outcome,
 *     milestones note, handover checklist, support boundaries and the
 *     completion acknowledgement (date and note)
 *   - measurement baseline, actual value, date, environment, kind and
 *     observation window, and every user id or name (created_by, updated_by)
 *   - files, messages, invoices, tasks, assets, tokens, configuration and
 *     anything secret
 * The exported fields are staff-written and go out as typed, after one
 * narrow redaction pass (md_sanitise). It is a safety net, not a guarantee:
 * staff must not type personal data or secrets into the brief.
 *   - this client's exact company, contact name and email, matched as whole
 *     words, ignoring case (a value under 3 characters is skipped, and "Ann"
 *     never touches "Annual"), become "[client detail removed]"
 *   - this client's phone, matched by its digits whatever the spaces,
 *     dashes, dots or brackets, with +44, 0044 and a leading 0 treated as
 *     the same, becomes "[client detail removed]"
 *   - any email address becomes "[email removed]"
 *   - every link loses its query string, fragment and user:pass@ login,
 *     because the spec asks for non-sensitive evidence links
 * Other personal data typed into these fields is not detected.
 * Markdown safety: user text can never change the document's structure.
 * Control characters are removed; \ ` * _ { } [ ] < > # | ! ~ & are
 * backslash-escaped everywhere, so no heading, link, image, table, HTML tag,
 * entity or code span can be written; a line-leading +, -, = or "1." is
 * escaped too, except that "- " and "* " bullets in multi-line fields are
 * kept as plain "- " list items. Single-line fields have newlines collapsed
 * to spaces. A secret typed into a brief field is not detectable, so the
 * panel tells staff never to put one there.
 *
 * Until SQL 16 runs, every route answers 503.
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager', 'editor', 'employee']; // as projects.php
/** Also shown as the brief panel's hint (HANDOFF_NOTE in projectBriefModel.ts). Keep the two the same. */
const HANDOFF_NOTE = "Staff-written fields are exported as typed, after removing this client's exact company, contact name, email "
  . "and phone, and any email address; links lose their query string, fragment and login. "
  . 'Do not type personal data or secrets into the brief.';
const BRIEF_MIGRATION = 'The project brief needs the 2026-10-19 database update (SQL 16) first.';
/** Brief text fields and their length caps, in characters. */
const BRIEF_FIELDS = [
  'problem'             => 2000,
  'intended_users'      => 1000,
  'agreed_outcome'      => 2000,
  'deliverables'        => 4000,
  'exclusions'          => 2000,
  'quote_reference'     => 120,
  'milestones_note'     => 2000,
  'next_action'         => 500,
  'open_decisions'      => 2000,
  'handover_checklist'  => 4000,
  'support_boundaries'  => 2000,
  'completion_ack_note' => 1000,
];
/** Single-line brief fields: newlines are collapsed to spaces. */
const BRIEF_ONE_LINE = ['quote_reference', 'next_action'];
/** Measurement text fields (besides the required label) and their caps. */
const MEASURE_FIELDS = [
  'target'             => 500,
  'baseline'           => 500,
  'actual'             => 500,
  'environment'        => 200,
  'method'             => 1000,
  'evidence_location'  => 500,
  'observation_window' => 200,
];
const MEASURE_LABEL_MAX = 200;
const MEASURE_RESULTS = ['PASS', 'FAIL', 'PARTIAL', 'NOT TESTED'];
const MEASURE_KINDS = ['technical', 'business'];
const MEASURES_PER_PROJECT_MAX = 50;
const MEASURE_COLS = ['id', 'project_id', 'label', 'target', 'baseline', 'actual', 'result', 'measured_on', 'environment',
  'method', 'evidence_location', 'kind', 'observation_window', 'created_at', 'updated_at'];

function br_stmt(mysqli $conn, string $sql): mysqli_stmt {
  $s = $conn->prepare($sql);
  if ($s === false) {
    if ($conn->errno === 1146) fail(BRIEF_MIGRATION, 503);
    fail('Database error.', 500);
  }
  return $s;
}

function br_id($v): int {
  if (is_int($v)) return $v > 0 ? $v : 0;
  if (is_string($v) && preg_match('/^[1-9]\d{0,9}$/', $v)) return (int)$v;
  return 0;
}

/** An optional text value: null when null or blank, refused when not a string or too long. */
function br_text($v, string $key, int $max, bool $oneLine = false): ?string {
  if ($v === null) return null;
  if (!is_string($v)) fail("Invalid $key.");
  if ($oneLine) $v = preg_replace('/[\r\n]+/', ' ', $v);
  $v = trim($v);
  if ($v === '') return null;
  if (mb_strlen($v) > $max) fail('Keep ' . str_replace('_', ' ', $key) . " to $max characters or fewer.");
  return $v;
}

/** An optional YYYY-MM-DD date that exists, or null. */
function br_date($v, string $key): ?string {
  if ($v === null || $v === '') return null;
  if (!is_string($v) || !preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $v, $m) || !checkdate((int)$m[2], (int)$m[3], (int)$m[1])) {
    fail("Give $key as a date (YYYY-MM-DD).");
  }
  return $v;
}

/** The live project, or 404. */
function br_project(mysqli $conn, int $pid): array {
  if ($pid <= 0) fail('A project id is required.');
  $s = br_stmt($conn, 'SELECT id, name, client_id FROM projects WHERE id = ? AND deleted_at IS NULL LIMIT 1');
  $s->bind_param('i', $pid);
  $s->execute();
  $p = $s->get_result()->fetch_assoc();
  if (!$p) fail('Project not found.', 404);
  return $p;
}

function br_brief(mysqli $conn, int $pid): ?array {
  $cols = implode(', ', array_keys(BRIEF_FIELDS));
  $s = br_stmt($conn, "SELECT $cols, completion_ack_on, updated_at FROM project_briefs WHERE project_id = ? LIMIT 1");
  $s->bind_param('i', $pid);
  $s->execute();
  return $s->get_result()->fetch_assoc() ?: null;
}

function br_measure_shape(array $r): array {
  $r['id'] = (int)$r['id'];
  $r['project_id'] = (int)$r['project_id'];
  return $r;
}

function br_measurements(mysqli $conn, int $pid): array {
  $s = br_stmt($conn, 'SELECT ' . implode(', ', MEASURE_COLS) . ' FROM project_measurements WHERE project_id = ? AND deleted_at IS NULL ORDER BY id ASC LIMIT 200');
  $s->bind_param('i', $pid);
  $s->execute();
  return array_map('br_measure_shape', $s->get_result()->fetch_all(MYSQLI_ASSOC));
}

/** One live measurement on this live project, or 404 (a mismatched project answers the same). */
function br_measure(mysqli $conn, int $id, int $pid): array {
  $s = br_stmt($conn, 'SELECT m.' . implode(', m.', MEASURE_COLS) . '
    FROM project_measurements m JOIN projects p ON p.id = m.project_id AND p.deleted_at IS NULL
    WHERE m.id = ? AND m.project_id = ? AND m.deleted_at IS NULL LIMIT 1');
  $s->bind_param('ii', $id, $pid);
  $s->execute();
  $r = $s->get_result()->fetch_assoc();
  if (!$r) fail('Measurement not found.', 404);
  return br_measure_shape($r);
}

/**
 * The measurement fields from a body, merged over $current (an existing row,
 * or the defaults for a new one). A key left out keeps its current value.
 */
function br_measure_fields(array $in, array $current): array {
  $out = $current;
  if (array_key_exists('label', $in)) {
    $label = br_text($in['label'], 'label', MEASURE_LABEL_MAX, true);
    if ($label === null) fail('A label is required.');
    $out['label'] = $label;
  }
  if ($out['label'] === null) fail('A label is required.');
  foreach (MEASURE_FIELDS as $key => $max) {
    if (array_key_exists($key, $in)) $out[$key] = br_text($in[$key], $key, $max, $key !== 'method');
  }
  if (array_key_exists('result', $in)) {
    if (!is_string($in['result']) || !in_array($in['result'], MEASURE_RESULTS, true)) fail('Result must be PASS, FAIL, PARTIAL or NOT TESTED.');
    $out['result'] = $in['result'];
  }
  if (array_key_exists('kind', $in)) {
    if (!is_string($in['kind']) || !in_array($in['kind'], MEASURE_KINDS, true)) fail('Kind must be technical or business.');
    $out['kind'] = $in['kind'];
  }
  if (array_key_exists('measured_on', $in)) $out['measured_on'] = br_date($in['measured_on'], 'measured_on');
  if ($out['kind'] === 'technical') {
    if (array_key_exists('observation_window', $in) && $out['observation_window'] !== null) {
      fail('An observation window is for business observations only.');
    }
    $out['observation_window'] = null; // a technical check has no window
  }
  return $out;
}

// ── Handoff Markdown ───────────────────────────────────────────────────────────

/** Remove control characters (keeping newline and tab) and bidirectional overrides. */
function md_clean(string $s): string {
  $s = str_replace(["\r\n", "\r"], "\n", $s);
  return preg_replace('/[\x00-\x08\x0B-\x1F\x7F]|\xE2\x80[\xAA-\xAE]|\xE2\x81[\xA6-\xA9]/', '', $s);
}

/** Escape inline Markdown and HTML, so the text is shown as typed. */
function md_inline(string $s): string {
  $s = preg_replace('/([\\\\`*_{}\[\]<>#|!~&])/', '\\\\$1', $s);
  // A line-leading list, heading-underline or numbered-list marker.
  $s = preg_replace('/^(\s*)([+=-])/', '$1\\\\$2', $s);
  return preg_replace('/^(\s*\d+)([.)])/', '$1\\\\$2', $s);
}

/** One line: newlines collapsed to spaces, then escaped. */
function md_line(string $s): string {
  return md_inline(trim(preg_replace('/\s*\n\s*/', ' ', md_clean($s))));
}

/** Multi-line text: each line escaped; "- " and "* " bullets kept as "- " items. */
function md_block(string $s): string {
  $lines = [];
  foreach (explode("\n", md_clean(trim($s))) as $line) {
    $line = rtrim($line);
    if (preg_match('/^\s*[-*]\s+(.*)$/', $line, $m)) $lines[] = '- ' . md_inline($m[1]);
    else $lines[] = md_inline(ltrim($line));
  }
  return implode("\n", $lines);
}

const REDACTED = '[client detail removed]';

/**
 * A pattern for a phone number by its digits: any spaces, dashes, dots or
 * brackets between them, and +44, 0044, 44 or a leading 0 as one prefix.
 * Null when the number has fewer than 6 digits, which is too little to match
 * safely.
 */
function md_phone_pattern(string $phone): ?string {
  $d = preg_replace('/\D+/', '', $phone);
  if (str_starts_with($d, '00')) $d = substr($d, 2);
  $uk = false;
  if (str_starts_with($d, '44')) { $d = substr($d, 2); $uk = true; }
  elseif (str_starts_with($d, '0')) { $d = substr($d, 1); $uk = true; }
  if (strlen($d) < 6) return null;
  $sep = '[\s\-.()]*';
  $prefix = $uk ? '(?:(?:\+|00)?\s*44(?:\s*\(\s*0\s*\))?|\(\s*0|0)' : '(?:\+|00)';
  // The separator after the prefix sits inside the optional group, so a bare
  // number never swallows the space in front of it.
  return '/(?<![\d+])(?:' . $prefix . $sep . ')?' . implode($sep, str_split($d)) . '(?!\d)/u';
}

/**
 * Staff text with this client's details, any email address and the
 * sensitive parts of links removed (see the file header). $known: the
 * client's company, contact_name, email and phone.
 */
function md_sanitise(?string $s, array $known): ?string {
  if ($s === null || trim($s) === '') return null;
  // Links first: drop the login, the query string and the fragment.
  $s = preg_replace('#\b([a-z][a-z0-9+.-]*://)(?:[^\s/?\#@]*@)?([^\s?\#]*)(?:\?[^\s\#]*)?(?:\#\S*)?#iu', '$1$2', $s);
  foreach (['company', 'contact_name', 'email'] as $key) {
    $k = trim((string)($known[$key] ?? ''));
    if (mb_strlen($k) < 3) continue;
    // Whole words only: no letter, digit or underscore either side.
    $s = preg_replace('/(?<![\p{L}\p{N}_])' . preg_quote($k, '/') . '(?![\p{L}\p{N}_])/iu', REDACTED, $s);
  }
  $phone = md_phone_pattern((string)($known['phone'] ?? ''));
  if ($phone !== null) $s = preg_replace($phone, REDACTED, $s);
  return preg_replace('/[\p{L}\p{N}._%+\'-]+@[\p{L}\p{N}.-]+\.\p{L}{2,}/iu', '[email removed]', $s);
}

function md_section(string $heading, ?string $body, bool $block = true): string {
  $text = $body === null ? '_Not recorded._' : ($block ? md_block($body) : md_line($body));
  return "## $heading\n\n$text\n\n";
}

/** Send a Markdown attachment, with the headers of ics_send() in _ics.php. */
function md_send(string $body, string $filename): void {
  http_response_code(200);
  header('Content-Type: text/markdown; charset=utf-8');
  header('Content-Disposition: attachment; filename="' . $filename . '"');
  header('Content-Length: ' . strlen($body));
  header('Cache-Control: private, no-store');
  header('X-Content-Type-Options: nosniff');
  echo $body;
  exit;
}

function br_handoff(mysqli $conn, array $project): string {
  $pid = (int)$project['id'];
  $clientId = $project['client_id'] !== null ? (int)$project['client_id'] : null;
  // Read only so the export can remove these values from staff-written text.
  // None of them is ever written to the export.
  $known = [];
  if ($clientId !== null) {
    $c = br_stmt($conn, 'SELECT company, contact_name, email, phone FROM clients WHERE id = ? LIMIT 1');
    $c->bind_param('i', $clientId);
    $c->execute();
    $known = $c->get_result()->fetch_assoc() ?: [];
  }
  $clean = fn(?string $s) => md_sanitise($s, $known);

  $s = br_stmt($conn, 'SELECT deliverables, exclusions, quote_reference, open_decisions, next_action FROM project_briefs WHERE project_id = ? LIMIT 1');
  $s->bind_param('i', $pid);
  $s->execute();
  $b = $s->get_result()->fetch_assoc() ?: [];

  $m = br_stmt($conn, 'SELECT label, target, method, result, evidence_location FROM project_measurements
    WHERE project_id = ? AND deleted_at IS NULL ORDER BY id ASC LIMIT 200');
  $m->bind_param('i', $pid);
  $m->execute();
  $measures = $m->get_result()->fetch_all(MYSQLI_ASSOC);

  $out = "# GEE OS handoff: project $pid\n\n";
  $out .= "Export from GAkinzOS on " . gmdate('Y-m-d') . ". It holds the project reference, approved scope, "
    . "acceptance criteria, decisions and evidence locations only, and no client record fields beyond the client ID.\n\n"
    . HANDOFF_NOTE . "\n\n";
  $out .= "## Project reference\n\n";
  $out .= "- Project ID: $pid\n";
  $out .= '- Project name: ' . md_line($clean($project['name']) ?? '') . "\n";
  $out .= '- Client ID: ' . ($clientId !== null ? (string)$clientId : 'none (internal project)') . "\n\n";

  $out .= "## Approved scope\n\n";
  $out .= "### Deliverables\n\n" . (($v = $clean($b['deliverables'] ?? null)) !== null ? md_block($v) : '_Not recorded._') . "\n\n";
  $out .= "### Exclusions\n\n" . (($v = $clean($b['exclusions'] ?? null)) !== null ? md_block($v) : '_Not recorded._') . "\n\n";
  $out .= "### Quote reference\n\n" . (($v = $clean($b['quote_reference'] ?? null)) !== null ? md_line($v) : '_Not recorded._') . "\n\n";

  $out .= "## Acceptance criteria\n\n";
  if (!$measures) {
    $out .= "_No measurements recorded._\n\n";
  } else {
    foreach ($measures as $i => $r) {
      $out .= ($i + 1) . '. ' . md_line($clean($r['label']) ?? '') . "\n";
      $out .= '   - Target: ' . (($v = $clean($r['target'])) !== null ? md_line($v) : 'not recorded') . "\n";
      $out .= '   - Method: ' . (($v = $clean($r['method'])) !== null ? md_line($v) : 'not recorded') . "\n";
      $out .= '   - Result: ' . (in_array($r['result'], MEASURE_RESULTS, true) ? $r['result'] : 'NOT TESTED') . "\n";
    }
    $out .= "\n";
  }

  $out .= md_section('Open decisions', $clean($b['open_decisions'] ?? null));
  $out .= md_section('Next action', $clean($b['next_action'] ?? null), false);

  $out .= "## Evidence locations\n\n";
  $evidence = [];
  foreach ($measures as $r) {
    $loc = $clean($r['evidence_location']);
    if ($loc !== null) $evidence[] = '- ' . md_line($clean($r['label']) ?? '') . ': ' . md_line($loc);
  }
  $out .= ($evidence ? implode("\n", $evidence) : '_None recorded._') . "\n";
  return $out;
}

// ── Routes ─────────────────────────────────────────────────────────────────────

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
  if ($method === 'GET') {
    $user = require_auth($conn, STAFF); // a client gets 403 here
    $project = br_project($conn, br_id($_GET['project_id'] ?? null));
    $pid = (int)$project['id'];

    if ($action === 'handoff') {
      // Both tables are read before anything is sent, so a missing SQL 16 is still a 503.
      $md = br_handoff($conn, $project);
      audit($conn, $user['id'], 'brief_handoff_export', "project #$pid");
      md_send($md, "gakinz-handoff-project-$pid.md");
    }
    if ($action !== '') fail('Unknown action.');

    ok([
      'project'      => ['id' => $pid, 'name' => $project['name'], 'client_id' => $project['client_id'] !== null ? (int)$project['client_id'] : null],
      'brief'        => br_brief($conn, $pid),
      'measurements' => br_measurements($conn, $pid),
    ]);
  }

  if ($method !== 'POST') fail('Method not allowed.', 405);
  $user = require_auth($conn, STAFF); // a client gets 403 on every action below
  if (!in_array($action, ['save', 'measure_create', 'measure_update', 'measure_delete'], true)) fail('Unknown action.');
  $in = body();
  $project = br_project($conn, br_id($in['project_id'] ?? null));
  $pid = (int)$project['id'];
  $uid = (int)$user['id'];

  if ($action === 'save') {
    // Only the fields present in the body are written; the rest keep their value.
    $cols = [];
    $vals = [];
    foreach (BRIEF_FIELDS as $key => $max) {
      if (!array_key_exists($key, $in)) continue;
      $cols[] = $key;
      $vals[] = br_text($in[$key], $key, $max, in_array($key, BRIEF_ONE_LINE, true));
    }
    if (array_key_exists('completion_ack_on', $in)) {
      $cols[] = 'completion_ack_on';
      $vals[] = br_date($in['completion_ack_on'], 'completion_ack_on');
    }
    $cols[] = 'updated_by';
    $vals[] = $uid;
    // Column names come from the constants above, never from the request.
    // VALUES(c), not the MySQL 8 row alias: MariaDB has no alias form (MySQL 8 only warns).
    $sql = 'INSERT INTO project_briefs (project_id, ' . implode(', ', $cols) . ') VALUES (?' . str_repeat(', ?', count($cols)) . ')
      ON DUPLICATE KEY UPDATE ' . implode(', ', array_map(fn($c) => "$c = VALUES($c)", $cols));
    $types = 'i';
    foreach ($cols as $c) $types .= $c === 'updated_by' ? 'i' : 's';
    $s = br_stmt($conn, $sql);
    $s->bind_param($types, $pid, ...$vals);
    $s->execute();
    $changed = array_values(array_diff($cols, ['updated_by']));
    audit($conn, $uid, 'brief_save', "project #$pid" . ($changed ? ': ' . implode(', ', $changed) : ''));
    ok(br_brief($conn, $pid));
  }

  if ($action === 'measure_create') {
    $f = br_measure_fields($in, array_merge(
      ['label' => null, 'result' => 'NOT TESTED', 'kind' => 'technical', 'measured_on' => null],
      array_fill_keys(array_keys(MEASURE_FIELDS), null),
    ));
    $n = br_stmt($conn, 'SELECT COUNT(*) AS n FROM project_measurements WHERE project_id = ? AND deleted_at IS NULL');
    $n->bind_param('i', $pid);
    $n->execute();
    if ((int)$n->get_result()->fetch_assoc()['n'] >= MEASURES_PER_PROJECT_MAX) {
      fail('A project can hold up to ' . MEASURES_PER_PROJECT_MAX . ' measurements.', 409);
    }
    $s = br_stmt($conn, 'INSERT INTO project_measurements (project_id, label, target, baseline, actual, result, measured_on,
      environment, method, evidence_location, kind, observation_window, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $s->bind_param('isssssssssssi', $pid, $f['label'], $f['target'], $f['baseline'], $f['actual'], $f['result'], $f['measured_on'],
      $f['environment'], $f['method'], $f['evidence_location'], $f['kind'], $f['observation_window'], $uid);
    $s->execute();
    $id = $conn->insert_id; // read before audit(), which inserts its own row
    audit($conn, $uid, 'measure_create', "#$id project #$pid");
    ok(br_measure($conn, $id, $pid), 201);
  }

  $id = br_id($in['id'] ?? null);
  if ($id <= 0) fail('A measurement id is required.');
  $current = br_measure($conn, $id, $pid); // 404 when it is not on this project

  if ($action === 'measure_update') {
    $f = br_measure_fields($in, $current);
    $s = br_stmt($conn, 'UPDATE project_measurements SET label = ?, target = ?, baseline = ?, actual = ?, result = ?, measured_on = ?,
      environment = ?, method = ?, evidence_location = ?, kind = ?, observation_window = ?
      WHERE id = ? AND project_id = ? AND deleted_at IS NULL');
    $s->bind_param('sssssssssssii', $f['label'], $f['target'], $f['baseline'], $f['actual'], $f['result'], $f['measured_on'],
      $f['environment'], $f['method'], $f['evidence_location'], $f['kind'], $f['observation_window'], $id, $pid);
    $s->execute();
    audit($conn, $uid, 'measure_update', "#$id project #$pid result " . $f['result']);
    ok(br_measure($conn, $id, $pid));
  }

  // measure_delete
  $s = br_stmt($conn, 'UPDATE project_measurements SET deleted_at = NOW() WHERE id = ? AND project_id = ? AND deleted_at IS NULL');
  $s->bind_param('ii', $id, $pid);
  $s->execute();
  if ($s->affected_rows < 1) fail('Measurement not found.', 404);
  audit($conn, $uid, 'measure_delete', "#$id project #$pid");
  ok(['ok' => true]);
} catch (mysqli_sql_exception $e) {
  if ($e->getCode() === 1146) fail(BRIEF_MIGRATION, 503); // ER_NO_SUCH_TABLE: SQL 16 has not run
  throw $e;
}
