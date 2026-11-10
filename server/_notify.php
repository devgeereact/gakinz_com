<?php
/**
 * Owner alerts: a short plain-text email to the owner when something needs a person's attention and would
 * otherwise sit unseen in the CMS until someone opens it (a new enquiry, a data deletion request).
 *
 * Recipients: $OWNER_ALERTS (comma list) in config.php, else $REPORT_RECIPIENTS (the weekly digest list).
 * With neither set, or with no $SMTP_HOST, nothing is sent and nothing is recorded: the CMS still shows the
 * item, exactly as before this existed.
 *
 * Best effort by design. The visitor's request has already succeeded and its row is saved; an alert that cannot
 * be sent must never turn that into an error. So the send runs after the response is finished (shutdown
 * function, after fastcgi_finish_request() or litespeed_finish_request() where the host has one) and its
 * result is written to the audit log: `$okAction` on success, `$failAction` on failure, with the reason.
 * The audit rows are the only memory; there is no queue and no retry (the item is in the CMS either way).
 */
require_once __DIR__ . '/_smtp.php';

/** The addresses to alert, or [] when alerts are not set up. */
function gk_owner_alert_recipients(): array {
  $raw = trim((string)($GLOBALS['OWNER_ALERTS'] ?? ''));
  if ($raw === '') $raw = trim((string)($GLOBALS['REPORT_RECIPIENTS'] ?? ''));
  if ($raw === '' || empty($GLOBALS['SMTP_HOST'])) return [];
  return array_values(array_filter(array_map('trim', preg_split('/[,;]+/', $raw))));
}

/** One line, no control characters, at most $max characters: safe inside a subject line or an audit detail. */
function gk_oneline(string $s, int $max): string {
  $s = trim(preg_replace('/[\x00-\x1f\x7f]+/u', ' ', $s));
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
      $r = gk_send_email(['to' => $to, 'subject' => $subject, 'body' => $body]);
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
