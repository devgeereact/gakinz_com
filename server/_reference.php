<?php
/**
 * Work references (SQL 19, docs/PRODUCT-SPEC.md 6.1). An enquiry gets
 * GK-E-YYYY-NNNN and a project GK-P-YYYY-NNNN when it is created. NNNN counts
 * from 0001 per type and per year, and goes past 9999 rather than wrapping.
 *
 * A reference identifies work for people reading a document. It is never a
 * password: nothing here, and no endpoint, finds, reveals or authorises
 * anything because a caller knows one. Staff screens and the client's own
 * portal show it; that is all.
 *
 * Sequence: reference_counters holds one row per type and year, plus one
 * anchor row per type (ref_year 0). Each assignment runs in a transaction
 * that first locks the type's anchor row (SELECT ... FOR UPDATE), so
 * assignments of one type take turns. Only then is the year's row raised by
 * INSERT ... ON DUPLICATE KEY UPDATE, which hands the new value back through
 * LAST_INSERT_ID() (per connection). Without the anchor, two transactions
 * creating the year's first row at once can deadlock on InnoDB's shared
 * duplicate-key locks; with it, nothing else ever waits on the year's row.
 * The counter only goes up, so a number is never issued again, even after its
 * record is deleted. The unique key on each reference column is the backstop:
 * if a number is already taken (a backfill run late, say), the next one is
 * tried.
 *
 * The gate: a number is issued only when the type's anchor row exists (the
 * locking read in gk_ref_next finds it). SQL 19 inserts the anchors last,
 * after the columns, the backfill and the counter seed, so no new record can
 * take a number the backfill is about to use. Deleting the anchors closes the
 * gate again (the recovery step in schema.sql). The anchor is checked by that
 * locking read and not by a plain SELECT, because a plain read inside the
 * caller's transaction would fix its snapshot before the anchor wait, and
 * MariaDB's snapshot isolation then refuses the counter update (error 1020).
 *
 * Optional by design. Endpoints load this file only when it is on the server,
 * and every function answers "no reference" until SQL 19 has run, so creating
 * an enquiry or project never fails because of a reference.
 */

const GK_REF_KINDS = ['enquiries' => 'E', 'projects' => 'P'];
const GK_REF_TRIES = 5;

/**
 * True once SQL 19's columns and reference_counters exist, so references can
 * be read and searched. Issuing one also needs the anchor (see above). Cached
 * for the request. Never throws: any other database error is logged and reads
 * as "not ready", so a probe can never turn a saved record into an error reply.
 */
function gk_ref_ready(mysqli $conn): bool {
  static $ready = null;
  if ($ready !== null) return $ready;
  try {
    // LIMIT 0 reads no rows (and so fixes no snapshot); it only proves the
    // columns and the table are there.
    $a = $conn->query('SELECT reference FROM enquiries LIMIT 0');
    $b = $a !== false ? $conn->query('SELECT reference FROM projects LIMIT 0') : false;
    $c = $b !== false ? $conn->query('SELECT last_n FROM reference_counters LIMIT 0') : false;
    $ready = $c !== false; // older mysqli reporting returns false instead of throwing
  } catch (mysqli_sql_exception $e) {
    // 1054 / 1146: a column or the table is not there yet. Anything else is unexpected.
    if (!in_array($e->getCode(), [1054, 1146], true)) error_log('GAkinz reference probe failed: database error ' . $e->getCode());
    $ready = false;
  }
  return $ready;
}

/** GK-E-2026-0007. Pure, so the format has one definition. */
function gk_ref_format(string $kind, int $year, int $n): string {
  return sprintf('GK-%s-%04d-%04d', $kind, $year, $n);
}

/** The reference column for a SELECT on `$alias`, or a NULL placeholder before SQL 19. */
function gk_ref_col(mysqli $conn, string $alias, string $as = 'reference'): string {
  return gk_ref_ready($conn) ? "$alias.reference AS $as" : "NULL AS $as";
}

