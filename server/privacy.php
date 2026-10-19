<?php
/**
 * Privacy tools (docs/PRIVACY-READINESS.md sections 6 and 7, K-062).
 *
 *   GET /privacy.php?action=export&client_id=N          super_admin, admin
 *   GET /privacy.php?action=export&enquiry_email=a@b.c  super_admin, admin
 *   GET /privacy.php?action=retention_report            super_admin
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
 *   files              metadata only: name, type, size, dates. Never the bytes.
 *   comm_threads, comm_messages    Comms conversations filed against the client
 *   audit_log          rows written by the client's logins, and rows whose text
 *                      names the client's or a login's email address
 *
 * Included for an enquiry email: every enquiry from that address, the calls on
 * those enquiries and their history, and audit rows that name the address. The
 * ids of any client record using the same address are listed so the owner can
 * run the client export too; that client's data is not included.
 *
 * Excluded, always: password hashes, session, magic-link and reset token values
 * or hashes, 2FA secrets, recovery codes and replay counters, proposal and file
 * share-link tokens, on-disk file names, API keys and every other config value,
 * and every row of any other client. Not covered because nothing links them to
 * a client record: certificates and testimonials (matched by name only), and
 * staff-only records (time entries, leave, resourcing).
 *
 * ── Retention dry run ──────────────────────────────────────────────────────
 * Counts what each proposed retention rule would affect (_retention.php). It
 * reads only. Nothing in this file deletes, updates or anonymises a row.
 */
require __DIR__ . '/_bootstrap.php';

const EXPORT_ROLES = ['super_admin', 'admin'];
const RETENTION_ROLES = ['super_admin'];

const PV_EXCLUDED = [
  'Password hashes',
  'Session, magic-link and password-reset token values and hashes',
  'Two-factor secrets, recovery codes and replay counters',
  'Proposal and file share-link tokens, and on-disk file names',
  'File contents (only file metadata is included)',
  'API keys and every other server configuration value',
  'Any row belonging to another client',
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
 * Audit rows that name one of `$emails`, plus rows by `$userIds`. LIKE finds
 * candidates; the regex then keeps only a whole-address match, so a@x.test
 * never pulls in ba@x.test or a@x.test.uk, which belong to someone else.
 */
function pv_audit(mysqli $conn, array &$unavailable, array $emails, array $userIds): array {
  $byId = [];
  foreach (pv_rows_in($conn, $unavailable, 'audit_log', 'SELECT id, user_id, action, detail, ip, created_at FROM audit_log WHERE user_id IN ', $userIds) as $r) {
    $byId[(int)$r['id']] = $r;
  }
  foreach ($emails as $email) {
    $like = '%' . addcslashes($email, '%_\\') . '%';
    $re = '/(?<![A-Za-z0-9._%+\-])' . preg_quote($email, '/') . '(?![A-Za-z0-9_\-]|\.[A-Za-z0-9])/i';
    foreach (pv_rows($conn, $unavailable, 'audit_log', 'SELECT id, user_id, action, detail, ip, created_at FROM audit_log WHERE detail LIKE ? ORDER BY id', 's', [$like]) as $r) {
      if (preg_match($re, (string)$r['detail'])) $byId[(int)$r['id']] = $r;
    }
  }
  ksort($byId);
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

  $threads = pv_rows($conn, $unavailable, 'comm_threads',
    'SELECT id, subject, project_id, channel, status, last_message_at, created_at, updated_at, deleted_at FROM comm_threads WHERE client_id = ? ORDER BY id', 'i', [$cid]);

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
    'files' => pv_rows($conn, $unavailable, 'files',
      "SELECT id, project_id, name, mime, size, expires_at, created_at, deleted_at FROM files WHERE $fileWhere ORDER BY id", $fileTypes, $fileParams),
    'comm_threads' => $threads,
    'comm_messages' => pv_rows_in($conn, $unavailable, 'comm_messages', 'SELECT id, thread_id, direction, body, created_at FROM comm_messages WHERE thread_id IN ', pv_ids($threads)),
    'audit_log' => pv_audit($conn, $unavailable, $emails, $userIds),
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
    'audit_log' => pv_audit($conn, $unavailable, [$email], []),
    'matching_client_ids' => $clientIds,
  ];
}

/** Streams the export as an attachment and ends the request. */
function pv_send(array $doc, string $filename): void {
  $body = json_encode($doc, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
  if ($body === false) fail('Could not build the export.', 500);
  http_response_code(200);
  header('Content-Type: application/json; charset=utf-8');
  header('Content-Disposition: attachment; filename="' . $filename . '"');
  header('Content-Length: ' . strlen($body));
  header('Cache-Control: private, no-store');
  header('X-Content-Type-Options: nosniff');
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

  audit($conn, $me['id'], 'privacy_export', $auditDetail);
  pv_send([
    'about' => [
      'generated_at' => gmdate('Y-m-d\TH:i:s\Z'),
      'subject' => $subject,
      'note' => 'Every row GAkinz holds about this subject, soft-deleted rows included. File contents are not included.',
      'excluded' => PV_EXCLUDED,
      'unavailable' => array_values(array_unique($unavailable)),
    ],
    'data' => $data,
  ], $filename);
}

if ($method === 'GET' && $action === 'retention_report') {
  require_auth($conn, RETENTION_ROLES);
  require_once __DIR__ . '/_retention.php';
  ok(retention_report($conn));
}

if ($method === 'GET') fail('Unknown action.');
fail('Method not allowed.', 405);
