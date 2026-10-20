<?php
/**
 * Client anonymisation (docs/PRIVACY-READINESS.md section 7, K-108). SWITCHED
 * OFF by default: it acts only when config.php sets
 * $CLIENT_ANONYMISE_ENABLED = true (the boolean true, nothing else). While it
 * is off, privacy.php answers 404 to both of its routes before reading
 * anything, and this file is never loaded.
 *
 * THE FIELD RULES BELOW ARE A PROPOSAL. The owner and an adviser must confirm
 * them, and the refusal rules, before the switch is turned on.
 *
 * A super admin anonymises ONE former client, typing its company name as the
 * confirmation. In one transaction, under row locks, after checking every
 * refusal again: the client's contact details are replaced with neutral
 * values, its portal logins are suspended, renamed and locked out for good,
 * and the client's addresses are replaced with "[erased]" in the audit text,
 * the way _erasure.php does it. One audit row "client_anonymise #id" records
 * it, with no personal data. NO ROW IS DELETED except the logins' sessions,
 * magic links and password reset tokens, which exist only to grant access.
 *
 * Refused (409), changing nothing, while any of these hold:
 *   already          an earlier client_anonymise audit row names this client
 *   retainer         a care plan amount is set (cron.php would keep billing)
 *   unpaid_invoices  an invoice that is not deleted and not paid (draft or sent)
 *   open_projects    a project that is not deleted and not launched
 *   open_tickets     a portal message that is not deleted and not resolved
 *   active_contract  a contract that is not deleted and is draft or sent
 *   open_quote       a quote that is not deleted and is draft or sent
 *   upcoming_call    a requested or confirmed call that has not happened yet
 *   staff_login      a login linked to the client has a role other than client
 *   shared_enquiry   another client was converted from the same enquiry
 *   shared_address   one of the client's addresses is also another client's,
 *                    a user's outside this client, or a contract signer's on
 *                    another client's contract: scrubbing it from the audit
 *                    text would change someone else's record
 * A signed or void contract is NOT a refusal: it is a finished record, kept.
 *
 * ── Field decisions ─────────────────────────────────────────────────────────
 * "#id" is the client id. A = anonymised, K = kept untouched, D = deleted.
 *
 * | Table.field                         | Rule | Value or reason                                      |
 * |-------------------------------------|------|------------------------------------------------------|
 * | clients.company                     | A    | "Former client #id"; K only with keep_company: true  |
 * | clients.contact_name                | A    | NULL                                                 |
 * | clients.email                       | A    | NULL                                                 |
 * | clients.phone                       | A    | NULL (clients has no address column)                 |
 * | clients.notes                       | A    | NULL (staff notes about the person)                  |
 * | clients.tag, retainer_amount        | K    | not personal; retainer must already be 0             |
 * | clients.source_lead_id, dates       | K    | links and history, not personal                      |
 * | users (role client, this client)    |      |                                                      |
 * |   .name                             | A    | "Former client #id": every ticket reply and Comms    |
 * |                                     |      | message the login wrote now shows this name          |
 * |   .email                            | A    | anonymised-<id>-<n>@invalid (unique, undeliverable)  |
 * |   .password_hash                    | A    | "!anonymised", which no password ever verifies       |
 * |   .status                           | A    | suspended                                            |
 * |   .totp_secret, totp_recovery       | A    | NULL; totp_enabled 0; totp_last_step NULL if present |
 * |   .role, client_id, dates           | K    | keeps the replies attributed to this client          |
 * | auth_tokens of those logins         | D    | sessions, which only grant access                    |
 * | magic_links of those logins         | D    | sign-in links, which only grant access               |
 * | password_resets of those logins     | D    | reset links, which only grant access                 |
 * | enquiries (the client's source one) |      |                                                      |
 * |   .name                             | A    | "Former client #id"                                  |
 * |   .email                            | A    | anonymised-<id>-enquiry@invalid (column is NOT NULL) |
 * |   .company                          | A    | NULL; K with keep_company: true                      |
 * |   .ip                               | A    | NULL                                                 |
 * |   .message and the rest             | K    | the request as received, like portal messages        |
 * | other enquiries from the same email | K    | a prospect's record: erase_enquiry handles those     |
 * | client_feedback.attribution         | A    | NULL (how the person wanted to be named if quoted)   |
 * | client_feedback text, rating        | K    | kept by the brief, with the client record            |
 * | booking_events.notify_to            | A    | NULL where it is one of the client's addresses, on   |
 * |                                     |      | calls with the client or on its source enquiry       |
 * | bookings (location, notes, outcome) | K    | staff free text; not searched for personal data      |
 * | tickets, ticket_replies             | K    | kept by the brief; author names change via users     |
 * | comm_threads, comm_messages         | K    | correspondence free text; not searched               |
 * | invoices, invoice_items             | K    | financial record (tax)                               |
 * | payment_events                      | K    | financial record (tax)                               |
 * | proposals, proposal_items           | K    | contractual record (what was offered and accepted)   |
 * | contracts (signer name, email, IP)  | K    | contractual record (evidence of signature)           |
 * | projects, tasks, briefs, assets,    | K    | delivery record; project_assets.client_note is the   |
 * |   measurements, time_entries        |      | client's own text, kept like portal messages         |
 * | files (names and contents)          | K    | not searched; a file name can hold a name            |
 * | audit_log.detail                    | A    | each client address replaced with "[erased]", and   |
 * |                                     |      | the matching person's name on those rows only        |
 * | audit_log.ip                        | A    | NULL on the source enquiry's enquiry_submit rows     |
 * | testimonials, certificates          | K    | not linked to a client record (matched by name only) |
 * | Mailbox, backups                    | K    | outside the database                                 |
 *
 * Contracts keep the signer's name, email and signing IP because they are the
 * evidence of the signature. Invoices, payments, proposals, contracts and
 * projects are never written: the tests compare CHECKSUM TABLE before and after.
 */
