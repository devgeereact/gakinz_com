<?php
/**
 * Mailbox (GAkinzOS). Protected. SMTP send + IMAP inbox so staff read and
 * answer hello@gakinz.com without leaving the platform.
 *
 *   GET  /mail.php?action=status                    → { smtp, imap, imap_ext }
 *   GET  /mail.php?action=inbox&mailbox=INBOX&limit=30&search=
 *                                                    → [ {uid, subject, from_*, date, seen, answered, snippet} ]
 *   GET  /mail.php?action=message&uid=N&mailbox=INBOX → full message (marks seen)
 *   POST /mail.php?action=send  {to, subject, body, cc?, in_reply_to?, references?}
 *   POST /mail.php?action=seen  {uid, mailbox?, seen?}
 *
 * Config lives in config.php as $SMTP_* / $IMAP_* (secrets never leave the server).
 * SMTP uses a tiny built-in client (no Composer). IMAP needs the PHP imap ext.
 */
require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_smtp.php';

// Mail is sensitive (real correspondence) — keep it tight to senior staff.
const MAIL_ROLES = ['super_admin', 'admin', 'manager'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? ($method === 'GET' ? 'inbox' : '');

// Pull the config variables (set at top level of config.php).
$smtpHost = $GLOBALS['SMTP_HOST'] ?? '';
$imapHost = $GLOBALS['IMAP_HOST'] ?? '';

// ── Capability probe ─────────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'status') {
  require_auth($conn, MAIL_ROLES);
  ok([
    'smtp'     => $smtpHost !== '',
    'imap'     => $imapHost !== '' && function_exists('imap_open'),
    'imap_ext' => function_exists('imap_open'),
  ]);
}

// ── IMAP helpers ─────────────────────────────────────────────────────────────
function imap_mailbox_ref(string $host, int $port, string $mailbox = 'INBOX'): string {
  // {host:993/imap/ssl/novalidate-cert}MAILBOX
  return '{' . $host . ':' . $port . '/imap/ssl/novalidate-cert}' . $mailbox;
}

function imap_connect_or_fail(): array {
  $host = $GLOBALS['IMAP_HOST'] ?? '';
  $port = (int)($GLOBALS['IMAP_PORT'] ?? 993);
  $user = $GLOBALS['IMAP_USER'] ?? '';
  $pass = $GLOBALS['IMAP_PASS'] ?? '';
  if ($host === '') fail('Inbox is not configured.', 503);
  if (!function_exists('imap_open')) fail('The server is missing the PHP imap extension.', 503);
  $mailbox = preg_replace('/[^A-Za-z0-9_.\/\- ]/', '', $_GET['mailbox'] ?? 'INBOX') ?: 'INBOX';
  $mailbox = str_replace('..', '', $mailbox); // no namespace traversal
  $ref = imap_mailbox_ref($host, $port, $mailbox);
  $imap = @imap_open($ref, $user, $pass, 0, 1);
  if (!$imap) { error_log('GAkinz mail IMAP open: ' . imap_last_error()); fail('Could not reach the inbox.', 502); }
  return [$imap, $host, $port, $mailbox];
}

function decode_mime(string $s): string {
  $out = '';
  foreach (imap_mime_header_decode($s) as $p) {
    $cs = strtoupper($p->charset);
    $out .= ($cs === 'DEFAULT' || $cs === 'UTF-8' || $cs === 'US-ASCII')
      ? $p->text
      : (@mb_convert_encoding($p->text, 'UTF-8', $cs) ?: $p->text);
  }
  return $out;
}

function decode_body(string $data, int $encoding): string {
  switch ($encoding) {
    case ENC8BIT:            return imap_8bit($data);
    case ENCBINARY:          return imap_binary($data);
    case ENCBASE64:          return base64_decode($data);
    case ENCQUOTEDPRINTABLE: return quoted_printable_decode($data);
    default:                 return $data;
  }
}

