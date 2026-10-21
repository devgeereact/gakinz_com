<?php
/**
 * One set of rules for a new time entry, shared by time.php (time against a
 * project) and support.php (IT support time against a ticket, SQL 17), so the
 * two ways of logging time can never accept different input.
 *
 *   minutes      required, a whole number above zero
 *   description  optional, trimmed and cut to 300 characters, NULL when empty
 *   billable     optional, true when given and truthy
 *   entry_date   optional, cut to 10 characters, today when empty
 *
 * The caller chooses the project and checks its own roles.
 */

/** The validated fields of a new time entry, or a 400 through fail(). */
function gk_time_entry_input(array $in): array {
  $minutes = (int)($in['minutes'] ?? 0);
  if ($minutes <= 0) fail('Logged time must be more than zero.');
  $desc = str_field($in, 'description', 300);
  $date = str_field($in, 'entry_date', 10);
  return [
    'minutes' => $minutes,
    'description' => $desc !== '' ? $desc : null,
    'billable' => !empty($in['billable']) ? 1 : 0,
    'entry_date' => $date !== '' ? $date : (new DateTime())->format('Y-m-d'),
  ];
}

/**
 * True once SQL 17 has run: time_entries.ticket_id and projects.kind exist.
 * Until then time.php lists entries without a ticket and support.php answers
 * log_time with 503. Cached for the request.
 */
function gk_ticket_time_ready(mysqli $conn): bool {
  static $ready = null;
  if ($ready !== null) return $ready;
  try {
    // LIMIT 0 reads no rows; it only proves both columns are there.
    $a = $conn->query('SELECT ticket_id FROM time_entries LIMIT 0');
    $b = $a !== false ? $conn->query('SELECT kind FROM projects LIMIT 0') : false;
    $ready = $a !== false && $b !== false; // older mysqli reporting returns false instead of throwing
  } catch (mysqli_sql_exception $e) {
    if ($e->getCode() !== 1054) throw $e; // ER_BAD_FIELD_ERROR only
    $ready = false;
  }
  return $ready;
}