require_once __DIR__ . '/_erasure.php';

/** True only when config.php sets $CLIENT_ANONYMISE_ENABLED = true; exactly. */
function client_anonymise_enabled(): bool {
  return ($GLOBALS['CLIENT_ANONYMISE_ENABLED'] ?? false) === true;
}

const CA_PASSWORD_LOCK = '!anonymised';

const CA_PROBLEMS = [
  'already' => 'This client has already been anonymised.',
  'retainer' => 'This client still has a care plan amount set, so it would keep being billed. Set the care plan to none first.',
  'unpaid_invoices' => 'This client has an invoice that is not paid (a draft or a sent invoice). Finish or delete it first.',
  'open_projects' => 'This client has a project that is not launched. Launch or delete it first.',
  'open_tickets' => 'This client has a portal message that is not resolved. Resolve it first.',
  'active_contract' => 'This client has a contract in draft or sent. Void, sign or delete it first.',
  'open_quote' => 'This client has a quote in draft or sent. Decline or delete it first.',
  'upcoming_call' => 'This client has a call that has not happened yet. Cancel or complete it first.',
  'staff_login' => 'A login linked to this client is not a client login. Handle it by hand.',
  'shared_enquiry' => 'Another client was created from the same enquiry. Handle this request by hand.',
  'shared_address' => 'One of this client\'s email addresses also belongs to another client, a staff login or another client\'s contract signer, so anonymising it would change their records. Handle this request by hand.',
];

/** What stays, and why, as the dialog lists it. */
const CA_KEPT = [
  'Invoices and payments: financial records the business may have to keep for tax.',
  'Quotes and contracts, including the signer\'s name, email and signing IP: contractual records and the evidence of signature.',
  'Projects, tasks, briefs and files: the delivery record. File names are not changed.',
  'Portal messages, replies and feedback text: kept, with the author shown as the former client.',
  'Comms conversations, call notes and the Mailbox: free text, not searched.',
  'Other enquiries sent from the same address: a prospect\'s record, handled by enquiry erasure.',
  'Backups, until they age out.',
];

