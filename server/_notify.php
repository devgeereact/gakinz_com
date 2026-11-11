<?php
/**
 * Owner alerts: a short plain-text email to the owner when something needs a person's attention and would
 * otherwise sit unseen in the CMS until someone opens it (a new enquiry, a data deletion request).
 *
 * Recipients: $OWNER_ALERTS (comma list) in config.php and nothing else. There is deliberately NO fallback to
 * $REPORT_RECIPIENTS: an alert carries a visitor's or client's personal details, and the digest list was chosen
 * for a different purpose, so alerts go only where the owner explicitly says. With no $OWNER_ALERTS, or no
 * $SMTP_HOST, nothing is sent and nothing is recorded: the CMS still shows the item, as before this existed.
 *
 * Best effort by design. The visitor's request has already succeeded and its row is saved; an alert that cannot
 * be sent must never turn that into an error. So the send runs after the response is finished (shutdown
 * function, after fastcgi_finish_request() or litespeed_finish_request() where the host has one; where it has
 * neither, the visitor can wait for the short SMTP timeout below, never longer) and its result is written to the
 * audit log: `$okAction` on success, `$failAction` on failure, with the reason. No queue and no retry.
 *
 * Flood guard: at most GK_ALERT_MAX_PER_HOUR alerts of one kind per hour. Past that the enquiry is still saved
 * and an `alert_suppressed` row is written instead of an email, so a script cannot turn the public form into an
 * inbox flood or get the mail account blocked (which would stop real alerts too).
 */
require_once __DIR__ . '/_smtp.php';

const GK_ALERT_MAX_PER_HOUR = 20;
const GK_ALERT_SMTP_TIMEOUT = 8; // seconds, connect and each read

/** The addresses to alert, or [] when alerts are not set up. */
function gk_owner_alert_recipients(): array {
  $raw = trim((string)($GLOBALS['OWNER_ALERTS'] ?? ''));
  if ($raw === '' || empty($GLOBALS['SMTP_HOST'])) return [];
  return array_values(array_filter(array_map('trim', preg_split('/[,;]+/', $raw))));
}

/** One line, valid UTF-8, no control characters, at most $max characters: safe in a subject line or an audit detail. */
function gk_oneline(string $s, int $max): string {
  $s = mb_scrub($s); // invalid UTF-8 would make the /u match below return null
  $s = trim((string)preg_replace('/[\x00-\x1f\x7f]+/u', ' ', $s));
  return mb_strlen($s) > $max ? mb_substr($s, 0, $max - 1) . '…' : $s;
}

/**
 * Queue an alert to go out once the response is finished. `$detail` is stored on the audit row
 * (a reference or an id, never the message body).
 */
function gk_owner_alert(mysqli $conn, string $subject, string $body, string $okAction, string $failAction, string $detail): void {
  $to = gk_owner_alert_recipients();
  if (!$to) return;
  register_shutdown_function(function () use ($conn, $to, $subject, $body, $okAction, $failAction, $detail) {
    // Let the visitor go first where the host supports it; on the built-in server this is a no-op.
    if (function_exists('fastcgi_finish_request')) @fastcgi_finish_request();
    elseif (function_exists('litespeed_finish_request')) @litespeed_finish_request();
    try {
      // This kind's sent and failed alerts in the last hour. Suppressed ones are not counted, so the guard lifts by itself.
      $recent = $conn->prepare("SELECT COUNT(*) AS c FROM audit_log WHERE action IN (?, ?) AND created_at > (NOW() - INTERVAL 1 HOUR)");
      $recent->bind_param('ss', $okAction, $failAction);
      $recent->execute();
      if ((int)($recent->get_result()->fetch_assoc()['c'] ?? 0) >= GK_ALERT_MAX_PER_HOUR) {
        audit($conn, null, 'alert_suppressed', $okAction . ' ' . gk_oneline($detail, 60));
        return;
      }
      $r = gk_send_email(['to' => $to, 'subject' => $subject, 'body' => $body, 'timeout' => GK_ALERT_SMTP_TIMEOUT]);
      if (!empty($r['ok'])) audit($conn, null, $okAction, $detail);
      else audit($conn, null, $failAction, gk_oneline($detail . ' · ' . ($r['error'] ?? 'send failed'), 250));
    } catch (Throwable $e) {
      try {
        audit($conn, null, $failAction, gk_oneline($detail . ' · ' . $e->getMessage(), 250));
      } catch (Throwable $e2) {
        error_log('_notify.php: could not record a failed owner alert: ' . $e2->getMessage()); // the host log is the last place to say so
      }
    }
  });
}
