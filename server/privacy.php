<?php
/**
 * Privacy tools (docs/PRIVACY-READINESS.md sections 6 and 7, K-062).
 *
 *   GET /privacy.php?action=export&client_id=N          super_admin, admin
 *   GET /privacy.php?action=export&enquiry_email=a@b.c  super_admin, admin
 *   GET /privacy.php?action=retention_report            super_admin
 *   GET /privacy.php?action=erase_preview&id=N          super_admin
 *   POST /privacy.php?action=erase_enquiry {id, confirm}  super_admin
 *
 * ── Subject access export ──────────────────────────────────────────────────
 * Answers a JSON file as an attachment (application/json, Cache-Control:
 * private, no-store, nosniff) holding every row the system keeps about one
 * client or one enquirer, soft-deleted rows included, so the owner can answer
 * an access or portability request without gathering about 15 tables by hand.
 * An unknown client or an email with no enquiry answers 404. Every export is
 * audited as who exported whom; the exported content never goes in the audit.
 *
 * Included for a client (each query names its columns, so nothing else leaks):
 *   clients            the client record, including staff notes
 *   users              the client's portal logins: name, email, role, status,
 *                      whether 2FA is on, dates
 *   sessions           those logins' sessions: device, IP, last seen, expiry
 *   magic_links, password_resets   when each was issued, used and expired
 *   enquiries          the enquiry the client came from, and any enquiry sent
 *                      from the client's or a login's email address
 *   bookings, booking_events       calls with the client or on those enquiries
 *   projects, tasks, project_assets
 *   proposals, proposal_items
 *   invoices, invoice_items, payment_events
 *   tickets, ticket_replies        portal messages and every reply
 *   client_feedback    including the owner's follow-up note
 *   contracts          including signer details and the signing IP
 *   files              metadata only: name, type, size, portal sharing (SQL 18), dates. Never the bytes.
 *   comm_threads, comm_messages    Comms conversations filed against the client
 *   audit_log          rows written by the client's logins, and rows whose text
 *                      names the client's or a login's email address. On a row
 *                      someone else wrote, user_id and ip are null: the export
 *                      says what was done to the subject, not which member of
 *                      staff did it or from where.
 *
 * Included for an enquiry email: every enquiry from that address, the calls on
 * those enquiries and their history, and audit rows that name the address. The
 * ids of any client record using the same address are listed so the owner can
 * run the client export too; that client's data is not included.
 *
 * Excluded, always: password hashes, session, magic-link and reset token values
 * or hashes, 2FA secrets, recovery codes and replay counters, proposal and file
 * share-link tokens, on-disk file names, API keys and every other config value,
 * the author and IP of any audit row not written by the subject's own logins,
 * and every row of any other client. Not covered because nothing links them to
 * a client record: certificates and testimonials (matched by name only), and
 * staff-only records (time entries, leave, resourcing).
 *
 * ── Retention dry run ──────────────────────────────────────────────────────
 * Counts what each proposed retention rule would affect (_retention.php). It
 * reads only.
 *
 * ── Erasing a prospect's enquiry ───────────────────────────────────────────
 * The only deleting route here. A super admin erases ONE enquiry that never
 * became a client, typing its email address as `confirm` (case and outer
 * spaces aside). _erasure.php does the work in one transaction: the enquiry,
 * its calls and their history go, and the audit rows naming the enquirer's
 * address have that address and name replaced with "[erased]". One audit row
 * "enquiry_erase #id" records it, with no personal data. Answers 404 for an
 * unknown enquiry, 400 when `confirm` does not match, and 409, changing
 * nothing, for an enquiry that was won, converted, has a call filed against a
 * client, or whose address is also a client's, a user's or a contract
 * signer's. Nothing else in this file deletes, updates or anonymises a row.
 */
require __DIR__ . '/_bootstrap.php';
// pv_rows() tells a missing table or column apart by its exception, so every
// SQL failure must throw, as PHP 8.1 and later do by default. Set here so an
// older PHP behaves the same and never exports a section it failed to read.
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