function ca_placeholder(int $cid): string {
  return "Former client #$cid";
}

function ca_lock(bool $lock): string {
  return $lock ? ' FOR UPDATE' : '';
}

function ca_count(mysqli $conn, string $sql, string $types, array $params): int {
  return (int)(er_rows($conn, $sql, $types, $params)[0]['n'] ?? 0);
}

/**
 * The client's logins, the source enquiry, and every address with the name
 * that goes with it (lower-cased, unique). Read only, or locking with `$lock`.
 */
function ca_subject(mysqli $conn, array $client, bool $lock): array {
  $cid = (int)$client['id'];
  $users = er_rows($conn, 'SELECT id, name, email, role FROM users WHERE client_id = ? ORDER BY id' . ca_lock($lock), 'i', [$cid]);
  $enquiry = null;
  if ($client['source_lead_id'] !== null) {
    $enquiry = er_rows($conn, 'SELECT id, name, email FROM enquiries WHERE id = ?' . ca_lock($lock), 'i', [(int)$client['source_lead_id']])[0] ?? null;
  }
  $addresses = [];
  $add = function ($email, $name) use (&$addresses) {
    $e = strtolower(trim((string)$email));
    if ($e !== '' && !isset($addresses[$e])) $addresses[$e] = trim((string)$name);
  };
  $add($client['email'], $client['contact_name']);
  foreach ($users as $u) $add($u['email'], $u['name']);
  if ($enquiry) $add($enquiry['email'], $enquiry['name']);
  return ['users' => $users, 'enquiry' => $enquiry, 'addresses' => $addresses];
}

