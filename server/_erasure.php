<?php
/**
 * Erasure (docs/PRIVACY-READINESS.md sections 6 and 7, K-062). The only code
 * in GAkinzOS that hard-deletes personal data, and it does exactly two things:
 *
 *   1. Erases ONE prospect's enquiry: an enquiry that never became a client.
 *      Used by privacy.php?action=erase_enquiry (super_admin, typed
 *      confirmation) and by rule (a) of the retention executor below.
 *   2. The retention executor (cron.php job=retention_apply, command line
 *      only): rule (a) enquiries that never became a client, older than
 *      $RETENTION_ENQUIRY_MONTHS since their last change; rule (b) soft-deleted
 *      files older than $RETENTION_DELETED_FILE_DAYS. It deletes only when the
 *      rule's period is set AND $RETENTION_APPLY is true AND --apply was
 *      passed. Otherwise it lists what would go and changes nothing.
 *
 * What an enquiry erasure deletes: the enquiries row (its follow-up date, note
 * and priority are columns on that row), the calls (bookings) recorded on it
 * and their history (booking_events). In audit_log, on the rows whose text
 * names the enquirer's email address, it replaces that address and the
 * enquirer's name with "[erased]", and clears the IP on the enquirer's own
 * enquiry_submit row. Nothing else is changed.
 *
 * What it never touches, and refuses (409) rather than risk: an enquiry that
 * was won; one a client was converted from (clients.source_lead_id); one with
 * a call that is also filed against a client; and one whose email address is
 * also a client's, a user's or a contract signer's, because scrubbing that
 * address from the audit log would alter a client's or a user's record.
 * Clients, users, projects, proposals, invoices, payments, contracts,
 * tickets, files and every other enquiry are never read for deletion here.
 *
 * Every other retention rule (clients, invoices, audit log, messages, comms,
 * staff, certificates) stays report only: see _retention.php.
 */
require_once __DIR__ . '/_retention.php';
require_once __DIR__ . '/_uploads.php';

const ERASED = '[erased]';

/** One prepared statement. Throws on any failure, whatever mysqli_report() is set to. */
function er_run(mysqli $conn, string $sql, string $types = '', array $params = []): mysqli_stmt {
  $s = $conn->prepare($sql);
  if ($s === false) throw new mysqli_sql_exception($conn->error, $conn->errno);
  if ($types !== '') $s->bind_param($types, ...$params);
  if ($s->execute() === false) throw new mysqli_sql_exception($s->error, $s->errno);
  return $s;
}

function er_rows(mysqli $conn, string $sql, string $types = '', array $params = []): array {
  $s = er_run($conn, $sql, $types, $params);
  $res = $s->get_result();
  if ($res === false) throw new mysqli_sql_exception($s->error, $s->errno);
  return $res->fetch_all(MYSQLI_ASSOC);
}

/** Rows changed by a DELETE or UPDATE. */
function er_exec(mysqli $conn, string $sql, string $types = '', array $params = []): int {
  return er_run($conn, $sql, $types, $params)->affected_rows;
}

/** True when a table exists, so a database missing a later SQL step still works. */
function er_table_exists(mysqli $conn, string $table): bool {
  static $known = [];
  if (!isset($known[$table])) {
    $known[$table] = (bool)er_rows($conn,
      'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1', 's', [$table]);
  }
  return $known[$table];
}

function er_in(array $ids): string {
  return '(' . implode(', ', array_fill(0, count($ids), '?')) . ')';
}

const ER_PROBLEMS = [
  'won' => 'This enquiry was won, so it became a client. Client records are never erased here.',
  'converted' => 'A client was created from this enquiry. Client records are never erased here.',
  'client_call' => 'A call on this enquiry is also filed against a client, so it is client data and is never erased here.',
  'known_address' => 'This email address also belongs to a client, a user account or a contract signer, so erasing it would change their records. Handle this request by hand.',
  'recent' => 'This enquiry, or a call on it, changed within the retention period.',
];

/**
 * Why this enquiry may not be erased (a key of ER_PROBLEMS), or null when it
 * may. `$e` holds id, email and status. With `$months`, the enquiry and every
 * call on it must also be older than that many months. Read only.
 */
