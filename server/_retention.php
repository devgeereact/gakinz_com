<?php
/**
 * Retention dry run (docs/PRIVACY-READINESS.md section 6, K-062).
 *
 * Counts the rows each proposed retention rule WOULD affect if a period were
 * set. It only ever runs SELECT COUNT(*): nothing here deletes, updates or
 * anonymises anything. Periods and erasure rules are owner and legal
 * decisions. The only file that acts on a period is _erasure.php (cron.php
 * job=retention_apply), for two rules only: enquiries that never became a
 * client and soft-deleted files, and only when $RETENTION_APPLY is true and
 * --apply is passed. Every other rule here is report only.
 *
 * Each period comes from a config.php variable (see config.php.example). null,
 * or a missing variable, means "not decided, nothing happens", and the rule
 * reports "period not set". Anything other than a positive whole number is
 * reported as an invalid period and counted as nothing.
 *
 * Used by privacy.php (`retention_report`, super_admin) and by cron.php
 * (`job=retention_report`, command line only).
 */

/**
 * The rules, in the order of the section 6 table. `queries` maps a table name
 * to a COUNT query whose single `?` is the period, in `unit`s.
 */
function retention_rules(): array {
  // A client counts when neither it nor any of its projects, invoices or
  // portal messages (tickets) changed within the period.
  $idleClient = "SELECT c.id FROM clients c
    WHERE c.updated_at < (NOW() - INTERVAL ? MONTH)
      AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.client_id = c.id AND p.updated_at >= (NOW() - INTERVAL @p MONTH))
      AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.client_id = c.id AND i.updated_at >= (NOW() - INTERVAL @p MONTH))
      AND NOT EXISTS (SELECT 1 FROM tickets t WHERE t.client_id = c.id AND t.updated_at >= (NOW() - INTERVAL @p MONTH))";
  return [
    [
      'key' => 'enquiries', 'label' => 'Enquiries that did not become a client',
      'config' => 'RETENTION_ENQUIRY_MONTHS', 'unit' => 'month', 'starts_from' => 'last change to the enquiry',
      'queries' => [
        'enquiries' => "SELECT COUNT(*) FROM enquiries e
          WHERE COALESCE(e.status, '') <> 'won'
            AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.source_lead_id = e.id)
            AND e.updated_at < (NOW() - INTERVAL ? MONTH)",
      ],
    ],
    [
      'key' => 'clients', 'label' => 'Client, project and contract records',
      'config' => 'RETENTION_CLIENT_MONTHS', 'unit' => 'month',
      'starts_from' => 'last change to the client, its projects, invoices or portal messages',
      'queries' => [
        'clients' => "SELECT COUNT(*) FROM ($idleClient) x",
        'projects' => "SELECT COUNT(*) FROM projects WHERE client_id IN ($idleClient)",
        'contracts' => "SELECT COUNT(*) FROM contracts WHERE client_id IN ($idleClient)",
      ],
    ],
    [
      'key' => 'invoices', 'label' => 'Invoices and payments',
      'config' => 'RETENTION_INVOICE_MONTHS', 'unit' => 'month', 'starts_from' => 'issue date (HMRC rules decide the period)',
      'queries' => [
        'invoices' => 'SELECT COUNT(*) FROM invoices WHERE issued_at < (CURRENT_DATE - INTERVAL ? MONTH)',
        'payment_events' => 'SELECT COUNT(*) FROM payment_events pe JOIN invoices i ON i.id = pe.invoice_id
          WHERE i.issued_at < (CURRENT_DATE - INTERVAL ? MONTH)',
      ],
    ],
    [
      'key' => 'audit', 'label' => 'Audit log',
      'config' => 'RETENTION_AUDIT_MONTHS', 'unit' => 'month', 'starts_from' => 'entry date',
      'queries' => [
        'audit_log' => 'SELECT COUNT(*) FROM audit_log WHERE created_at < (NOW() - INTERVAL ? MONTH)',
      ],
    ],
    [
      'key' => 'support', 'label' => 'Portal messages and feedback',
      'config' => 'RETENTION_SUPPORT_MONTHS', 'unit' => 'month', 'starts_from' => 'last change to the message or feedback',
      'queries' => [
        'tickets' => 'SELECT COUNT(*) FROM tickets WHERE updated_at < (NOW() - INTERVAL ? MONTH)',
        'client_feedback' => 'SELECT COUNT(*) FROM client_feedback WHERE updated_at < (NOW() - INTERVAL ? MONTH)',
      ],
    ],
    [
      'key' => 'comms', 'label' => 'Comms conversations',
      'config' => 'RETENTION_COMMS_MONTHS', 'unit' => 'month', 'starts_from' => 'last message',
      'queries' => [
        'comm_threads' => 'SELECT COUNT(*) FROM comm_threads WHERE COALESCE(last_message_at, updated_at) < (NOW() - INTERVAL ? MONTH)',
        'comm_messages' => 'SELECT COUNT(*) FROM comm_messages m JOIN comm_threads t ON t.id = m.thread_id
          WHERE COALESCE(t.last_message_at, t.updated_at) < (NOW() - INTERVAL ? MONTH)',
      ],
    ],
    [
      'key' => 'staff', 'label' => 'Staff records and leave',
      'config' => 'RETENTION_STAFF_MONTHS', 'unit' => 'month', 'starts_from' => 'last change to a suspended staff account',
      'queries' => [
        'users' => "SELECT COUNT(*) FROM users WHERE role <> 'client' AND status <> 'active' AND updated_at < (NOW() - INTERVAL ? MONTH)",
        'leave_entries' => "SELECT COUNT(*) FROM leave_entries l JOIN users u ON u.id = l.user_id
          WHERE u.role <> 'client' AND u.status <> 'active' AND u.updated_at < (NOW() - INTERVAL ? MONTH)",
      ],
    ],
    [
      'key' => 'certificates', 'label' => 'Certificates',
      'config' => 'RETENTION_CERTIFICATE_MONTHS', 'unit' => 'month', 'starts_from' => 'issue date',
      'queries' => [
        'certificates' => 'SELECT COUNT(*) FROM certificates WHERE issued_at < (CURRENT_DATE - INTERVAL ? MONTH)',
      ],
    ],
    [
      'key' => 'deleted_files', 'label' => 'Soft-deleted files',
      'config' => 'RETENTION_DELETED_FILE_DAYS', 'unit' => 'day', 'starts_from' => 'deletion',
      'queries' => [
        'files' => 'SELECT COUNT(*) FROM files WHERE deleted_at IS NOT NULL AND deleted_at < (NOW() - INTERVAL ? DAY)',
      ],
    ],
  ];
}

