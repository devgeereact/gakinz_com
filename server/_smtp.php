<?php
/**
 * Shared SMTP transport for GAkinzOS (mail.php + comms.php).
 *
 * One tiny built-in SMTP client (no Composer). Implicit SSL (465) or STARTTLS
 * (587) with AUTH LOGIN, plus a PHP mail() fallback when no SMTP host is set.
 * Config lives in config.php as $SMTP_* (secrets never leave the server).
 *
 *   gk_send_email([
 *     'to'          => 'a@b.com' | ['a@b.com', ...],   // required
 *     'cc'          => '' | [...],
 *     'subject'     => '...',                            // required
 *     'body'        => '...',                            // required (plain text, UTF-8)
 *     'in_reply_to' => '<id@host>',                      // optional, threading
 *     'references'  => '<id@host> ...',                  // optional, threading
 *   ]) → ['ok' => bool, 'error' => string, 'message_id' => string]
 *
 * Addresses are assumed already-validated by the caller (FILTER_VALIDATE_EMAIL).
 */

/**
 * Low-level transport. Returns [bool ok, string error].
 * Supports implicit SSL (port 465) and STARTTLS (port 587) with AUTH LOGIN.
 */
function gk_smtp_send(array $cfg, string $rawMessage, array $rcpts): array {
  $host = $cfg['host']; $port = (int)$cfg['port']; $secure = $cfg['secure'];
  $user = $cfg['user']; $pass = $cfg['pass']; $from = $cfg['from'];

  $transport = ($secure === 'ssl') ? "ssl://$host" : "tcp://$host";
  $ctx = stream_context_create(['ssl' => ['verify_peer' => false, 'verify_peer_name' => false]]);
  $fp = @stream_socket_client("$transport:$port", $errno, $errstr, 20, STREAM_CLIENT_CONNECT, $ctx);
  if (!$fp) return [false, "Connect failed: $errstr ($errno)"];
  stream_set_timeout($fp, 20);

  $read = function () use ($fp): string {
    $data = '';
    while (($line = fgets($fp, 4096)) !== false) {
      $data .= $line;
      // Terminal line of a multi-line SMTP reply is "NNN " (code + space);
      // continuation lines are "NNN-". Real EHLO replies can exceed 512 bytes,
      // so read big and match the start of the line, not a fixed offset.
      if (preg_match('/^\d{3} /', $line)) break;
      if (feof($fp)) break;
    }
    return $data;
  };
  $cmd = function (string $c) use ($fp, $read): string {
    fwrite($fp, $c . "\r\n");
    return $read();
  };
  $expect = function (string $resp, string $code) use ($fp): ?string {
    if (strncmp($resp, $code, 3) !== 0) { fclose($fp); return "SMTP error: " . trim($resp); }
    return null;
  };

  $greet = $read();
  if ($e = $expect($greet, '220')) return [false, $e];

  $ehloName = $_SERVER['SERVER_NAME'] ?? 'gakinz.com';
  $resp = $cmd("EHLO $ehloName");
  if ($e = $expect($resp, '250')) return [false, $e];

  if ($secure === 'tls') {
    $resp = $cmd('STARTTLS');
    if ($e = $expect($resp, '220')) return [false, $e];
    if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
      fclose($fp); return [false, 'STARTTLS negotiation failed'];
    }
    $resp = $cmd("EHLO $ehloName");
    if ($e = $expect($resp, '250')) return [false, $e];
  }

  $resp = $cmd('AUTH LOGIN');
  if ($e = $expect($resp, '334')) return [false, $e];
  $resp = $cmd(base64_encode($user));
  if ($e = $expect($resp, '334')) return [false, $e];
  $resp = $cmd(base64_encode($pass));
  if ($e = $expect($resp, '235')) return [false, 'Authentication failed'];

  $resp = $cmd("MAIL FROM:<$from>");
  if ($e = $expect($resp, '250')) return [false, $e];
  foreach ($rcpts as $r) {
    $resp = $cmd("RCPT TO:<$r>");
    if (strncmp($resp, '25', 2) !== 0) { fclose($fp); return [false, "Recipient rejected: " . trim($resp)]; }
  }
  $resp = $cmd('DATA');
  if ($e = $expect($resp, '354')) return [false, $e];

  // Dot-stuff and terminate.
  $body = preg_replace('/^\./m', '..', $rawMessage);
  fwrite($fp, $body . "\r\n.\r\n");
  $resp = $read();
  if ($e = $expect($resp, '250')) return [false, $e];
  $cmd('QUIT');
  fclose($fp);
  return [true, ''];
}