function er_enquiry_problem(mysqli $conn, array $e, ?int $months = null): ?string {
  $id = (int)$e['id'];
  if (strtolower(trim((string)($e['status'] ?? ''))) === 'won') return 'won';
  if (er_rows($conn, 'SELECT 1 FROM clients WHERE source_lead_id = ? LIMIT 1', 'i', [$id])) return 'converted';
  $hasBookings = er_table_exists($conn, 'bookings');
  if ($hasBookings && er_rows($conn, 'SELECT 1 FROM bookings WHERE enquiry_id = ? AND client_id IS NOT NULL LIMIT 1', 'i', [$id])) {
    return 'client_call';
  }
  $email = strtolower(trim((string)$e['email']));
  if ($email !== '') {
    $known = er_rows($conn, 'SELECT 1 FROM clients WHERE LOWER(TRIM(email)) = ?
      UNION ALL SELECT 1 FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1', 'ss', [$email, $email]);
    if (!$known && er_table_exists($conn, 'contracts')) {
      $known = er_rows($conn, 'SELECT 1 FROM contracts WHERE LOWER(TRIM(signer_email)) = ? LIMIT 1', 's', [$email]);
    }
    if ($known) return 'known_address';
  }
  if ($months !== null) {
    if (!er_rows($conn, 'SELECT 1 FROM enquiries WHERE id = ? AND updated_at < (NOW() - INTERVAL ? MONTH)', 'ii', [$id, $months])) return 'recent';
    if ($hasBookings && er_rows($conn, 'SELECT 1 FROM bookings WHERE enquiry_id = ?
        AND (updated_at >= (NOW() - INTERVAL ? MONTH) OR starts_at >= (NOW() - INTERVAL ? MONTH)) LIMIT 1', 'iii', [$id, $months, $months])) {
      return 'recent';
    }
  }
  return null;
}

/**
 * Replaces the enquirer's email address and name with "[erased]" on the audit
 * rows whose text names that address, as a whole address (a@x.test never
 * matches ba@x.test or a@x.test.uk), and clears the IP of their own
 * enquiry_submit row. Returns how many rows changed. Rows that do not name the
 * address are left alone, so a common name elsewhere in the log is never hit.
 */
function er_scrub_audit(mysqli $conn, string $email, string $name): int {
  $email = trim($email);
  if ($email === '') return 0;
  $emailRe = '/(?<![A-Za-z0-9._%+\-])' . preg_quote($email, '/') . '(?![A-Za-z0-9_\-]|\.[A-Za-z0-9])/i';
  $name = trim((string)preg_replace('/\s+/u', ' ', $name));
  $nameRe = mb_strlen($name) >= 2 ? '/(?<![\p{L}\p{N}])' . preg_quote($name, '/') . '(?![\p{L}\p{N}])/iu' : null;

  $rows = er_rows($conn, 'SELECT id, user_id, action, detail FROM audit_log WHERE detail LIKE ? FOR UPDATE', 's',
    ['%' . addcslashes($email, '%_\\') . '%']);
  $changed = 0;
  foreach ($rows as $r) {
    $detail = (string)$r['detail'];
    if (!preg_match($emailRe, $detail)) continue;
    $new = (string)preg_replace($emailRe, ERASED, $detail);
    if ($nameRe !== null) $new = (string)preg_replace($nameRe, ERASED, $new);
    if ($r['action'] === 'enquiry_submit' && $r['user_id'] === null) {
      er_exec($conn, 'UPDATE audit_log SET detail = ?, ip = NULL WHERE id = ?', 'si', [$new, (int)$r['id']]);
    } else {
      er_exec($conn, 'UPDATE audit_log SET detail = ? WHERE id = ?', 'si', [$new, (int)$r['id']]);
    }
    $changed++;
  }
  return $changed;
}

/**
 * Erases one prospect's enquiry in a single transaction, after locking its row
 * and checking again, under the lock, everything er_enquiry_problem() checks.
 * `$confirmEmail` must equal the enquiry's email address (case and outer
 * spaces aside), so the caller has to have read the right record. `$auditAs`
 * is [user id, action, detail] for an audit row written inside the same
 * transaction, or null when the caller audits for itself.
 *
 * Returns ['status' => erased | not_found | mismatch | blocked, ...]. Only
 * `erased` changed anything.
 */
function er_erase_enquiry(mysqli $conn, int $id, string $confirmEmail, ?int $months = null, ?array $auditAs = null): array {
  if ($id <= 0) return ['status' => 'not_found'];
  $hasBookings = er_table_exists($conn, 'bookings');
  $hasEvents = er_table_exists($conn, 'booking_events');
  $conn->begin_transaction();
  try {
    $e = er_rows($conn, 'SELECT id, name, email, status FROM enquiries WHERE id = ? FOR UPDATE', 'i', [$id])[0] ?? null;
    if (!$e) { $conn->rollback(); return ['status' => 'not_found']; }
    $email = trim((string)$e['email']);
    if ($email === '' || strtolower(trim($confirmEmail)) !== strtolower($email)) { $conn->rollback(); return ['status' => 'mismatch']; }
    $problem = er_enquiry_problem($conn, $e, $months);
    if ($problem !== null) { $conn->rollback(); return ['status' => 'blocked', 'problem' => $problem, 'message' => ER_PROBLEMS[$problem]]; }

    $events = 0; $calls = 0;
    if ($hasBookings) {
      $bookingIds = array_map(fn($r) => (int)$r['id'],
        er_rows($conn, 'SELECT id FROM bookings WHERE enquiry_id = ? AND client_id IS NULL FOR UPDATE', 'i', [$id]));
      if ($bookingIds && $hasEvents) {
        $events = er_exec($conn, 'DELETE FROM booking_events WHERE booking_id IN ' . er_in($bookingIds), str_repeat('i', count($bookingIds)), $bookingIds);
      }
      if ($bookingIds) {
        $calls = er_exec($conn, 'DELETE FROM bookings WHERE client_id IS NULL AND id IN ' . er_in($bookingIds), str_repeat('i', count($bookingIds)), $bookingIds);
      }
    }
    er_exec($conn, 'DELETE FROM enquiries WHERE id = ?', 'i', [$id]);
    $scrubbed = er_scrub_audit($conn, $email, (string)$e['name']);
    if ($auditAs !== null) audit($conn, $auditAs[0], $auditAs[1], $auditAs[2]);
    $conn->commit();
    return ['status' => 'erased', 'bookings' => $calls, 'booking_events' => $events, 'audit_scrubbed' => $scrubbed];
  } catch (Throwable $t) {
    $conn->rollback();
    throw $t;
  }
}
