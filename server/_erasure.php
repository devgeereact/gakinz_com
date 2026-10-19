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
 * enquirer's name with "[erased]", and clears the IP on every enquiry_submit
 * row naming that address. Nothing else is changed.
 *
 * Not erased, by design (the dialog and PRIVACY-READINESS section 7 say so):
 * Comms threads and messages, the Mailbox, other enquiries from the same
 * address (only their audit copies are scrubbed), backups, and audit rows that
 * name the person without their email address (by first name only, say).
 *
 * Soft-deleted files are removed only as plain files sitting directly in
 * uploads/ under their exact stored name: a symlink (even to another file in
 * uploads/), a directory or anything else at that name is left alone, and
 * without a usable uploads/ folder the files rule does nothing. A file still
 * used by a project asset checklist or by Work is kept.
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
require_once __DIR__ . '/_like.php';

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
 * matches ba@x.test or a@x.test.uk), and clears the IP of every enquiry_submit
 * row naming it (the enquirer's own submissions, from any of their enquiries).
 * Returns how many rows changed. Rows that do not name the address are left
 * alone, so a common name elsewhere in the log is never hit.
 */
function er_scrub_audit(mysqli $conn, string $email, string $name): int {
  $email = trim($email);
  if ($email === '') return 0;
  $emailRe = '/(?<![A-Za-z0-9._%+\-])' . preg_quote($email, '/') . '(?![A-Za-z0-9_\-]|\.[A-Za-z0-9])/i';
  $name = trim(er_replace('/\s+/u', ' ', $name));
  $nameRe = mb_strlen($name) >= 2 ? '/(?<![\p{L}\p{N}])' . preg_quote($name, '/') . '(?![\p{L}\p{N}])/iu' : null;

  // LIKE finds candidates (with _like.php's '!' escape, so `_` and `%` in an
  // address are literal); the regex then keeps only whole matches.
  $rows = er_rows($conn, 'SELECT id, user_id, action, detail FROM audit_log WHERE detail' . LIKE_CONTAINS_SQL . ' FOR UPDATE', 's',
    [like_contains($email)]);
  $changed = 0;
  foreach ($rows as $r) {
    $detail = (string)$r['detail'];
    if (!preg_match($emailRe, $detail)) continue;
    $new = er_replace($emailRe, ERASED, $detail);
    if ($nameRe !== null) $new = er_replace($nameRe, ERASED, $new);
    if ($r['action'] === 'enquiry_submit' && $r['user_id'] === null) {
      er_exec($conn, 'UPDATE audit_log SET detail = ?, ip = NULL WHERE id = ?', 'si', [$new, (int)$r['id']]);
    } else {
      er_exec($conn, 'UPDATE audit_log SET detail = ? WHERE id = ?', 'si', [$new, (int)$r['id']]);
    }
    $changed++;
  }
  return $changed;
}

/** preg_replace that throws instead of returning null, so text is never silently emptied. */
function er_replace(string $re, string $with, string $subject): string {
  $out = preg_replace($re, $with, $subject);
  if ($out === null) throw new RuntimeException('Erasure text replacement failed: ' . preg_last_error_msg());
  return $out;
}

/**
 * What the erase dialog shows before anything is done: how many OTHER
 * enquiries use the same address (they are not erased, but the audit rows
 * naming the address, their enquiry_submit rows included, lose the address
 * and IP too), and whether the erasure would be refused and why. Read only.
 */
function er_enquiry_preview(mysqli $conn, int $id): ?array {
  $e = er_rows($conn, 'SELECT id, email, status FROM enquiries WHERE id = ?', 'i', [$id])[0] ?? null;
  if (!$e) return null;
  $email = strtolower(trim((string)$e['email']));
  $others = $email === '' ? 0 : (int)(er_rows($conn, 'SELECT COUNT(*) AS n FROM enquiries WHERE id <> ? AND LOWER(TRIM(email)) = ?',
    'is', [$id, $email])[0]['n'] ?? 0);
  $problem = er_enquiry_problem($conn, $e);
  return [
    'id' => $id,
    'other_enquiries' => $others,
    'blocked' => $problem,
    'message' => $problem !== null ? ER_PROBLEMS[$problem] : null,
  ];
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

// ── Retention executor ──────────────────────────────────────────────────────

/** True only when config.php sets $RETENTION_APPLY = true; exactly. */
function retention_apply_enabled(): bool {
  return ($GLOBALS['RETENTION_APPLY'] ?? false) === true;
}

/** True when a column exists, for columns added by a later SQL step. */
function er_column_exists(mysqli $conn, string $table, string $column): bool {
  static $known = [];
  $k = "$table.$column";
  if (!isset($known[$k])) {
    $known[$k] = (bool)er_rows($conn, 'SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1', 'ss', [$table, $column]);
  }
  return $known[$k];
}

/** Why a soft-deleted file row may not be removed, or null when it may. Read only. */
function er_file_problem(mysqli $conn, array $f): ?string {
  $id = (int)$f['id'];
  $stored = (string)$f['stored'];
  if (!stored_name_ok($stored)) return 'unsafe_name';
  // A project's asset checklist still points at it: deleting the row would
  // change that project record, so the file stays.
  if (er_table_exists($conn, 'project_assets') && er_rows($conn, 'SELECT 1 FROM project_assets WHERE file_id = ? LIMIT 1', 'i', [$id])) {
    return 'linked_asset';
  }
  // A Work record (cover, hero images) or a Work gallery image uses it: the
  // public site serves it, so it stays whatever its deleted_at says.
  if (er_table_exists($conn, 'work')) {
    foreach (['cover_file_id', 'hero_desktop_file_id', 'hero_mobile_file_id'] as $col) {
      if (er_column_exists($conn, 'work', $col) && er_rows($conn, "SELECT 1 FROM work WHERE `$col` = ? LIMIT 1", 'i', [$id])) return 'linked_work';
    }
  }
  if (er_table_exists($conn, 'work_images') && er_rows($conn, 'SELECT 1 FROM work_images WHERE file_id = ? LIMIT 1', 'i', [$id])) {
    return 'linked_work';
  }
  // Another row uses the same file on disk.
  if (er_rows($conn, 'SELECT 1 FROM files WHERE `stored` = ? AND id <> ? LIMIT 1', 'si', [$stored, $id])) return 'shared_file';
  return null;
}

const ER_FILE_PROBLEMS = [
  'unsafe_name' => 'stored name fails the upload path rule',
  'linked_asset' => 'still linked from a project asset checklist',
  'linked_work' => 'still used by a Work record or Work image',
  'shared_file' => 'another file row uses the same file on disk',
  'unsafe_path' => 'a symlink, a directory or anything other than that plain file is at that name',
  'unlink_failed' => 'the file could not be removed from disk',
];

/** The upload directory's real path when it exists and can be read and written, else null. */
function er_upload_dir(): ?string {
  $dir = realpath(UPLOAD_DIR);
  if ($dir === false || !is_dir($dir) || !is_readable($dir) || !is_writable($dir)) return null;
  return $dir;
}

/**
 * Removes one soft-deleted file: the file in uploads/ first, then its row,
 * under a row lock that checks the age again. Only the exact name is ever
 * unlinked, and only when it is a plain file (never a symlink, so a link to
 * another row's file never removes that file) sitting directly in the upload
 * directory, under stored_path()'s rule as well. Returns removed | missing
 * (row removed, nothing at all was at that name) | gone (the row no longer
 * qualifies) | a key of ER_FILE_PROBLEMS.
 */
function er_remove_deleted_file(mysqli $conn, int $id, int $days, string $dir): string {
  $conn->begin_transaction();
  try {
    $f = er_rows($conn, 'SELECT id, `stored` FROM files WHERE id = ? AND deleted_at IS NOT NULL
      AND deleted_at < (NOW() - INTERVAL ? DAY) FOR UPDATE', 'ii', [$id, $days])[0] ?? null;
    if (!$f) { $conn->rollback(); return 'gone'; }
    $problem = er_file_problem($conn, $f);
    if ($problem !== null) { $conn->rollback(); return $problem; }
    $stored = (string)$f['stored'];
    $raw = $dir . '/' . $stored;
    $outcome = 'removed';
    clearstatcache(true, $raw);
    if (is_link($raw)) { $conn->rollback(); return 'unsafe_path'; }
    if (!file_exists($raw)) {
      $outcome = 'missing';
    } else {
      $real = realpath($raw);
      if (!is_file($raw) || $real === false || dirname($real) !== $dir || basename($real) !== $stored
          || stored_path($stored) !== $real) {
        $conn->rollback();
        return 'unsafe_path';
      }
      if (!@unlink($raw)) { $conn->rollback(); return 'unlink_failed'; }
    }
    er_exec($conn, 'DELETE FROM files WHERE id = ? AND deleted_at IS NOT NULL', 'i', [$id]);
    $conn->commit();
    return $outcome;
  } catch (Throwable $t) {
    $conn->rollback();
    throw $t;
  }
}

/**
 * The executor. Lists, for the two rules it may act on, what is eligible and
 * what is kept and why. Deletes only when `$wantApply` (the --apply flag) and
 * retention_apply_enabled() are both true, and then only for a rule whose
 * period is set. An applying run writes one audit row with counts only, also
 * when it stops part way on an error (then with "stopped": true), so whatever
 * was already deleted is always on record; the error is then rethrown.
 */
function retention_apply_run(mysqli $conn, bool $wantApply): array {
  $enabled = retention_apply_enabled();
  $apply = $wantApply && $enabled;
  $out = [
    'mode' => $apply ? 'apply' : 'dry_run',
    'apply_requested' => $wantApply,
    'apply_enabled' => $enabled,
    'generated_at' => gmdate('Y-m-d\TH:i:s\Z'),
    'rules' => [],
  ];
  $months = retention_period('RETENTION_ENQUIRY_MONTHS');
  $days = retention_period('RETENTION_DELETED_FILE_DAYS');
  $out['rules'][0] = ['key' => 'enquiries', 'label' => 'Enquiries that did not become a client', 'config_key' => '$RETENTION_ENQUIRY_MONTHS',
    'unit' => 'month', 'period' => is_int($months) ? $months : null,
    'status' => is_int($months) ? 'checked' : ($months === null ? 'period_not_set' : 'invalid_period')];
  $out['rules'][1] = ['key' => 'deleted_files', 'label' => 'Soft-deleted files', 'config_key' => '$RETENTION_DELETED_FILE_DAYS',
    'unit' => 'day', 'period' => is_int($days) ? $days : null,
    'status' => is_int($days) ? 'checked' : ($days === null ? 'period_not_set' : 'invalid_period')];

  $stopped = false;
  try {
    // (a) Enquiries that never became a client.
    $rule = &$out['rules'][0];
    if ($rule['status'] === 'checked') {
      $rule += ['eligible' => [], 'kept' => [], 'deleted' => [], 'bookings' => 0, 'booking_events' => 0, 'audit_scrubbed' => 0];
      $candidates = er_rows($conn, "SELECT e.id, e.email, e.status FROM enquiries e
        WHERE COALESCE(e.status, '') <> 'won'
          AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.source_lead_id = e.id)
          AND e.updated_at < (NOW() - INTERVAL ? MONTH)
        ORDER BY e.id", 'i', [$months]);
      foreach ($candidates as $e) {
        $id = (int)$e['id'];
        $problem = trim((string)$e['email']) === '' ? 'no_email' : er_enquiry_problem($conn, $e, $months);
        if ($problem !== null) { $rule['kept'][$problem] = ($rule['kept'][$problem] ?? 0) + 1; continue; }
        $rule['eligible'][] = $id;
        if (!$apply) continue;
        $r = er_erase_enquiry($conn, $id, (string)$e['email'], $months);
        if ($r['status'] === 'erased') {
          $rule['deleted'][] = $id;
          $rule['bookings'] += $r['bookings'];
          $rule['booking_events'] += $r['booking_events'];
          $rule['audit_scrubbed'] += $r['audit_scrubbed'];
        } else {
          $key = $r['problem'] ?? $r['status'];
          $rule['kept'][$key] = ($rule['kept'][$key] ?? 0) + 1;
        }
      }
    }
    unset($rule);

    // (b) Soft-deleted files. Without a usable upload directory nothing is
    // done at all: a missing folder must never make every row look "missing".
    $rule = &$out['rules'][1];
    $dir = er_upload_dir();
    if ($rule['status'] === 'checked' && $dir === null) $rule['status'] = 'uploads_unavailable';
    if ($rule['status'] === 'checked') {
      $rule += ['eligible' => [], 'kept' => [], 'deleted' => [], 'missing_on_disk' => 0];
      $candidates = er_rows($conn, 'SELECT id, `stored` FROM files
        WHERE deleted_at IS NOT NULL AND deleted_at < (NOW() - INTERVAL ? DAY) ORDER BY id', 'i', [$days]);
      foreach ($candidates as $f) {
        $id = (int)$f['id'];
        $problem = er_file_problem($conn, $f);
        if ($problem !== null) { $rule['kept'][$problem] = ($rule['kept'][$problem] ?? 0) + 1; continue; }
        $rule['eligible'][] = $id;
        if (!$apply) continue;
        $r = er_remove_deleted_file($conn, $id, $days, $dir);
        if ($r === 'removed' || $r === 'missing') {
          $rule['deleted'][] = $id;
          if ($r === 'missing') $rule['missing_on_disk']++;
        } else {
          $rule['kept'][$r] = ($rule['kept'][$r] ?? 0) + 1;
        }
      }
    }
    unset($rule);
  } catch (Throwable $t) {
    $stopped = true;
    throw $t;
  } finally {
    unset($rule);
    if ($apply) {
      $counts = [];
      foreach ($out['rules'] as $r) {
        $counts[$r['key']] = isset($r['deleted'])
          ? ['deleted' => count($r['deleted']), 'kept' => array_sum($r['kept'])]
          : $r['status'];
      }
      if ($stopped) $counts['stopped'] = true;
      audit($conn, null, 'retention_apply', (string)json_encode($counts));
    }
  }
  return $out;
}

/** Plain text for the command line. Ids only: no name, email or file name is printed. */
function retention_apply_text(array $run): string {
  if ($run['mode'] === 'apply') {
    $lines = ['Retention apply: APPLIED. Rows and files listed as deleted are gone.'];
  } elseif ($run['apply_requested']) {
    $lines = ['Retention apply: DRY RUN. --apply was passed, but $RETENTION_APPLY is not true in config.php, so nothing was deleted.'];
  } else {
    $lines = ['Retention apply: DRY RUN. Nothing was deleted. Deleting needs --apply and $RETENTION_APPLY = true in config.php.'];
  }
  $lines[] = 'Generated ' . $run['generated_at'] . '.';
  $lines[] = '';
  $ids = fn(array $xs) => $xs ? ' (#' . implode(', #', $xs) . ')' : '';
  foreach ($run['rules'] as $r) {
    if ($r['status'] === 'period_not_set') { $lines[] = "{$r['label']}: period not set ({$r['config_key']}). Nothing happens."; continue; }
    if ($r['status'] === 'invalid_period') { $lines[] = "{$r['label']}: invalid period in {$r['config_key']}. Nothing happens."; continue; }
    if ($r['status'] === 'uploads_unavailable') { $lines[] = "{$r['label']}: the uploads folder is missing or cannot be read and written. Nothing happens."; continue; }
    $unit = $r['unit'] . ($r['period'] === 1 ? '' : 's');
    $line = "{$r['label']}, older than {$r['period']} $unit: ";
    $line .= $run['mode'] === 'apply'
      ? 'deleted ' . count($r['deleted']) . $ids($r['deleted'])
      : 'would delete ' . count($r['eligible']) . $ids($r['eligible']);
    if (!empty($r['missing_on_disk']) && $run['mode'] === 'apply') $line .= ', of which ' . $r['missing_on_disk'] . ' had no file on disk';
    $kept = [];
    foreach ($r['kept'] as $why => $n) $kept[] = "$n $why";
    $line .= '; kept ' . array_sum($r['kept']) . ($kept ? ' (' . implode(', ', $kept) . ')' : '') . '.';
    $lines[] = $line;
  }
  $lines[] = '';
  $lines[] = 'Every other retention rule is report only (job=retention_report). This job never deletes anything else.';
  return implode("\n", $lines) . "\n";
}
