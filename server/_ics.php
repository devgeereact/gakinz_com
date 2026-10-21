<?php
/**
 * Calendar file (RFC 5545) for one confirmed call. Pure functions: no database,
 * no request state and no reliance on PHP's default time zone, so the same
 * input always gives the same file. bookings.php decides what goes in; this
 * file only formats it.
 *
 * Every time in the file is UTC (the trailing Z), so a calendar app shows the
 * call at the right moment in whatever zone its user is in.
 */

/** Valid UTF-8 only: an invalid byte becomes "?", so no later step can empty the value. */
function ics_utf8(string $v): string {
  return mb_scrub($v, 'UTF-8');
}

/** Escape a TEXT value: backslash, semicolon, comma and line breaks. */
function ics_text(string $v): string {
  $v = ics_utf8($v);
  $v = str_replace(["\r\n", "\r"], "\n", $v);
  $v = (string)preg_replace('/[\x00-\x08\x0B-\x1F\x7F]/u', '', $v); // TEXT allows no other control characters
  return str_replace(['\\', ';', ',', "\n"], ['\\\\', '\\;', '\\,', '\\n'], $v);
}

/**
 * Fold one content line at 75 octets: each continuation starts with a single
 * space, and a UTF-8 character is never split across two lines.
 */
function ics_fold(string $line): string {
  $out = '';
  $cur = '';
  $chars = preg_split('//u', ics_utf8($line), -1, PREG_SPLIT_NO_EMPTY);
  if ($chars === false || $chars === []) return ''; // never a bare CRLF
  foreach ($chars as $ch) {
    if (strlen($cur) + strlen($ch) > 75) {
      $out .= $cur . "\r\n";
      $cur = ' '; // the leading space counts towards the next line's 75
    }
    $cur .= $ch;
  }
  return $out . $cur . "\r\n";
}

/** A UTC 'Y-m-d H:i:s' value (or a DateTimeImmutable) as an RFC 5545 UTC DATE-TIME. */
function ics_utc($when): string {
  $utc = new DateTimeZone('UTC');
  $dt = $when instanceof DateTimeInterface
    ? DateTimeImmutable::createFromInterface($when)->setTimezone($utc)
    : new DateTimeImmutable((string)$when, $utc);
  return $dt->format('Ymd\THis\Z');
}

/**
 * The whole calendar file for one event.
 *
 * $e keys: uid, starts_at (UTC 'Y-m-d H:i:s'), duration_min, summary,
 * description, location (nullable), url (nullable, an http(s) address),
 * sequence (int), stamp (optional UTC 'Y-m-d H:i:s', defaults to now).
 */
function ics_event(array $e): string {
  $start = new DateTimeImmutable((string)$e['starts_at'], new DateTimeZone('UTC'));
  $end = $start->modify('+' . (int)$e['duration_min'] . ' minutes');
  $stamp = isset($e['stamp']) ? ics_utc($e['stamp']) : gmdate('Ymd\THis\Z');

  $lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GAkinz//GAkinzOS Calls//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' . $e['uid'],
    'DTSTAMP:' . $stamp,
    'DTSTART:' . ics_utc($start),
    'DTEND:' . ics_utc($end),
    'SEQUENCE:' . max(0, (int)($e['sequence'] ?? 0)),
    'STATUS:CONFIRMED',
    'SUMMARY:' . ics_text((string)$e['summary']),
    'DESCRIPTION:' . ics_text((string)$e['description']),
  ];
  $location = isset($e['location']) ? trim((string)$e['location']) : '';
  if ($location !== '') $lines[] = 'LOCATION:' . ics_text($location);
  $url = isset($e['url']) ? trim((string)$e['url']) : '';
  if ($url !== '' && preg_match('#^https?://[^\s]+$#i', $url)) $lines[] = 'URL:' . $url;
  $lines[] = 'END:VEVENT';
  $lines[] = 'END:VCALENDAR';

  return implode('', array_map('ics_fold', $lines));
}

/** Send a calendar file as a download and end the request. The one non-JSON body here. */
function ics_send(string $body, string $filename): void {
  http_response_code(200);
  header('Content-Type: text/calendar; charset=utf-8');
  header('Content-Disposition: attachment; filename="' . $filename . '"');
  header('Content-Length: ' . strlen($body));
  header('Cache-Control: private, no-store');
  header('X-Content-Type-Options: nosniff');
  echo $body;
  exit;
}