const EXPORT_ROLES = ['super_admin', 'admin'];
const RETENTION_ROLES = ['super_admin'];
const ERASE_ROLES = ['super_admin'];

const PV_EXCLUDED = [
  'Password hashes',
  'Session, magic-link and password-reset token values and hashes',
  'Two-factor secrets, recovery codes and replay counters',
  'Proposal and file share-link tokens, and on-disk file names',
  'File contents (only file metadata is included)',
  'API keys and every other server configuration value',
  'Any row belonging to another client',
  'On audit entries not written by the subject\'s own logins: who wrote them and from which IP',
];

function pv_id($v): int {
  if (is_string($v) && preg_match('/^[1-9]\d{0,9}$/', $v)) return (int)$v;
  return 0;
}

/**
 * Rows for one section of the export. `$fallback` is the same query over the
 * columns every deployed database has, used when an SQL step adding a newer
 * column has not run (1054). A missing table (1146) records the section as
 * unavailable instead of failing the whole export.
 */
function pv_rows(mysqli $conn, array &$unavailable, string $section, string $sql, string $types = '', array $params = [], ?string $fallback = null): array {
  foreach ($fallback !== null ? [$sql, $fallback] : [$sql] as $i => $q) {
    try {
      $s = $conn->prepare($q);
      if ($types !== '') $s->bind_param($types, ...$params);
      $s->execute();
      return $s->get_result()->fetch_all(MYSQLI_ASSOC);
    } catch (mysqli_sql_exception $e) {
      if ($e->getCode() === 1054 && $fallback !== null && $i === 0) continue;
      if ($e->getCode() === 1146) { $unavailable[] = $section; return []; }
      throw $e;
    }
  }
  return [];
}

/** `IN (?, ?, ...)` for a list of ints, or null when the list is empty. */
function pv_in(array $ids): ?string {
  return $ids ? '(' . implode(', ', array_fill(0, count($ids), '?')) . ')' : null;
}

/** Rows whose `$col` is in `$ids`; none when `$ids` is empty. */
function pv_rows_in(mysqli $conn, array &$unavailable, string $section, string $sqlPrefix, array $ids, ?string $fallbackPrefix = null): array {
  $in = pv_in($ids);
  if ($in === null) return [];
  $types = str_repeat('i', count($ids));
  return pv_rows($conn, $unavailable, $section, $sqlPrefix . $in . ' ORDER BY id', $types, $ids,
    $fallbackPrefix !== null ? $fallbackPrefix . $in . ' ORDER BY id' : null);
}

function pv_ids(array $rows, string $col = 'id'): array {
  return array_values(array_unique(array_map(fn($r) => (int)$r[$col], $rows)));
}

/**
 * Audit rows about the subject:
 *   - rows written by `$userIds` (the client's own logins);
 *   - rows whose text names one of `$emails`;
 *   - rows that name the subject by record id, in the formats the endpoints
 *     write: client_update "#C", lead_convert "lead #E → client #C",
 *     client_create "<company>", user_role/user_rate/user_status "#U", and
 *     lead_status/lead_meta "#E".
 * LIKE or an exact action finds candidates; a regex then keeps only a whole
 * match, so a@x.test never pulls in ba@x.test or a@x.test.uk, and #1 never
 * pulls in #12, all of which belong to someone else.
 */
