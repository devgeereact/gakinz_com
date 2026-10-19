<?php
/**
 * Scheduled jobs runner (GAkinzOS — automation). NOT user-authenticated. Run it
 * from a cPanel cron entry on the command line, which needs no key and keeps
 * the key out of web access logs (K-061):
 *
 *   php /home/ACCOUNT/public_html/cron.php job=all
 *
 * Over the web it is still gated by the shared secret:
 *
 *   wget -qO- "https://gakinz.com/cron.php?key=YOUR_CRON_KEY&job=all"
 *
 *   ?job=chase    email reminders for every overdue invoice
 *   ?job=billing  raise this month's invoice for each retainer/care-plan client
 *   ?job=digest   email a KPI digest to $REPORT_RECIPIENTS
 *   ?job=uptime   ping every care-plan prod URL, record HTTP + SSL-expiry
 *   ?job=prune    delete sessions, magic links and reset links a day past expiry
 *   ?job=all      run them all (default)
 *
 *   job=retention_report   command line only, and not part of `all`: prints a
 *                plain summary of the rows each proposed retention rule would
 *                affect (_retention.php). It counts and never changes a row.
 *
 * Config (config.php): $CRON_KEY (required), $REPORT_RECIPIENTS (comma list).
 * Every job degrades quietly if its dependency (SMTP, columns) is absent.
 */
require __DIR__ . '/_bootstrap.php';

if (PHP_SAPI === 'cli') {
  // `php cron.php job=prune`. Only someone with shell or cron access to the
  // account can run PHP this way, so no key is needed.
  parse_str(implode('&', array_slice($argv ?? [], 1)), $cli);
  $job = (string)($cli['job'] ?? 'all');
} else {
  $key = $_GET['key'] ?? '';
  $expected = $GLOBALS['CRON_KEY'] ?? '';
  if ($expected === '' || !hash_equals((string)$expected, (string)$key)) fail('Forbidden.', 403);
  $job = $_GET['job'] ?? 'all';
}
// Retention dry run: command line only, plain text, read only. Over the web it
// is refused even with the key, so the report never lands in an access log.
if ($job === 'retention_report') {
  if (PHP_SAPI !== 'cli') fail('retention_report runs from the command line only.', 400);
  require_once __DIR__ . '/_retention.php';
  header_remove('Content-Type');
  try {
    echo retention_report_text(retention_report($conn));
  } catch (mysqli_sql_exception $e) {
    fwrite(STDERR, 'Retention report failed: SQL error ' . $e->getCode() . "\n");
    exit(1);
  }
  exit(0);
}

$out = [];

if ($job === 'all' || $job === 'chase')   $out['chase']   = cron_chase($conn);
if ($job === 'all' || $job === 'billing') $out['billing'] = cron_billing($conn);
if ($job === 'all' || $job === 'uptime')  $out['uptime']  = cron_uptime($conn);
if ($job === 'all' || $job === 'digest')  $out['digest']  = cron_digest($conn);
if ($job === 'all' || $job === 'prune')   $out['prune']   = cron_prune($conn);

ok(['ran' => $out]);

// ── Jobs ─────────────────────────────────────────────────────────────────────
/**
 * Removes sign-in credentials that can no longer be used: sessions, magic
 * links and reset links more than a day past their expiry. A day's grace keeps
 * a just-expired row readable while someone investigates a sign-in problem.
 * Nothing here is a business record (docs/PRIVACY-READINESS.md section 6).
 */
function cron_prune(mysqli $conn): array {
  $out = [];
  foreach (['auth_tokens', 'magic_links', 'password_resets'] as $table) {
    $ok = $conn->query("DELETE FROM $table WHERE expires_at < (NOW() - INTERVAL 1 DAY)");
    $out[$table] = $ok ? $conn->affected_rows : 'failed';
  }
  if (array_sum(array_filter($out, 'is_int')) > 0) audit($conn, null, 'cron_prune', json_encode($out));
  return $out;
}

function cron_chase(mysqli $conn): array {
  if (empty($GLOBALS['SMTP_HOST'])) return ['skipped' => 'no smtp'];
  require_once __DIR__ . '/_smtp.php';
  $sent = 0; $skipped = 0;
  $sql = 'SELECT i.id, i.number, i.due_at, c.company, c.email,
                 (SELECT COALESCE(SUM(qty*unit_price),0) FROM invoice_items it WHERE it.invoice_id=i.id) AS sub, i.vat_rate
          FROM invoices i JOIN clients c ON c.id = i.client_id
          WHERE i.status = "sent" AND i.due_at IS NOT NULL AND i.due_at < CURRENT_DATE AND i.deleted_at IS NULL';
  if ($res = $conn->query($sql)) {
    while ($r = $res->fetch_assoc()) {
      if (empty($r['email'])) { $skipped++; continue; }
      $total = round((float)$r['sub'] * (1 + (float)$r['vat_rate'] / 100), 2);
      $num = $r['number'] ?: ('#' . $r['id']);
      $body = "Hello {$r['company']},\n\nInvoice $num for £" . number_format($total, 2)
            . " was due on {$r['due_at']} and remains unpaid. Please arrange payment. "
            . "If already paid, thank you — disregard this note.\n\nGAkinz";
      $ok = gk_send_email(['to' => $r['email'], 'subject' => "Payment reminder — invoice $num", 'body' => $body]);
      if (!empty($ok['ok'])) { $sent++; audit($conn, null, 'cron_chase', "$num → {$r['email']}"); } else { $skipped++; }
    }
  }
  return ['sent' => $sent, 'skipped' => $skipped];
}

