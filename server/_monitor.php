<?php
/**
 * Shared site-monitoring helper (care-plan uptime + SSL expiry).
 * Used by cron.php (scheduled sweep) and careplan.php (on-demand check).
 * No dependencies — cURL for HTTP, the openssl stream wrapper for the cert.
 */

/**
 * Is this IP one the monitor must never be pointed at? Blocks loopback,
 * private, link-local, carrier-grade NAT and reserved ranges, for IPv4 and
 * IPv6 alike.
 */
function gk_ip_is_blocked(string $ip): bool {
  if (filter_var($ip, FILTER_VALIDATE_IP) === false) return true;
  // Covers 10/8, 172.16/12, 192.168/16, fc00::/7 (private) and 0/8, 127/8,
  // 169.254/16, 240/4, ::1, ::, ::ffff:0:0/96, fe80::/10 (reserved).
  if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) return true;
  // 100.64.0.0/10, carrier-grade NAT, which the filter flags do not cover.
  $packed = @inet_pton($ip);
  if ($packed !== false && strlen($packed) === 4) {
    $long = ip2long($ip);
    if ($long !== false && ($long & 0xFFC00000) === 0x64400000) return true;
  }
  return false;
}

/**
 * Resolve a host to the addresses the request would actually reach, and return
 * them only if every one is publicly routable. Returns [] when the host cannot
 * be resolved or any address is off limits.
 *
 * The monitor fetches a prod_url that staff typed into dev.php, so without this
 * a staff account can aim the server at its own localhost services or at the
 * cloud metadata endpoint on a link-local address and read the response status.
 */
function gk_resolve_public(string $host): array {
  if ($host === '') return [];
  // A bare IP in the URL is checked as-is; no DNS involved.
  if (filter_var($host, FILTER_VALIDATE_IP) !== false) {
    return gk_ip_is_blocked($host) ? [] : [$host];
  }
  $ips = [];
  $v4 = @gethostbynamel($host);
  if (is_array($v4)) $ips = $v4;
  $aaaa = @dns_get_record($host, DNS_AAAA);
  if (is_array($aaaa)) {
    foreach ($aaaa as $rec) if (!empty($rec['ipv6'])) $ips[] = $rec['ipv6'];
  }
  $ips = array_values(array_unique($ips));
  if (!$ips) return [];
  // One bad address is enough to refuse: a host that resolves to both a public
  // and a private address is exactly the rebinding case worth refusing.
  foreach ($ips as $ip) if (gk_ip_is_blocked($ip)) return [];
  return $ips;
}

/**
 * Check a URL. Returns:
 *   ['status' => int|null, 'ok' => bool, 'ssl_days' => int|null]
 * `ok` is true for a 2xx/3xx response. `ssl_days` is days until the TLS cert
 * expires (null for http:// or on error).
 *
 * A URL that is malformed, or that resolves anywhere other than the public
 * internet, returns the same all-null "could not check" result as an
 * unreachable site. It is never fetched.
 */
function gk_site_check(string $url): array {
  $unchecked = ['status' => null, 'ok' => false, 'ssl_days' => null];
  $url = trim($url);
  if ($url === '' || !preg_match('#^https?://#i', $url)) return $unchecked;

  $host = (string)(parse_url($url, PHP_URL_HOST) ?: '');
  $scheme = strtolower((string)(parse_url($url, PHP_URL_SCHEME) ?: ''));
  if (!in_array($scheme, ['http', 'https'], true)) return $unchecked;
  // Credentials in the URL are a redirect-confusion trick and no legitimate
  // monitored site needs them.
  if (parse_url($url, PHP_URL_USER) !== null || parse_url($url, PHP_URL_PASS) !== null) return $unchecked;

  $ips = gk_resolve_public($host);
  if (!$ips) return $unchecked;
  $port = (int)(parse_url($url, PHP_URL_PORT) ?: ($scheme === 'https' ? 443 : 80));

  // ── HTTP status ──
  $status = null;
  $ok = false;
  if (function_exists('curl_init')) {
    // Shared options. Redirects are NOT followed: a 30x to an internal address
    // would walk straight past the check above, and for an uptime probe the
    // redirect status is a perfectly good answer. The resolved address is
    // pinned so the name cannot resolve to something else between the check
    // and the connection.
    $base = [
      CURLOPT_FOLLOWLOCATION => false,
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 12,
      CURLOPT_CONNECTTIMEOUT => 8,
      CURLOPT_SSL_VERIFYPEER => true,
      CURLOPT_SSL_VERIFYHOST => 2,
      CURLOPT_USERAGENT => 'GAkinzMonitor/1.0',
      CURLOPT_RESOLVE => ["$host:$port:{$ips[0]}"],
    ];
    if (defined('CURLPROTO_HTTP') && defined('CURLPROTO_HTTPS')) {
      $base[CURLOPT_PROTOCOLS] = CURLPROTO_HTTP | CURLPROTO_HTTPS;
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, $base + [CURLOPT_NOBODY => true]); // HEAD
    curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: null;
    curl_close($ch);
    // Some servers reject HEAD — retry with GET if needed.
    if ($status === null || $status === 405 || $status === 0) {
      $ch = curl_init($url);
      curl_setopt_array($ch, $base);
      curl_exec($ch);
      $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: null;
      curl_close($ch);
    }
  }
  if ($status !== null) $ok = $status >= 200 && $status < 400;

  // ── SSL expiry ──
  // Peer verification stays off here and only here: the whole point is to read
  // the expiry date off a certificate that may already be expired or otherwise
  // invalid, which a verifying connection would refuse to complete. The
  // connection goes to the address validated above, with the hostname passed
  // separately for SNI, so it cannot be steered somewhere internal.
  $sslDays = null;
  if ($scheme === 'https') {
    if ($host !== '') {
      $ctx = stream_context_create(['ssl' => [
        'capture_peer_cert' => true,
        'verify_peer' => false,
        'verify_peer_name' => false,
        'peer_name' => $host,
        'SNI_enabled' => true,
      ]]);
      $target = strpos($ips[0], ':') !== false ? "[{$ips[0]}]" : $ips[0]; // bracket IPv6
      $client = @stream_socket_client("ssl://$target:$port", $errno, $errstr, 8, STREAM_CLIENT_CONNECT, $ctx);
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
