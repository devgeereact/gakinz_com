<?php
/**
 * Shared Slack transport. Posts to an Incoming Webhook ($SLACK_WEBHOOK_URL).
 * Best-effort: returns ['ok'=>bool,'error'=>?] and never throws, so callers can
 * fire-and-forget (e.g. broadcasting an announcement) without breaking.
 */
function gk_slack_post(string $text): array {
  $hook = $GLOBALS['SLACK_WEBHOOK_URL'] ?? '';
  if ($hook === '') return ['ok' => false, 'error' => 'not_configured'];
  if (!function_exists('curl_init')) return ['ok' => false, 'error' => 'no_curl'];

  $ch = curl_init($hook);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['text' => $text]),
    CURLOPT_TIMEOUT => 8,
  ]);
  $resp = curl_exec($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($code === 200 && trim((string)$resp) === 'ok') return ['ok' => true];
  return ['ok' => false, 'error' => "http $code"];
}