/**
 * Gives the new row `$id` in `$table` ('enquiries' or 'projects') its
 * reference and returns it, or null before SQL 19 or when it could not be
 * set. Call it after reading the row's insert_id.
 *
 * `$inTransaction`: pass true when the caller has a transaction open; the
 * counter then rises and rolls back with the caller's work, and the anchor
 * lock is held until the caller commits. Otherwise this opens and commits
 * its own short transaction.
 *
 * Inside the caller's transaction a lock wait timeout or deadlock is
 * rethrown, because InnoDB has already rolled that transaction back. Any
 * other database error is logged and answers null: the record itself is
 * saved, and a missing reference must not make a visitor send the same
 * enquiry twice.
 */
function gk_ref_assign(mysqli $conn, string $table, int $id, bool $inTransaction = false): ?string {
  $kind = GK_REF_KINDS[$table] ?? null;
  if ($kind === null || $id <= 0) return null;
  try {
    if (!gk_ref_ready($conn)) return null;
    if (!$inTransaction) $conn->begin_transaction();
    $ref = gk_ref_next($conn, $table, $kind, $id);
    if (!$inTransaction) $conn->commit();
    return $ref;
  } catch (mysqli_sql_exception $e) {
    if (!$inTransaction) {
      $conn->rollback();
    } elseif (in_array($e->getCode(), [1205, 1213], true)) {
      throw $e;
    }
    error_log("GAkinz reference not set for $table #$id: database error " . $e->getCode());
    return null;
  }
}

/** The assignment itself, inside a transaction. Throws mysqli_sql_exception on a database error. */
function gk_ref_next(mysqli $conn, string $table, string $kind, int $id): ?string {
  // Take this type's turn on its anchor row. No anchor means the gate is shut
  // (SQL 19 step 2 not finished, or closed for recovery): assign nothing.
  $anchor = $conn->prepare('SELECT last_n FROM reference_counters WHERE kind = ? AND ref_year = 0 FOR UPDATE');
  $anchor->bind_param('s', $kind);
  $anchor->execute();
  if (!$anchor->get_result()->fetch_row()) return null;

  // $table is one of the two fixed keys of GK_REF_KINDS, never request input.
  $row = $conn->prepare("SELECT YEAR(COALESCE(created_at, CURRENT_TIMESTAMP)) AS y, reference FROM $table WHERE id = ? LIMIT 1");
  $row->bind_param('i', $id);
  $row->execute();
  $r = $row->get_result()->fetch_assoc();
  if (!$r) return null;
  if ($r['reference'] !== null) return (string)$r['reference'];
  $year = (int)$r['y'];

  $next = $conn->prepare(
    'INSERT INTO reference_counters (kind, ref_year, last_n) VALUES (?, ?, LAST_INSERT_ID(1))
     ON DUPLICATE KEY UPDATE last_n = LAST_INSERT_ID(last_n + 1)'
  );
  $set = $conn->prepare("UPDATE $table SET reference = ? WHERE id = ? AND reference IS NULL");
  for ($try = 0; $try < GK_REF_TRIES; $try++) {
    $next->bind_param('si', $kind, $year);
    if (!$next->execute()) throw new mysqli_sql_exception('counter not raised', (int)$next->errno);
    $n = (int)($conn->query('SELECT LAST_INSERT_ID()')->fetch_row()[0] ?? 0);
    if ($n <= 0) throw new mysqli_sql_exception('counter not read');
    $ref = gk_ref_format($kind, $year, $n);
    try {
      $set->bind_param('si', $ref, $id);
      if (!$set->execute()) throw new mysqli_sql_exception('reference not set', (int)$set->errno);
      return $set->affected_rows === 1 ? $ref : null;
    } catch (mysqli_sql_exception $e) {
      if ($e->getCode() !== 1062) throw $e; // ER_DUP_ENTRY: number already used, take the next
    }
  }
  error_log("GAkinz reference not set for $table #$id: " . GK_REF_TRIES . ' numbers in a row were taken');
  return null;
}