function pv_audit(mysqli $conn, array &$unavailable, array $emails, array $userIds, ?int $clientId = null, ?string $company = null, array $enquiryIds = []): array {
  $cols = 'SELECT id, user_id, action, detail, ip, created_at FROM audit_log';
  $byId = [];
  foreach (pv_rows_in($conn, $unavailable, 'audit_log', "$cols WHERE user_id IN ", $userIds) as $r) {
    $byId[(int)$r['id']] = $r;
  }
  // [WHERE clause, types, params, regex the detail must match]
  $checks = [];
  foreach ($emails as $email) {
    $checks[] = ['detail LIKE ?', 's', ['%' . addcslashes($email, '%_\\') . '%'],
      '/(?<![A-Za-z0-9._%+\-])' . preg_quote($email, '/') . '(?![A-Za-z0-9_\-]|\.[A-Za-z0-9])/i'];
  }
  if ($clientId !== null) {
    $checks[] = ["action = 'client_update' AND detail LIKE ?", 's', ["#$clientId%"], "/^#$clientId(?!\\d)/"];
    $checks[] = ["action = 'lead_convert' AND detail LIKE ?", 's', ["%client #$clientId%"], "/\\bclient #$clientId(?!\\d)/"];
  }
  if ($company !== null && trim($company) !== '') {
    $checks[] = ["action = 'client_create' AND detail = ?", 's', [trim($company)], '/^' . preg_quote(trim($company), '/') . '$/iu'];
  }
  foreach ($userIds as $uid) {
    $checks[] = ["action IN ('user_role', 'user_rate', 'user_status') AND detail LIKE ?", 's', ["#$uid%"], "/^#$uid(?!\\d)/"];
  }
  foreach ($enquiryIds as $eid) {
    $checks[] = ["action IN ('lead_status', 'lead_meta') AND detail LIKE ?", 's', ["#$eid%"], "/^#$eid(?!\\d)/"];
    $checks[] = ["action = 'lead_convert' AND detail LIKE ?", 's', ["lead #$eid%"], "/^lead #$eid(?!\\d)/"];
  }
  foreach ($checks as [$where, $types, $params, $re]) {
    foreach (pv_rows($conn, $unavailable, 'audit_log', "$cols WHERE $where ORDER BY id", $types, $params) as $r) {
      if (preg_match($re, (string)$r['detail'])) $byId[(int)$r['id']] = $r;
    }
  }
  ksort($byId);
  // A row someone else wrote (staff updating the client, converting the
  // enquiry) is about the subject but its author is not: keep what was done
  // and when, and drop who did it and from which IP.
  $own = array_flip(array_map('intval', $userIds));
  foreach ($byId as &$r) {
    if ($r['user_id'] === null || !isset($own[(int)$r['user_id']])) {
      $r['user_id'] = null;
      $r['ip'] = null;
    }
  }
  unset($r);
  return array_values($byId);
}

function pv_bookings(mysqli $conn, array &$unavailable, ?int $clientId, array $enquiryIds): array {
  $cols = 'SELECT id, enquiry_id, client_id, starts_at, timezone, duration_min, location, status, notes, outcome, created_at, updated_at, deleted_at FROM bookings';
  $where = []; $types = ''; $params = [];
  if ($clientId !== null) { $where[] = 'client_id = ?'; $types .= 'i'; $params[] = $clientId; }
  if ($enquiryIds) { $where[] = 'enquiry_id IN ' . pv_in($enquiryIds); $types .= str_repeat('i', count($enquiryIds)); array_push($params, ...$enquiryIds); }
  if (!$where) return [[], []];
  $bookings = pv_rows($conn, $unavailable, 'bookings', "$cols WHERE " . implode(' OR ', $where) . ' ORDER BY id', $types, $params);
  $events = pv_rows_in($conn, $unavailable, 'booking_events',
    'SELECT id, booking_id, kind, from_status, to_status, from_starts_at, from_timezone, to_starts_at, to_timezone, notify_status, notify_to, notified_at, created_at FROM booking_events WHERE booking_id IN ',
    pv_ids($bookings));
  return [$bookings, $events];
}

const PV_ENQUIRY_COLS = 'id, name, email, company, budget, project_type, message, source, status, tags, score, lost_reason, next_action_at, next_action_note, priority, ip, created_at, updated_at, deleted_at';
const PV_ENQUIRY_BASE = 'id, name, email, company, budget, project_type, message, source, status, ip, created_at, updated_at, deleted_at';