/** The configured period: a positive int, null when not set, or false when invalid. */
function retention_period(string $var) {
  $v = $GLOBALS[$var] ?? null;
  if ($v === null) return null;
  if (is_int($v) && $v > 0 && $v <= 1200) return $v;
  if (is_string($v) && preg_match('/^[1-9]\d{0,3}$/', $v) && (int)$v <= 1200) return (int)$v;
  return false;
}

/**
 * One COUNT for a rule. `@p` in a query stands for the same period again, so
 * every placeholder is a bound parameter. Returns null only when a table is not
 * there yet (1146, an SQL step that has not run), so one missing table does not
 * stop the rest of the report. Every column used is in the original CREATE
 * TABLE, so an unknown column (1054) is a bug, and like any other SQL error it
 * is logged and thrown rather than reported as a quiet gap.
 *
 * The result of each step is checked as well as caught, so a PHP before 8.1
 * (where mysqli does not throw by default) behaves the same: a failure is
 * thrown as a mysqli_sql_exception, never counted as 0. This file does not
 * change the global mysqli_report() mode, because cron.php includes it too.
 */
function retention_count(mysqli $conn, string $sql, int $period): ?int {
  $n = substr_count($sql, '?') + substr_count($sql, '@p');
  $sql = str_replace('@p', '?', $sql);
  try {
    $s = $conn->prepare($sql);
    if ($s === false) throw new mysqli_sql_exception($conn->error, $conn->errno);
    $s->bind_param(str_repeat('i', $n), ...array_fill(0, $n, $period));
    if ($s->execute() === false) throw new mysqli_sql_exception($s->error, $s->errno);
    $res = $s->get_result();
    if ($res === false) throw new mysqli_sql_exception($s->error, $s->errno);
    $row = $res->fetch_row();
    return $row ? (int)$row[0] : 0;
  } catch (mysqli_sql_exception $e) {
    if ($e->getCode() === 1146) return null;
    error_log('_retention.php: SQL error ' . $e->getCode() . ': ' . $e->getMessage());
    throw $e;
  }
}

/** The whole report. Read only. */
function retention_report(mysqli $conn): array {
  $rules = [];
  foreach (retention_rules() as $r) {
    $period = retention_period($r['config']);
    $out = [
      'key' => $r['key'], 'label' => $r['label'], 'config_key' => '$' . $r['config'],
      'unit' => $r['unit'], 'starts_from' => $r['starts_from'],
      'period' => is_int($period) ? $period : null,
    ];
    if ($period === null) {
      $out['status'] = 'period_not_set';
      $out['counts'] = null;
    } elseif ($period === false) {
      $out['status'] = 'invalid_period';
      $out['counts'] = null;
    } else {
      $out['status'] = 'counted';
      $out['counts'] = [];
      foreach ($r['queries'] as $table => $sql) $out['counts'][$table] = retention_count($conn, $sql, $period);
    }
    $rules[] = $out;
  }
  return ['dry_run' => true, 'generated_at' => gmdate('Y-m-d\TH:i:s\Z'), 'rules' => $rules];
}

/** A plain-text summary of the report for the command line. */
function retention_report_text(array $report): string {
  $lines = [
    'Retention report (dry run). Nothing was deleted or changed.',
    'Generated ' . $report['generated_at'] . '. Periods are set in config.php; null means not decided.',
    '',
  ];
  foreach ($report['rules'] as $r) {
    if ($r['status'] === 'period_not_set') {
      $lines[] = "{$r['label']}: period not set ({$r['config_key']}). Nothing happens.";
      continue;
    }
    if ($r['status'] === 'invalid_period') {
      $lines[] = "{$r['label']}: invalid period in {$r['config_key']}. Use a whole number or null. Nothing counted.";
      continue;
    }
    $parts = [];
    foreach ($r['counts'] as $table => $n) $parts[] = $table . ' ' . ($n === null ? 'not available' : $n);
    $unit = $r['unit'] . ($r['period'] === 1 ? '' : 's');
    $lines[] = "{$r['label']}: older than {$r['period']} $unit from {$r['starts_from']}: " . implode(', ', $parts) . '.';
  }
  return implode("\n", $lines) . "\n";
}