function cron_billing(mysqli $conn): array {
  $created = 0;
  $month = date('Y-m');
  $res = $conn->query("SELECT id, company FROM clients WHERE tag = 'retainer' AND retainer_amount > 0 AND deleted_at IS NULL");
  if (!$res) return ['skipped' => 'no retainer column?'];
  while ($c = $res->fetch_assoc()) {
    $cid = (int)$c['id'];
    // Already billed this month?
    $chk = $conn->prepare("SELECT id FROM invoices WHERE client_id = ? AND deleted_at IS NULL AND DATE_FORMAT(issued_at,'%Y-%m') = ? AND notes LIKE 'Monthly retainer%' LIMIT 1");
    $chk->bind_param('is', $cid, $month);
    $chk->execute();
    if ($chk->get_result()->fetch_assoc()) continue;

    $amtRes = $conn->prepare('SELECT retainer_amount FROM clients WHERE id = ?');
    $amtRes->bind_param('i', $cid);
    $amtRes->execute();
    $amount = (float)$amtRes->get_result()->fetch_assoc()['retainer_amount'];

    $issued = date('Y-m-d');
    $due = date('Y-m-d', strtotime('+14 days'));
    $notes = 'Monthly retainer — ' . date('F Y');
    $ins = $conn->prepare('INSERT INTO invoices (client_id, status, notes, issued_at, due_at) VALUES (?, "sent", ?, ?, ?)');
    $ins->bind_param('isss', $cid, $notes, $issued, $due);
    $ins->execute();
    $iid = $conn->insert_id;
    $num = sprintf('GK-INV-%04d', $iid);
    $setNum = $conn->prepare('UPDATE invoices SET number = ? WHERE id = ?');
    $setNum->bind_param('si', $num, $iid);
    $setNum->execute();
    $desc = 'Care plan / retainer — ' . date('F Y');
    $it = $conn->prepare('INSERT INTO invoice_items (invoice_id, description, qty, unit_price) VALUES (?, ?, 1, ?)');
    $it->bind_param('isd', $iid, $desc, $amount);
    $it->execute();
    $created++;
    audit($conn, null, 'cron_billing', "$num → {$c['company']} £$amount");
  }
  return ['created' => $created];
}

function cron_uptime(mysqli $conn): array {
  require_once __DIR__ . '/_monitor.php';
  $checked = 0; $down = 0;
  $res = @$conn->query("SELECT project_id, prod_url FROM project_dev WHERE prod_url IS NOT NULL AND prod_url <> ''");
  if (!$res) return ['skipped' => 'no project_dev/monitor columns?'];
  while ($r = $res->fetch_assoc()) {
    $pid = (int)$r['project_id'];
    $c = gk_site_check($r['prod_url']);
    if (!$c['ok']) $down++;
    $status = $c['status'];
    $ssl = $c['ssl_days'];
    $upd = @$conn->prepare('UPDATE project_dev SET last_http_status = ?, ssl_days_left = ?, last_checked_at = NOW() WHERE project_id = ?');
    if ($upd) { $upd->bind_param('iii', $status, $ssl, $pid); $upd->execute(); }
    $checked++;
  }
  return ['checked' => $checked, 'down' => $down];
}

function cron_digest(mysqli $conn): array {
  $recips = $GLOBALS['REPORT_RECIPIENTS'] ?? '';
  if ($recips === '' || empty($GLOBALS['SMTP_HOST'])) return ['skipped' => 'no recipients/smtp'];
  require_once __DIR__ . '/_smtp.php';

  $val = function (string $sql) use ($conn) {
    $r = @$conn->query($sql);
    if (!$r) return 0;
    $row = $r->fetch_assoc();
    return $row ? array_values($row)[0] : 0;
  };
  $openLeads = $val("SELECT COUNT(*) FROM enquiries WHERE status NOT IN ('won','lost') AND deleted_at IS NULL");
  $activeProjects = $val("SELECT COUNT(*) FROM projects WHERE status <> 'launched' AND deleted_at IS NULL");
  $paid = $val("SELECT COALESCE(SUM((SELECT COALESCE(SUM(qty*unit_price),0) FROM invoice_items it WHERE it.invoice_id=i.id)*(1+i.vat_rate/100)),0) FROM invoices i WHERE i.status='paid' AND i.deleted_at IS NULL");
  $outstanding = $val("SELECT COALESCE(SUM((SELECT COALESCE(SUM(qty*unit_price),0) FROM invoice_items it WHERE it.invoice_id=i.id)*(1+i.vat_rate/100)),0) FROM invoices i WHERE i.status='sent' AND i.deleted_at IS NULL");
  $overdue = $val("SELECT COUNT(*) FROM invoices WHERE status='sent' AND due_at < CURRENT_DATE AND deleted_at IS NULL");
  $openTickets = $val("SELECT COUNT(*) FROM tickets WHERE status <> 'resolved' AND deleted_at IS NULL");

  $body = "GAkinz weekly digest — " . date('j M Y') . "\n\n"
        . "Open leads:       $openLeads\n"
        . "Active projects:  $activeProjects\n"
        . "Revenue paid:     £" . number_format((float)$paid, 2) . "\n"
        . "Outstanding:      £" . number_format((float)$outstanding, 2) . " ($overdue overdue)\n"
        . "Open tickets:     $openTickets\n\n— GAkinzOS";
  $ok = gk_send_email(['to' => $recips, 'subject' => 'GAkinz weekly digest', 'body' => $body]);
  if (!empty($ok['ok'])) { audit($conn, null, 'cron_digest', $recips); return ['sent_to' => $recips]; }
  return ['error' => $ok['error'] ?? 'send failed'];
}