/** Walk the MIME structure to pull the first text/plain and text/html parts. */
function fetch_text_parts($imap, int $uid, $structure, string $prefix = ''): array {
  $plain = '';
  $html = '';
  if (!isset($structure->parts) || !$structure->parts) {
    // single-part message
    $raw = imap_fetchbody($imap, $uid, $prefix ?: '1', FT_UID);
    $decoded = decode_body($raw, $structure->encoding ?? 0);
    $sub = strtoupper($structure->subtype ?? 'PLAIN');
    if ($sub === 'HTML') $html = $decoded; else $plain = $decoded;
    return [$plain, $html];
  }
  foreach ($structure->parts as $i => $part) {
    $section = $prefix === '' ? (string)($i + 1) : $prefix . '.' . ($i + 1);
    $type = (int)($part->type ?? 0); // 0 = text, 1 = multipart
    $sub = strtoupper($part->subtype ?? '');
    $disposition = strtoupper($part->disposition ?? '');
    if ($type === 1) {
      [$p2, $h2] = fetch_text_parts($imap, $uid, $part, $section);
      if ($p2 && !$plain) $plain = $p2;
      if ($h2 && !$html) $html = $h2;
    } elseif ($type === 0 && $disposition !== 'ATTACHMENT') {
      $raw = imap_fetchbody($imap, $uid, $section, FT_UID);
      $decoded = decode_body($raw, $part->encoding ?? 0);
      // charset → UTF-8
      $charset = '';
      foreach (($part->parameters ?? []) as $pm) {
        if (strtoupper($pm->attribute) === 'CHARSET') $charset = strtoupper($pm->value);
      }
      if ($charset && $charset !== 'UTF-8' && $charset !== 'US-ASCII') {
        $decoded = @mb_convert_encoding($decoded, 'UTF-8', $charset) ?: $decoded;
      }
      if ($sub === 'HTML' && !$html) $html = $decoded;
      elseif ($sub === 'PLAIN' && !$plain) $plain = $decoded;
    }
  }
  return [$plain, $html];
}

// ── Inbox list ───────────────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'inbox') {
  require_auth($conn, MAIL_ROLES);
  [$imap, , , ] = imap_connect_or_fail();
  $limit = min(100, max(1, (int)($_GET['limit'] ?? 30)));
  $search = trim((string)($_GET['search'] ?? ''));

  if ($search !== '') {
    $safe = preg_replace('/[\r\n"\\\\]/', '', $search); // no IMAP-criteria injection
    $crit = 'TEXT "' . $safe . '"';
    $nums = imap_search($imap, $crit, SE_UID) ?: [];
  } else {
    // newest first by arrival
    $total = imap_num_msg($imap);
    $nums = [];
    for ($i = $total; $i >= 1 && count($nums) < $limit; $i--) {
      $nums[] = imap_uid($imap, $i);
    }
  }
  // Cap, newest first.
  if ($search !== '') { rsort($nums); $nums = array_slice($nums, 0, $limit); }

  $out = [];
  foreach ($nums as $uid) {
    $ov = imap_fetch_overview($imap, (string)$uid, FT_UID);
    if (!$ov || !isset($ov[0])) continue;
    $o = $ov[0];
    $fromName = isset($o->from) ? decode_mime($o->from) : '';
    $fromEmail = '';
    if (preg_match('/<([^>]+)>/', $o->from ?? '', $m)) { $fromEmail = $m[1]; }
    elseif (filter_var(trim($o->from ?? ''), FILTER_VALIDATE_EMAIL)) { $fromEmail = trim($o->from); }
    $out[] = [
      'uid'        => (int)$uid,
      'subject'    => $o->subject ? decode_mime($o->subject) : '(no subject)',
      'from_name'  => preg_replace('/\s*<[^>]+>\s*/', '', $fromName) ?: $fromEmail,
      'from_email' => $fromEmail,
      'date'       => isset($o->date) ? date('c', strtotime($o->date)) : null,
      'seen'       => !empty($o->seen),
      'answered'   => !empty($o->answered),
      'message_id' => $o->message_id ?? '',
      'size'       => (int)($o->size ?? 0),
    ];
  }
  imap_close($imap);
  ok($out);
}