/** Every reason (keys of CA_PROBLEMS) this client may not be anonymised; empty when it may. */
function ca_problems(mysqli $conn, array $client, array $subject, bool $lock): array {
  $cid = (int)$client['id'];
  $l = ca_lock($lock);
  $p = [];
  if (er_rows($conn, "SELECT 1 FROM audit_log WHERE action = 'client_anonymise' AND detail = ? LIMIT 1", 's', ["#$cid"])) $p[] = 'already';
  if ((float)$client['retainer_amount'] > 0) $p[] = 'retainer';
  if (ca_count($conn, "SELECT COUNT(*) AS n FROM invoices WHERE client_id = ? AND deleted_at IS NULL AND status <> 'paid'$l", 'i', [$cid])) $p[] = 'unpaid_invoices';
  if (ca_count($conn, "SELECT COUNT(*) AS n FROM projects WHERE client_id = ? AND deleted_at IS NULL AND status <> 'launched'$l", 'i', [$cid])) $p[] = 'open_projects';
  if (ca_count($conn, "SELECT COUNT(*) AS n FROM tickets WHERE client_id = ? AND deleted_at IS NULL AND status <> 'resolved'$l", 'i', [$cid])) $p[] = 'open_tickets';
  if (er_table_exists($conn, 'contracts')
      && ca_count($conn, "SELECT COUNT(*) AS n FROM contracts WHERE client_id = ? AND deleted_at IS NULL AND status IN ('draft', 'sent')$l", 'i', [$cid])) {
    $p[] = 'active_contract';
  }
  if (ca_count($conn, "SELECT COUNT(*) AS n FROM proposals WHERE client_id = ? AND deleted_at IS NULL AND status IN ('draft', 'sent')$l", 'i', [$cid])) $p[] = 'open_quote';
  if (er_table_exists($conn, 'bookings')
      && ca_count($conn, "SELECT COUNT(*) AS n FROM bookings WHERE client_id = ? AND deleted_at IS NULL
           AND status IN ('requested', 'confirmed') AND starts_at >= UTC_TIMESTAMP()$l", 'i', [$cid])) {
    $p[] = 'upcoming_call';
  }
  foreach ($subject['users'] as $u) {
    if ($u['role'] !== 'client') { $p[] = 'staff_login'; break; }
  }
  if ($subject['enquiry'] && er_rows($conn, 'SELECT 1 FROM clients WHERE source_lead_id = ? AND id <> ? LIMIT 1', 'ii', [(int)$subject['enquiry']['id'], $cid])) {
    $p[] = 'shared_enquiry';
  }
  $hasContracts = er_table_exists($conn, 'contracts');
  foreach (array_keys($subject['addresses']) as $email) {
    $shared = er_rows($conn, 'SELECT 1 FROM clients WHERE id <> ? AND LOWER(TRIM(email)) = ?
      UNION ALL SELECT 1 FROM users WHERE (client_id IS NULL OR client_id <> ?) AND LOWER(TRIM(email)) = ? LIMIT 1',
      'isis', [$cid, $email, $cid, $email]);
    if (!$shared && $hasContracts) {
      $shared = er_rows($conn, 'SELECT 1 FROM contracts WHERE (client_id IS NULL OR client_id <> ?) AND LOWER(TRIM(signer_email)) = ? LIMIT 1',
        'is', [$cid, $email]);
    }
    if ($shared) { $p[] = 'shared_address'; break; }
  }
  return $p;
}

/** Enquiries, other than the source one, sent from one of the client's addresses. They are not changed. */
function ca_other_enquiries(mysqli $conn, array $subject): int {
  $emails = array_keys($subject['addresses']);
  if (!$emails) return 0;
  $skip = $subject['enquiry'] ? (int)$subject['enquiry']['id'] : 0;
  return ca_count($conn, 'SELECT COUNT(*) AS n FROM enquiries WHERE id <> ? AND LOWER(TRIM(email)) IN ' . er_in($emails),
    'i' . str_repeat('s', count($emails)), array_merge([$skip], $emails));
}

/** What the dialog shows first. Read only. Null for an unknown client. */
function ca_preview(mysqli $conn, int $cid): ?array {
  $client = er_rows($conn, 'SELECT id, company, contact_name, email, retainer_amount, source_lead_id FROM clients WHERE id = ?', 'i', [$cid])[0] ?? null;
  if (!$client) return null;
  $subject = ca_subject($conn, $client, false);
  $problems = ca_problems($conn, $client, $subject, false);
  return [
    'id' => $cid,
    'company' => (string)$client['company'],
    'placeholder' => ca_placeholder($cid),
    'logins' => count($subject['users']),
    'source_enquiry' => $subject['enquiry'] !== null,
    'other_enquiries' => ca_other_enquiries($conn, $subject),
    'problems' => array_map(fn($k) => ['reason' => $k, 'message' => CA_PROBLEMS[$k]], $problems),
    'kept' => CA_KEPT,
  ];
}

/** Company names compared with case, outer spaces and runs of spaces ignored. */
function ca_same_name(string $a, string $b): bool {
  $norm = fn(string $s) => mb_strtolower(trim(er_replace('/\s+/u', ' ', $s)));
  return $norm($a) !== '' && $norm($a) === $norm($b);
}

/**
 * Anonymises one client in a single transaction. `$confirm` must be the
 * client's company name. `$auditAs` is [user id, action, detail], written
 * inside the transaction. Returns ['status' => anonymised | not_found |
 * mismatch | blocked, ...]; only `anonymised` changed anything.
 */
function ca_anonymise_client(mysqli $conn, int $cid, string $confirm, bool $keepCompany, array $auditAs): array {
  if ($cid <= 0) return ['status' => 'not_found'];
  $hasBookings = er_table_exists($conn, 'bookings') && er_table_exists($conn, 'booking_events');
  $hasFeedback = er_table_exists($conn, 'client_feedback');
  $hasLastStep = er_column_exists($conn, 'users', 'totp_last_step');
  $conn->begin_transaction();
  try {
    $client = er_rows($conn, 'SELECT id, company, contact_name, email, retainer_amount, source_lead_id FROM clients WHERE id = ? FOR UPDATE',
      'i', [$cid])[0] ?? null;
    if (!$client) { $conn->rollback(); return ['status' => 'not_found']; }
    if (!ca_same_name($confirm, (string)$client['company'])) { $conn->rollback(); return ['status' => 'mismatch']; }
    $subject = ca_subject($conn, $client, true);
    $problems = ca_problems($conn, $client, $subject, true);
    if ($problems) {
      $conn->rollback();
      return ['status' => 'blocked', 'problems' => $problems, 'message' => CA_PROBLEMS[$problems[0]]];
    }

    $placeholder = ca_placeholder($cid);
    $userIds = array_map(fn($u) => (int)$u['id'], $subject['users']);
    $n = 0;
    foreach ($userIds as $uid) {
      $n++;
      $email = "anonymised-$cid-$n@invalid";
      er_exec($conn, 'UPDATE users SET name = ?, email = ?, password_hash = ?, status = \'suspended\',
          totp_secret = NULL, totp_enabled = 0, totp_recovery = NULL' . ($hasLastStep ? ', totp_last_step = NULL' : '') . '
        WHERE id = ? AND client_id = ? AND role = \'client\'',
        'sssii', [$placeholder, $email, CA_PASSWORD_LOCK, $uid, $cid]);
    }
    $sessions = $links = $resets = 0;
    if ($userIds) {
      $in = er_in($userIds); $types = str_repeat('i', count($userIds));
      $sessions = er_exec($conn, "DELETE FROM auth_tokens WHERE user_id IN $in", $types, $userIds);
      $links = er_exec($conn, "DELETE FROM magic_links WHERE user_id IN $in", $types, $userIds);
      $resets = er_exec($conn, "DELETE FROM password_resets WHERE user_id IN $in", $types, $userIds);
    }

    $company = $keepCompany ? (string)$client['company'] : $placeholder;
    er_exec($conn, 'UPDATE clients SET company = ?, contact_name = NULL, email = NULL, phone = NULL, notes = NULL WHERE id = ?',
      'si', [$company, $cid]);

    $enquiry = 0;
    if ($subject['enquiry']) {
      $eid = (int)$subject['enquiry']['id'];
      $sql = 'UPDATE enquiries SET name = ?, email = ?, ip = NULL' . ($keepCompany ? '' : ', company = NULL') . ' WHERE id = ?';
      $enquiry = er_exec($conn, $sql, 'ssi', [$placeholder, "anonymised-$cid-enquiry@invalid", $eid]) > 0 ? 1 : 0;
    }

    $feedback = $hasFeedback
      ? er_exec($conn, 'UPDATE client_feedback SET attribution = NULL WHERE client_id = ? AND attribution IS NOT NULL', 'i', [$cid])
      : 0;

    $emails = array_keys($subject['addresses']);
    $events = 0;
    if ($hasBookings && $emails) {
      $eid = $subject['enquiry'] ? (int)$subject['enquiry']['id'] : 0;
      $events = er_exec($conn, 'UPDATE booking_events SET notify_to = NULL
        WHERE booking_id IN (SELECT id FROM bookings WHERE client_id = ? OR (enquiry_id = ? AND client_id IS NULL))
          AND LOWER(TRIM(notify_to)) IN ' . er_in($emails),
        'ii' . str_repeat('s', count($emails)), array_merge([$cid, $eid], $emails));
    }

    $scrubbed = 0;
    foreach ($subject['addresses'] as $email => $name) $scrubbed += er_scrub_audit($conn, $email, $name);

    audit($conn, $auditAs[0], $auditAs[1], $auditAs[2]);
    $conn->commit();
    return [
      'status' => 'anonymised',
      'logins' => count($userIds),
      'sessions' => $sessions,
      'magic_links' => $links,
      'password_resets' => $resets,
      'enquiry' => $enquiry,
      'feedback' => $feedback,
      'booking_events' => $events,
      'audit_scrubbed' => $scrubbed,
    ];
  } catch (Throwable $t) {
    $conn->rollback();
    throw $t;
  }
}