function pv_client_export(mysqli $conn, int $cid, array &$unavailable): array {
  $client = pv_rows($conn, $unavailable, 'clients',
    'SELECT id, company, contact_name, email, phone, tag, retainer_amount, notes, source_lead_id, created_at, updated_at, deleted_at FROM clients WHERE id = ?',
    'i', [$cid])[0] ?? null;
  if (!$client) fail('Client not found.', 404);

  $users = pv_rows($conn, $unavailable, 'users',
    'SELECT id, name, email, role, status, totp_enabled, created_at, updated_at, deleted_at FROM users WHERE client_id = ? ORDER BY id', 'i', [$cid]);
  $userIds = pv_ids($users);

  $emails = [];
  foreach (array_merge([$client['email'] ?? ''], array_column($users, 'email')) as $e) {
    $e = strtolower(trim((string)$e));
    if ($e !== '') $emails[$e] = true;
  }
  $emails = array_keys($emails);

  // The source enquiry, and any enquiry from one of the client's addresses.
  $where = []; $types = ''; $params = [];
  if ($client['source_lead_id'] !== null) { $where[] = 'id = ?'; $types .= 'i'; $params[] = (int)$client['source_lead_id']; }
  foreach ($emails as $e) { $where[] = 'LOWER(TRIM(email)) = ?'; $types .= 's'; $params[] = $e; }
  $enquiries = $where
    ? pv_rows($conn, $unavailable, 'enquiries', 'SELECT ' . PV_ENQUIRY_COLS . ' FROM enquiries WHERE ' . implode(' OR ', $where) . ' ORDER BY id', $types, $params,
        'SELECT ' . PV_ENQUIRY_BASE . ' FROM enquiries WHERE ' . implode(' OR ', $where) . ' ORDER BY id')
    : [];
  [$bookings, $bookingEvents] = pv_bookings($conn, $unavailable, $cid, pv_ids($enquiries));

  $projects = pv_rows($conn, $unavailable, 'projects',
    'SELECT id, name, status, stage, due_date, created_at, updated_at, deleted_at FROM projects WHERE client_id = ? ORDER BY id', 'i', [$cid]);
  $projectIds = pv_ids($projects);

  $proposals = pv_rows($conn, $unavailable, 'proposals',
    'SELECT id, title, status, currency, vat_rate, views, last_viewed_at, notes, valid_until, project_id, accepted_at, acceptance_method,
            acceptance_reference, acceptance_received_on, accepted_terms_sha256, created_at, updated_at, deleted_at
       FROM proposals WHERE client_id = ? ORDER BY id', 'i', [$cid],
    'SELECT id, title, status, currency, vat_rate, views, last_viewed_at, notes, valid_until, project_id, created_at, updated_at, deleted_at
       FROM proposals WHERE client_id = ? ORDER BY id');

  $invoices = pv_rows($conn, $unavailable, 'invoices',
    'SELECT id, number, project_id, status, currency, vat_rate, notes, issued_at, due_at, paid_at, paid_method, paid_reference, paid_amount_pence,
            created_at, updated_at, deleted_at FROM invoices WHERE client_id = ? ORDER BY id', 'i', [$cid],
    'SELECT id, number, project_id, status, currency, vat_rate, notes, issued_at, due_at, paid_at, created_at, updated_at, deleted_at
       FROM invoices WHERE client_id = ? ORDER BY id');
  $invoiceIds = pv_ids($invoices);

  $tickets = pv_rows($conn, $unavailable, 'tickets',
    'SELECT id, subject, body, status, priority, created_at, updated_at, deleted_at FROM tickets WHERE client_id = ? ORDER BY id', 'i', [$cid]);

  $fileWhere = 'client_id = ?'; $fileTypes = 'i'; $fileParams = [$cid];
  if ($projectIds) { $fileWhere .= ' OR project_id IN ' . pv_in($projectIds); $fileTypes .= str_repeat('i', count($projectIds)); array_push($fileParams, ...$projectIds); }

  // Conversations filed against the client, or against one of its projects.
  $threadWhere = 'client_id = ?'; $threadTypes = 'i'; $threadParams = [$cid];
  if ($projectIds) { $threadWhere .= ' OR project_id IN ' . pv_in($projectIds); $threadTypes .= str_repeat('i', count($projectIds)); array_push($threadParams, ...$projectIds); }
  $threads = pv_rows($conn, $unavailable, 'comm_threads',
    "SELECT id, subject, project_id, channel, status, last_message_at, created_at, updated_at, deleted_at FROM comm_threads WHERE $threadWhere ORDER BY id",
    $threadTypes, $threadParams);

  // client_create audit rows carry only the company name, so they are matched
  // only when no other client has the same name: they could be either's.
  $sameName = pv_rows($conn, $unavailable, 'clients', 'SELECT COUNT(*) AS n FROM clients WHERE LOWER(TRIM(company)) = LOWER(TRIM(?))', 's', [(string)$client['company']]);
  $company = ((int)($sameName[0]['n'] ?? 0)) === 1 ? (string)$client['company'] : null;

  return [
    'client' => $client,
    'users' => $users,
    'sessions' => pv_rows_in($conn, $unavailable, 'sessions',
      'SELECT id, user_id, user_agent, ip, last_seen_at, expires_at, created_at FROM auth_tokens WHERE user_id IN ', $userIds,
      'SELECT id, user_id, expires_at, created_at FROM auth_tokens WHERE user_id IN '),
    'magic_links' => pv_rows_in($conn, $unavailable, 'magic_links', 'SELECT id, user_id, expires_at, used_at, created_at FROM magic_links WHERE user_id IN ', $userIds),
    'password_resets' => pv_rows_in($conn, $unavailable, 'password_resets', 'SELECT id, user_id, expires_at, used_at, created_at FROM password_resets WHERE user_id IN ', $userIds),
    'enquiries' => $enquiries,
    'bookings' => $bookings,
    'booking_events' => $bookingEvents,
    'projects' => $projects,
    'tasks' => pv_rows_in($conn, $unavailable, 'tasks', 'SELECT id, project_id, title, status, due_date, created_at, updated_at, deleted_at FROM tasks WHERE project_id IN ', $projectIds),
    'project_assets' => pv_rows_in($conn, $unavailable, 'project_assets',
      'SELECT id, project_id, label, note, status, client_note, supplied_at, accepted_at, created_at, updated_at, deleted_at FROM project_assets WHERE project_id IN ', $projectIds),
    'proposals' => $proposals,
    'proposal_items' => pv_rows_in($conn, $unavailable, 'proposal_items', 'SELECT id, proposal_id, description, qty, unit_price FROM proposal_items WHERE proposal_id IN ', pv_ids($proposals)),
    'invoices' => $invoices,
    'invoice_items' => pv_rows_in($conn, $unavailable, 'invoice_items', 'SELECT id, invoice_id, description, qty, unit_price FROM invoice_items WHERE invoice_id IN ', $invoiceIds),
    'payment_events' => pv_rows_in($conn, $unavailable, 'payment_events',
      'SELECT id, provider, event_id, invoice_id, amount_minor, currency, outcome, created_at FROM payment_events WHERE invoice_id IN ', $invoiceIds),
    'tickets' => $tickets,
    'ticket_replies' => pv_rows_in($conn, $unavailable, 'ticket_replies', 'SELECT id, ticket_id, user_id, body, created_at FROM ticket_replies WHERE ticket_id IN ', pv_ids($tickets)),
    'client_feedback' => pv_rows($conn, $unavailable, 'client_feedback',
      'SELECT id, project_id, source, rating, went_well, could_improve, follow_up_ok, may_publish, attribution, follow_up, owner_note, created_at, updated_at, deleted_at
         FROM client_feedback WHERE client_id = ? ORDER BY id', 'i', [$cid]),
    'contracts' => pv_rows($conn, $unavailable, 'contracts',
      'SELECT id, project_id, kind, title, body, status, nda_triage, signer_name, signer_email, signed_name, signed_ip, signed_at, created_at, updated_at, deleted_at
         FROM contracts WHERE client_id = ? ORDER BY id', 'i', [$cid]),
    // client_visible and shared_at (SQL 18) say whether staff shared the file to the portal.
    'files' => pv_rows($conn, $unavailable, 'files',
      "SELECT id, project_id, name, mime, size, client_visible, shared_at, expires_at, created_at, deleted_at FROM files WHERE $fileWhere ORDER BY id", $fileTypes, $fileParams,
      "SELECT id, project_id, name, mime, size, expires_at, created_at, deleted_at FROM files WHERE $fileWhere ORDER BY id"),
    'comm_threads' => $threads,
    'comm_messages' => pv_rows_in($conn, $unavailable, 'comm_messages', 'SELECT id, thread_id, direction, body, created_at FROM comm_messages WHERE thread_id IN ', pv_ids($threads)),
    'audit_log' => pv_audit($conn, $unavailable, $emails, $userIds, $cid, $company, pv_ids($enquiries)),
  ];
}

function pv_enquiry_export(mysqli $conn, string $email, array &$unavailable): array {
  $enquiries = pv_rows($conn, $unavailable, 'enquiries',
    'SELECT ' . PV_ENQUIRY_COLS . ' FROM enquiries WHERE LOWER(TRIM(email)) = ? ORDER BY id', 's', [$email],
    'SELECT ' . PV_ENQUIRY_BASE . ' FROM enquiries WHERE LOWER(TRIM(email)) = ? ORDER BY id');
  if (!$enquiries) fail('No enquiry uses that email address.', 404);
  [$bookings, $bookingEvents] = pv_bookings($conn, $unavailable, null, pv_ids($enquiries));

  // Point at, but do not include, a client record that uses the same address.
  $clientIds = pv_ids(pv_rows($conn, $unavailable, 'clients',
    "SELECT id FROM clients WHERE LOWER(TRIM(email)) = ?
     UNION SELECT client_id AS id FROM users WHERE client_id IS NOT NULL AND LOWER(TRIM(email)) = ?", 'ss', [$email, $email]));
  sort($clientIds);

  return [
    'enquiries' => $enquiries,
    'bookings' => $bookings,
    'booking_events' => $bookingEvents,
    'audit_log' => pv_audit($conn, $unavailable, [$email], [], null, null, pv_ids($enquiries)),
    'matching_client_ids' => $clientIds,
  ];
}

/**
 * The export as JSON text, or a 500. Pretty-printed so the person who asked
 * can read it; the whole document is built in memory, which suits this
 * business's volumes (a client's rows run to hundreds, not millions).
 */
function pv_encode(array $doc): string {
  $body = json_encode($doc, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
  if ($body === false) {
    error_log('privacy.php export: json_encode failed: ' . json_last_error_msg());
    fail('Could not build the export.', 500);
  }
  return $body;
}

/** Streams the encoded export as an attachment and ends the request. */
function pv_send(string $body, string $filename): void {
  http_response_code(200);
  header('Content-Type: application/json; charset=utf-8');
  header('Content-Disposition: attachment; filename="' . $filename . '"');
  header('Content-Length: ' . strlen($body));
  header('Cache-Control: private, no-store');
  header('X-Content-Type-Options: nosniff');
  // Lets the CMS read the file name when the API is on another origin.
  header('Access-Control-Expose-Headers: Content-Disposition');
  echo $body;
  exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($method === 'GET' && $action === 'export') {
  $me = require_auth($conn, EXPORT_ROLES);
  $hasClient = isset($_GET['client_id']);
  $hasEmail = isset($_GET['enquiry_email']);
  if ($hasClient === $hasEmail) fail('Give either client_id or enquiry_email.');
  $unavailable = [];

  try {
    if ($hasClient) {
      $cid = pv_id($_GET['client_id']);
      if ($cid <= 0) fail('Invalid client id.');
      $data = pv_client_export($conn, $cid, $unavailable);
      $subject = ['type' => 'client', 'client_id' => $cid];
      $auditDetail = "client #$cid";
      $filename = "gakinz-data-export-client-$cid-" . gmdate('Y-m-d') . '.json';
    } else {
      $email = strtolower(trim((string)$_GET['enquiry_email']));
      if ($email === '' || strlen($email) > 200 || !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Invalid email address.');
      $data = pv_enquiry_export($conn, $email, $unavailable);
      $subject = ['type' => 'enquiry_email', 'email' => $email];
      // Who was exported, by record id: the address itself stays out of the audit.
      $auditDetail = mb_substr('enquiry email: enquiries #' . implode(', #', pv_ids($data['enquiries'])), 0, 480);
      $filename = 'gakinz-data-export-enquiry-' . gmdate('Y-m-d') . '.json';
    }

    $body = pv_encode([
      'about' => [
        'generated_at' => gmdate('Y-m-d\TH:i:s\Z'),
        'subject' => $subject,
        'note' => 'Every row GAkinz holds about this subject, soft-deleted rows included. File contents are not included.',
        'excluded' => PV_EXCLUDED,
        'unavailable' => array_values(array_unique($unavailable)),
      ],
      'data' => $data,
    ]);
    // Audited only once the file exists, just before it is sent.
    audit($conn, $me['id'], 'privacy_export', $auditDetail);
  } catch (mysqli_sql_exception $e) {
    error_log('privacy.php export: SQL error ' . $e->getCode() . ': ' . $e->getMessage());
    fail('Could not build the export.', 500);
  }
  pv_send($body, $filename);
}

if ($method === 'GET' && $action === 'retention_report') {
  require_auth($conn, RETENTION_ROLES);
  require_once __DIR__ . '/_retention.php';
  try {
    $report = retention_report($conn);
  } catch (mysqli_sql_exception $e) {
    error_log('privacy.php retention_report: SQL error ' . $e->getCode() . ': ' . $e->getMessage());
    fail('Could not build the retention report.', 500);
  }
  ok($report);
}

/**
 * Loads _erasure.php and the shared files it needs, or answers 503 when any
 * of them is not on the server yet, so this file never fails as a whole.
 */
function pv_erasure_lib(): void {
  foreach (['_erasure.php', '_retention.php', '_uploads.php', '_like.php'] as $f) {
    if (!is_file(__DIR__ . '/' . $f)) fail('Not available on this server yet.', 503);
  }
  require_once __DIR__ . '/_erasure.php';
}

// What the erase dialog shows first: other enquiries using the same address,
// and whether an erasure would be refused. Read only, super admin only.
if ($method === 'GET' && $action === 'erase_preview') {
  require_auth($conn, ERASE_ROLES);
  $id = pv_id($_GET['id'] ?? '');
  if ($id <= 0) fail('Invalid enquiry id.');
  pv_erasure_lib();
  try {
    $p = er_enquiry_preview($conn, $id);
  } catch (mysqli_sql_exception $e) {
    error_log('privacy.php erase_preview: SQL error ' . $e->getCode() . ': ' . $e->getMessage());
    fail('Could not check the enquiry.', 500);
  }
  if ($p === null) fail('Enquiry not found.', 404);
  ok($p);
}

if ($method === 'POST' && $action === 'erase_enquiry') {
  $me = require_auth($conn, ERASE_ROLES);
  $in = body();
  $rawId = $in['id'] ?? null;
  $id = is_int($rawId) && $rawId > 0 ? $rawId : (is_string($rawId) ? pv_id($rawId) : 0);
  if ($id <= 0) fail('Invalid enquiry id.');
  $confirm = $in['confirm'] ?? null;
  if (!is_string($confirm) || trim($confirm) === '' || strlen($confirm) > 300) {
    fail('Type the enquiry\'s email address to confirm.');
  }
  pv_erasure_lib();
  try {
    // The audit row is written inside the same transaction, by record id only.
    $r = er_erase_enquiry($conn, $id, $confirm, null, [(int)$me['id'], 'enquiry_erase', "#$id"]);
  } catch (mysqli_sql_exception | RuntimeException $e) {
    error_log('privacy.php erase_enquiry: ' . get_class($e) . ' ' . $e->getCode() . ': ' . $e->getMessage());
    fail('Could not erase the enquiry. Nothing was changed.', 500);
  }
  if ($r['status'] === 'not_found') fail('Enquiry not found.', 404);
  if ($r['status'] === 'mismatch') fail('That does not match this enquiry\'s email address. Nothing was erased.');
  if ($r['status'] === 'blocked') fail($r['message'], 409, ['reason' => $r['problem']]);
  ok(['erased' => true, 'id' => $id, 'bookings' => $r['bookings'], 'booking_events' => $r['booking_events'], 'audit_scrubbed' => $r['audit_scrubbed']]);
}

if ($method === 'GET') fail('Unknown action.');
fail('Method not allowed.', 405);