// ── Single message ───────────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'message') {
  require_auth($conn, MAIL_ROLES);
  $uid = (int)($_GET['uid'] ?? 0);
  if ($uid <= 0) fail('A message id is required.');
  [$imap, , , ] = imap_connect_or_fail();

  $ovs = imap_fetch_overview($imap, (string)$uid, FT_UID);
  if (!$ovs || !isset($ovs[0])) { imap_close($imap); fail('Message not found.', 404); }
  $o = $ovs[0];
  $structure = imap_fetchstructure($imap, $uid, FT_UID);
  if (!$structure) { imap_close($imap); fail('Could not read this message.', 502); }
  [$plain, $html] = fetch_text_parts($imap, $uid, $structure);
  // Defensive: strip any leftover quoted-printable soft line breaks (a literal
  // '=' at end of line) that a transfer-encoding misreport left undecoded.
  $plain = preg_replace('/=\r?\n/', '', $plain);
  if ($plain === '' && $html !== '') {
    $plain = trim(html_entity_decode(strip_tags(preg_replace('/<(br|\/p|\/div)[^>]*>/i', "\n", $html)), ENT_QUOTES, 'UTF-8'));
  }

  $fromName = isset($o->from) ? decode_mime($o->from) : '';
  $fromEmail = '';
  if (preg_match('/<([^>]+)>/', $o->from ?? '', $m)) $fromEmail = $m[1];
  elseif (filter_var(trim($o->from ?? ''), FILTER_VALIDATE_EMAIL)) $fromEmail = trim($o->from);

  imap_setflag_full($imap, (string)$uid, '\\Seen', ST_UID); // mark read

  $result = [
    'uid'        => $uid,
    'subject'    => $o->subject ? decode_mime($o->subject) : '(no subject)',
    'from_name'  => preg_replace('/\s*<[^>]+>\s*/', '', $fromName) ?: $fromEmail,
    'from_email' => $fromEmail,
    'to'         => isset($o->to) ? decode_mime($o->to) : '',
    'date'       => isset($o->date) ? date('c', strtotime($o->date)) : null,
    'message_id' => $o->message_id ?? '',
    'text'       => $plain,
    'html'       => $html,
  ];
  imap_close($imap);
  ok($result);
}

// ── Mark seen / unseen ───────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'seen') {
  require_auth($conn, MAIL_ROLES);
  $in = body();
  $uid = (int)($in['uid'] ?? 0);
  if ($uid <= 0) fail('A message id is required.');
  $seen = !isset($in['seen']) || $in['seen'];
  [$imap, , , ] = imap_connect_or_fail();
  if ($seen) imap_setflag_full($imap, (string)$uid, '\\Seen', ST_UID);
  else       imap_clearflag_full($imap, (string)$uid, '\\Seen', ST_UID);
  imap_close($imap);
  ok(['ok' => true]);
}

// ── SMTP send ────────────────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'send') {
  $user = require_auth($conn, MAIL_ROLES);
  $in = body();
  $to      = trim((string)($in['to'] ?? ''));
  $subject = str_field($in, 'subject', 300);
  $bodyTxt = str_field($in, 'body', 50000);
  $cc      = trim((string)($in['cc'] ?? ''));

  $toList = array_filter(array_map('trim', preg_split('/[,;]+/', $to)));
  $ccList = array_filter(array_map('trim', preg_split('/[,;]+/', $cc)));
  if (!$toList) fail('A recipient is required.');
  foreach (array_merge($toList, $ccList) as $addr) {
    if (!filter_var($addr, FILTER_VALIDATE_EMAIL)) fail("Invalid address: $addr");
  }
  if ($subject === '') fail('A subject is required.');
  if ($bodyTxt === '') fail('The message body is empty.');

  // Build + dispatch through the shared transport (header construction and
  // mail-injection guards live in _smtp.php).
  $res = gk_send_email([
    'to'          => array_values($toList),
    'cc'          => array_values($ccList),
    'subject'     => $subject,
    'body'        => $bodyTxt,
    'in_reply_to' => $in['in_reply_to'] ?? '',
    'references'  => $in['references'] ?? '',
  ]);

  if (!$res['ok']) { error_log('GAkinz mail SMTP send: ' . $res['error']); fail('Could not send the message. Please try again.', 502); }
  audit($conn, $user['id'], 'mail_send', 'to ' . implode(',', $toList) . ' — ' . $subject);
  ok(['ok' => true, 'message_id' => $res['message_id']], 201);
}

fail('Unknown action.', 400);