/**
 * High-level send: builds the RFC 822 message and dispatches via SMTP (or the
 * PHP mail() fallback). Centralises header construction so every sender on the
 * platform produces identical, injection-safe mail.
 */
function gk_send_email(array $opts): array {
  $toList = is_array($opts['to'] ?? null)
    ? $opts['to']
    : array_filter(array_map('trim', preg_split('/[,;]+/', (string)($opts['to'] ?? ''))));
  $ccList = is_array($opts['cc'] ?? null)
    ? $opts['cc']
    : array_filter(array_map('trim', preg_split('/[,;]+/', (string)($opts['cc'] ?? ''))));
  $toList = array_values($toList);
  $ccList = array_values($ccList);

  $subject = (string)($opts['subject'] ?? '');
  $bodyTxt = (string)($opts['body'] ?? '');
  // Strip CR/LF from header-bound fields — without this a caller could inject
  // extra headers (Bcc, a second body, etc.) — classic mail header injection.
  $inReplyTo  = preg_replace('/[\r\n]+/', '', trim((string)($opts['in_reply_to'] ?? '')));
  $references = preg_replace('/[\r\n]+/', '', trim((string)($opts['references'] ?? '')));

  $host      = $GLOBALS['SMTP_HOST'] ?? '';
  $fromEmail = $opts['from'] ?? ($GLOBALS['SMTP_FROM'] ?? ($GLOBALS['SMTP_USER'] ?? ''));
  $fromName  = $opts['from_name'] ?? ($GLOBALS['SMTP_FROM_NAME'] ?? 'GAkinz');

  // Build the RFC 822 message (UTF-8, plain text).
  $encSubject  = '=?UTF-8?B?' . base64_encode($subject) . '?=';
  $encFromName = '=?UTF-8?B?' . base64_encode($fromName) . '?=';
  $date  = date('r');
  $msgId = '<' . bin2hex(random_bytes(16)) . '@' . preg_replace('/^.*@/', '', $fromEmail) . '>';
  $headers = [
    "Date: $date",
    "From: $encFromName <$fromEmail>",
    'To: ' . implode(', ', $toList),
  ];
  if ($ccList) $headers[] = 'Cc: ' . implode(', ', $ccList);
  $headers[] = "Subject: $encSubject";
  $headers[] = "Message-ID: $msgId";
  if ($inReplyTo)  $headers[] = "In-Reply-To: $inReplyTo";
  if ($references) $headers[] = "References: $references";
  $headers[] = 'MIME-Version: 1.0';
  $headers[] = 'Content-Type: text/plain; charset=UTF-8';
  $headers[] = 'Content-Transfer-Encoding: 8bit';
  $raw = implode("\r\n", $headers) . "\r\n\r\n" . str_replace("\n", "\r\n", str_replace("\r\n", "\n", $bodyTxt));

  $rcpts = array_merge($toList, $ccList);

  if ($host !== '') {
    [$sent, $err] = gk_smtp_send([
      'host'   => $host,
      'port'   => $GLOBALS['SMTP_PORT'] ?? 465,
      'secure' => $GLOBALS['SMTP_SECURE'] ?? 'ssl',
      'user'   => $GLOBALS['SMTP_USER'] ?? '',
      'pass'   => $GLOBALS['SMTP_PASS'] ?? '',
      'from'   => $fromEmail,
    ], $raw, $rcpts);
  } else {
    // Fallback to PHP mail()
    $mailHeaders = "From: $encFromName <$fromEmail>\r\n";
    if ($ccList) $mailHeaders .= 'Cc: ' . implode(', ', $ccList) . "\r\n";
    if ($inReplyTo)  $mailHeaders .= "In-Reply-To: $inReplyTo\r\n";
    $mailHeaders .= "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n";
    $sent = @mail(implode(', ', $toList), $subject, $bodyTxt, $mailHeaders);
    $err  = $sent ? '' : 'PHP mail() failed (no SMTP configured).';
  }

  return ['ok' => (bool)$sent, 'error' => $err, 'message_id' => $msgId];
}
