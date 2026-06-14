<?php
/**
 * Shared site-monitoring helper (care-plan uptime + SSL expiry).
 * Used by cron.php (scheduled sweep) and careplan.php (on-demand check).
 * No dependencies — cURL for HTTP, the openssl stream wrapper for the cert.
 */

/**
 * Check a URL. Returns:
 *   ['status' => int|null, 'ok' => bool, 'ssl_days' => int|null]
 * `ok` is true for a 2xx/3xx response. `ssl_days` is days until the TLS cert
 * expires (null for http:// or on error).
 */
function gk_site_check(string $url): array {
  $url = trim($url);
  if ($url === '' || !preg_match('#^https?://#i', $url)) {
    return ['status' => null, 'ok' => false, 'ssl_days' => null];
  }

  // ── HTTP status ──
  $status = null;
  $ok = false;
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_NOBODY => true,            // HEAD
      CURLOPT_FOLLOWLOCATION => true,
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 12,
      CURLOPT_CONNECTTIMEOUT => 8,
      CURLOPT_SSL_VERIFYPEER => false,   // we report status even on cert issues
      CURLOPT_USERAGENT => 'GAkinzMonitor/1.0',
    ]);
    curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: null;
    curl_close($ch);
    // Some servers reject HEAD — retry with GET if needed.
    if ($status === null || $status === 405 || $status === 0) {
      $ch = curl_init($url);
      curl_setopt_array($ch, [
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_USERAGENT => 'GAkinzMonitor/1.0',
      ]);
      curl_exec($ch);
      $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: null;
      curl_close($ch);
    }
  }
  if ($status !== null) $ok = $status >= 200 && $status < 400;

  // ── SSL expiry ──
  $sslDays = null;
  if (stripos($url, 'https://') === 0) {
    $host = parse_url($url, PHP_URL_HOST);
    $port = parse_url($url, PHP_URL_PORT) ?: 443;
    if ($host) {
      $ctx = stream_context_create(['ssl' => ['capture_peer_cert' => true, 'verify_peer' => false, 'verify_peer_name' => false]]);
      $client = @stream_socket_client("ssl://$host:$port", $errno, $errstr, 8, STREAM_CLIENT_CONNECT, $ctx);
      if ($client) {
        $params = stream_context_get_params($client);
        $cert = $params['options']['ssl']['peer_certificate'] ?? null;
        if ($cert) {
          $parsed = openssl_x509_parse($cert);
          if (!empty($parsed['validTo_time_t'])) {
            $sslDays = (int)floor(($parsed['validTo_time_t'] - time()) / 86400);
          }
        }
        fclose($client);
      }
    }
  }

  return ['status' => $status, 'ok' => $ok, 'ssl_days' => $sslDays];
}
