<?php
/**
 * Call bookings inside Enquiries (docs/PRODUCT-SPEC.md section 5.5). Staff,
 * plus two client-only actions for the portal (below).
 * A booking is recorded by hand against an enquiry, a client or both. It starts
 * as a request and only the owner confirms it; there is no availability engine,
 * no instant booking and no payment.
 *
 *   GET  /bookings.php                       → list, newest start first
 *   GET  /bookings.php?enquiry_id=N          → calls for one enquiry
 *   GET  /bookings.php?client_id=N           → calls for one client, and for the enquiry it came from
 *   POST /bookings.php?action=create         {enquiry_id?, client_id?, start_local, timezone, duration_min?, location?, status?, notes?}
 *   POST /bookings.php?action=update         {id, location?, notes?, outcome?}
 *   POST /bookings.php?action=reschedule     {id, start_local, timezone, duration_min?, notify?}
 *   POST /bookings.php?action=status         {id, status, outcome?, notify?}
 *   POST /bookings.php?action=notify         {event_id}  → retry a failed customer email
 *   GET  /bookings.php?action=ics&id=N       → calendar file (text/calendar) for a confirmed call
 *
 * Client role only (docs/PRODUCT-SPEC.md section 6.2, "Request another call"):
 *   POST /bookings.php?action=request {topic, timezone, slots: [{date, time}] (1 to 3)}
 *   GET  /bookings.php?action=mine    → the client's own portal call requests
 *   GET  /bookings.php?action=mine_ics&id=N → calendar file for one of those, once confirmed
 * The client comes from the token, never the request. A request is an ordinary
 * `requested` booking against that client, starting at the first proposed time,
 * with the topic and every proposed time written into the owner-only notes; the
 * owner reschedules to the chosen time and confirms it in Enquiries, Calls. The
 * client reads back only status and time, never notes, location or outcome.
 * A client may have at most five portal requests still `requested`; the sixth
 * answers 429.
 * "Not in the past" compares the UTC instant of each proposed time with the
 * database clock (UTC_TIMESTAMP()), the same clock the rest of the server uses.
 *
 * Times: the request carries the agreed local time (`start_local`,
 * YYYY-MM-DDTHH:MM) and its IANA zone. The server converts with PHP's own time
 * zone database and stores UTC, refusing a local time that does not exist
 * because the clocks go forward. Responses carry both `starts_at` (UTC, ISO
 * 8601 with Z) and `start_local`.
 *
 * Status: requested → confirmed | cancelled; confirmed → completed | cancelled.
 * Completed and cancelled are final. A change carries the status it expects to
 * replace, so two people acting at once cannot both win.
 *
 * Calendar file (docs/PRODUCT-SPEC.md section 7): an RFC 5545 file built by
 * server/_ics.php, the one response here that is not JSON. Only a confirmed
 * call has one; anything else answers 404. Times are UTC from the stored
 * starts_at. SEQUENCE is the number of reschedules in booking_events, so a
 * re-imported file replaces the old time. The text never carries notes or
 * outcome, and the client's file carries no location either, because a client
 * never reads the location (bk_client_shape).
 *
 * Every create, reschedule and status change writes a booking_events row, so a
 * reschedule keeps its history. With `notify: true` a reschedule or a
 * cancellation emails the customer; the outcome is stored on that event and a
 * failed send can be retried once at a time, never sent twice.
 */
require __DIR__ . '/_bootstrap.php';

const STAFF = ['super_admin', 'admin', 'manager', 'editor'];
const BOOKING_STATUSES = ['requested', 'confirmed', 'completed', 'cancelled'];
const BOOKING_NEXT = [
  'requested' => ['confirmed', 'cancelled'],
  'confirmed' => ['completed', 'cancelled'],
  'completed' => [],
  'cancelled' => [],
];
const CLIENT_OPEN_CALLS_MAX = 5; // portal call requests still `requested`, per client
const BOOKINGS_MIGRATION = 'Call bookings need the 2026-10-16 database update first (docs/DEPLOYMENT.md section 5.2).';
const BOOKING_COLS = 'b.id, b.enquiry_id, b.client_id, b.starts_at, b.timezone, b.duration_min, b.location, b.status,
  b.notes, b.outcome, b.created_at, b.updated_at, e.name AS enquiry_name, e.company AS enquiry_company, c.company AS client_company';
const BOOKING_FROM = ' FROM bookings b
  LEFT JOIN enquiries e ON e.id = b.enquiry_id AND e.deleted_at IS NULL
  LEFT JOIN clients c ON c.id = b.client_id AND c.deleted_at IS NULL';

/** Prepare, turning a missing table into a clear 503 rather than a 500. */
function bk_stmt(mysqli $conn, string $sql): mysqli_stmt {
  $s = $conn->prepare($sql);
  if ($s === false) {
    if ($conn->errno === 1146) fail(BOOKINGS_MIGRATION, 503);
    fail('Database error.', 500);
  }
  return $s;
}

/** A positive integer id from the input, or 0. */
function bk_id($v): int {
  if (is_int($v)) return $v > 0 ? $v : 0;
  if (is_string($v) && preg_match('/^[1-9]\d{0,9}$/', $v)) return (int)$v;
  return 0;
}

/**
 * Validate a local time and IANA zone and return [utc 'Y-m-d H:i:s', zone].
 * Refuses a time that does not exist in that zone (the spring-forward gap).
 * In the autumn overlap PHP takes the first, summer-time, occurrence.
 */
function bk_time(array $in): array {
  $local = $in['start_local'] ?? null;
  $tz = $in['timezone'] ?? null;
  if (!is_string($tz) || $tz === '' || !in_array($tz, DateTimeZone::listIdentifiers(DateTimeZone::ALL_WITH_BC), true)) {
    fail('Choose a valid time zone, such as Europe/London.');
  }
  if (!is_string($local) || !preg_match('/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/', $local, $m)
      || !checkdate((int)$m[2], (int)$m[3], (int)$m[1]) || (int)$m[4] > 23 || (int)$m[5] > 59
      || (int)$m[1] < 2000 || (int)$m[1] > 2100) {
    fail('Give the start as a date and time, YYYY-MM-DDTHH:MM.');
  }
  $wanted = "$m[1]-$m[2]-$m[3] $m[4]:$m[5]";
  $dt = DateTime::createFromFormat('!Y-m-d H:i', $wanted, new DateTimeZone($tz));
  if (!$dt || $dt->format('Y-m-d H:i') !== $wanted) {
    fail('That time does not exist in ' . $tz . ' because the clocks change. Choose another time.');
  }
  $dt->setTimezone(new DateTimeZone('UTC'));
  return [$dt->format('Y-m-d H:i:s'), $tz];
}

function bk_duration(array $in, int $default): int {
  if (!array_key_exists('duration_min', $in) || $in['duration_min'] === null || $in['duration_min'] === '') return $default;
  $d = $in['duration_min'];
  if (is_string($d) && preg_match('/^\d{1,3}$/', $d)) $d = (int)$d;
  if (!is_int($d) || $d < 5 || $d > 480) fail('The duration must be between 5 and 480 minutes.');
  return $d;
}

/** The local wall-clock time of a UTC value in a zone. */
function bk_local(string $utc, string $tz, string $format = 'Y-m-d\TH:i'): string {
  $dt = new DateTime($utc, new DateTimeZone('UTC'));
  $dt->setTimezone(new DateTimeZone($tz));
  return $dt->format($format);
}

function bk_shape(array $r): array {
  return [
    'id'              => (int)$r['id'],
    'enquiry_id'      => $r['enquiry_id'] !== null ? (int)$r['enquiry_id'] : null,
    'client_id'       => $r['client_id'] !== null ? (int)$r['client_id'] : null,
    'enquiry_name'    => $r['enquiry_name'] ?? null,
    'enquiry_company' => $r['enquiry_company'] ?? null,
    'client_company'  => $r['client_company'] ?? null,
    'starts_at'       => str_replace(' ', 'T', $r['starts_at']) . 'Z',
    'start_local'     => bk_local($r['starts_at'], $r['timezone']),
    'timezone'        => $r['timezone'],
    'duration_min'    => (int)$r['duration_min'],
    'location'        => $r['location'],
    'status'          => $r['status'],
    'notes'           => $r['notes'],
    'outcome'         => $r['outcome'],
    'created_at'      => $r['created_at'],
    'updated_at'      => $r['updated_at'],
    'history'         => [],
  ];
}

function bk_event_shape(array $r): array {
  $utc = fn($v) => $v !== null ? str_replace(' ', 'T', $v) . 'Z' : null;
  return [
    'id'              => (int)$r['id'],
    'kind'            => $r['kind'],
    'from_status'     => $r['from_status'],
    'to_status'       => $r['to_status'],
    'from_starts_at'  => $utc($r['from_starts_at']),
    'from_timezone'   => $r['from_timezone'],
    'to_starts_at'    => $utc($r['to_starts_at']),
    'to_timezone'     => $r['to_timezone'],
    'notify_status'   => $r['notify_status'],
    'notify_to'       => $r['notify_to'],
    'notify_attempts' => (int)$r['notify_attempts'],
    'notify_error'    => $r['notify_error'],
    'notified_at'     => $r['notified_at'],
    'by'              => $r['by_name'],
    'created_at'      => $r['created_at'],
  ];
}

/** One booking row, or 404. */
function bk_find(mysqli $conn, int $id): array {
  $s = bk_stmt($conn, 'SELECT ' . BOOKING_COLS . BOOKING_FROM . ' WHERE b.id = ? AND b.deleted_at IS NULL LIMIT 1');
  $s->bind_param('i', $id);
  $s->execute();
  $r = $s->get_result()->fetch_assoc();
  if (!$r) fail('Booking not found.', 404);
  return $r;
}

/** Bookings with their history attached, newest event first. */
function bk_with_history(mysqli $conn, array $rows): array {
  $out = [];
  foreach ($rows as $r) $out[(int)$r['id']] = bk_shape($r);
  if (!$out) return [];
  $ids = array_keys($out);
  $s = bk_stmt($conn, 'SELECT ev.*, u.name AS by_name FROM booking_events ev LEFT JOIN users u ON u.id = ev.user_id
    WHERE ev.booking_id IN (' . implode(',', array_fill(0, count($ids), '?')) . ') ORDER BY ev.id DESC');
  $s->bind_param(str_repeat('i', count($ids)), ...$ids);
  $s->execute();
  $res = $s->get_result();
  while ($e = $res->fetch_assoc()) $out[(int)$e['booking_id']]['history'][] = bk_event_shape($e);
  return array_values($out);
}

function bk_event(mysqli $conn, int $bookingId, int $userId, string $kind, array $f = []): int {
  $s = bk_stmt($conn, 'INSERT INTO booking_events (booking_id, user_id, kind, from_status, to_status, from_starts_at, from_timezone, to_starts_at, to_timezone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  $fs = $f['from_status'] ?? null; $ts = $f['to_status'] ?? null;
  $fa = $f['from_starts_at'] ?? null; $fz = $f['from_timezone'] ?? null;
  $ta = $f['to_starts_at'] ?? null; $tz = $f['to_timezone'] ?? null;
  $s->bind_param('iisssssss', $bookingId, $userId, $kind, $fs, $ts, $fa, $fz, $ta, $tz);
  $s->execute();
  return (int)$conn->insert_id;
}

/** The customer's name and email for a booking: the client first, then the enquiry. */
function bk_recipient(mysqli $conn, array $b): array {
  if ($b['client_id'] !== null) {
    $s = bk_stmt($conn, 'SELECT contact_name, company, email FROM clients WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $cid = (int)$b['client_id'];
    $s->bind_param('i', $cid);
    $s->execute();
    if (($c = $s->get_result()->fetch_assoc()) && trim((string)$c['email']) !== '') {
      return [trim((string)$c['email']), (string)($c['contact_name'] ?: $c['company'])];
    }
  }
  if ($b['enquiry_id'] !== null) {
    $s = bk_stmt($conn, 'SELECT name, email FROM enquiries WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $eid = (int)$b['enquiry_id'];
    $s->bind_param('i', $eid);
    $s->execute();
    if (($e = $s->get_result()->fetch_assoc()) && trim((string)$e['email']) !== '') {
      return [trim((string)$e['email']), (string)$e['name']];
    }
  }
  return ['', ''];
}

/**
 * Send the customer email for an event the caller has already claimed (its
 * notify_status is 'sending'), then record the outcome on the event. The
 * subject and body carry no notes, outcome or other confidential detail.
 */
function bk_send_notice(mysqli $conn, int $eventId): array {
  $s = bk_stmt($conn, 'SELECT ev.kind, ev.to_status, ev.from_starts_at, ev.from_timezone, ev.to_starts_at, ev.to_timezone, ev.booking_id
    FROM booking_events ev WHERE ev.id = ? LIMIT 1');
  $s->bind_param('i', $eventId);
  $s->execute();
  $ev = $s->get_result()->fetch_assoc();
  $b = bk_find($conn, (int)$ev['booking_id']);
  [$to, $name] = bk_recipient($conn, $b);

  $when = fn(string $utc, string $tz) => bk_local($utc, $tz, 'l j F Y, H:i') . " ($tz)";
  $hello = 'Hello' . ($name !== '' ? ' ' . $name : '') . ",\n\n";
  if ($ev['kind'] === 'rescheduled') {
    $subject = 'Your GAkinz call has moved';
    $body = $hello . 'Your call with GAkinz has moved to ' . $when($ev['to_starts_at'], $ev['to_timezone']) . ".\n"
      . 'It was ' . $when($ev['from_starts_at'], $ev['from_timezone']) . ".\n\n"
      . "If the new time does not suit you, reply to this email.\n\nGAkinz\n";
  } else {
    $subject = 'Your GAkinz call is cancelled';
    $body = $hello . 'Your call with GAkinz on ' . $when($b['starts_at'], $b['timezone']) . " is cancelled.\n\n"
      . "Reply to this email if you would like to arrange another time.\n\nGAkinz\n";
  }

  if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
    $sent = false;
    $err = 'No valid email address on the client or enquiry.';
  } else {
    require_once __DIR__ . '/_smtp.php';
    $r = gk_send_email(['to' => $to, 'subject' => $subject, 'body' => $body]);
    $sent = (bool)$r['ok'];
    $err = $sent ? '' : mb_substr((string)$r['error'], 0, 300);
  }
  $status = $sent ? 'sent' : 'failed';
  $errVal = $sent ? null : ($err !== '' ? $err : 'The email was not sent.');
  $toVal = $to !== '' ? $to : null;
  $u = bk_stmt($conn, 'UPDATE booking_events SET notify_status = ?, notify_to = ?, notify_error = ?,
    notify_attempts = notify_attempts + 1, notified_at = IF(? = \'sent\', NOW(), notified_at) WHERE id = ?');
  $u->bind_param('ssssi', $status, $toVal, $errVal, $status, $eventId);
  $u->execute();
  return ['status' => $status, 'error' => $errVal, 'to' => $toVal];
}

/** Claim a fresh event for a first send, then send. */
function bk_notify_new(mysqli $conn, int $eventId): array {
  $s = bk_stmt($conn, "UPDATE booking_events SET notify_status = 'sending' WHERE id = ? AND notify_status IS NULL");
  $s->bind_param('i', $eventId);
  $s->execute();
  return bk_send_notice($conn, $eventId);
}

/** Refuse unless the linked enquiry and client exist; returns [enquiryId|null, clientId|null]. */
function bk_links(mysqli $conn, array $in): array {
  $eid = array_key_exists('enquiry_id', $in) && $in['enquiry_id'] !== null && $in['enquiry_id'] !== '' ? bk_id($in['enquiry_id']) : null;
  $cid = array_key_exists('client_id', $in) && $in['client_id'] !== null && $in['client_id'] !== '' ? bk_id($in['client_id']) : null;
  if ($eid === 0) fail('Invalid enquiry id.');
  if ($cid === 0) fail('Invalid client id.');
  if ($eid === null && $cid === null) fail('Link the call to an enquiry or a client.');
  if ($eid !== null) {
    $s = bk_stmt($conn, 'SELECT id FROM enquiries WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $s->bind_param('i', $eid);
    $s->execute();
    if (!$s->get_result()->fetch_assoc()) fail('Enquiry not found.', 404);
  }
  if ($cid !== null) {
    $s = bk_stmt($conn, 'SELECT id FROM clients WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $s->bind_param('i', $cid);
    $s->execute();
    if (!$s->get_result()->fetch_assoc()) fail('Client not found.', 404);
  }
  return [$eid, $cid];
}

function bk_text(array $in, string $key, int $max): ?string {
  if (!array_key_exists($key, $in) || $in[$key] === null) return null;
  if (!is_string($in[$key])) fail("Invalid $key.");
  $v = str_field($in, $key, $max);
  return $v === '' ? null : $v;
}

/** The fields a client may read about one of their own calls. */
function bk_client_shape(array $r): array {
  return [
    'id'           => (int)$r['id'],
    'status'       => $r['status'],
    'starts_at'    => str_replace(' ', 'T', $r['starts_at']) . 'Z',
    'start_local'  => bk_local($r['starts_at'], $r['timezone']),
    'timezone'     => $r['timezone'],
    'duration_min' => (int)$r['duration_min'],
    'created_at'   => $r['created_at'],
  ];
}

/** How many times a call has been rescheduled: the calendar file's SEQUENCE. */
function bk_reschedules(mysqli $conn, int $id): int {
  $s = bk_stmt($conn, "SELECT COUNT(*) FROM booking_events WHERE booking_id = ? AND kind = 'rescheduled'");
  $s->bind_param('i', $id);
  $s->execute();
  return (int)$s->get_result()->fetch_row()[0];
}

/**
 * Send the calendar file for a confirmed booking row and end the request.
 * Staff get who the call is with and where; a client gets only what
 * bk_client_shape already shows them. Neither gets notes or outcome.
 */
function bk_send_ics(mysqli $conn, array $b, bool $forClient): void {
  require_once __DIR__ . '/_ics.php';
  $id = (int)$b['id'];
  $agreed = 'Agreed time: ' . bk_local($b['starts_at'], $b['timezone'], 'l j F Y, H:i') . ' (' . $b['timezone'] . ').';
  $location = null;
  if ($forClient) {
    $summary = 'Call with GAkinz';
    $lines = ['Call with GAkinz.', $agreed, 'To change the time, send the studio a message from your portal.'];
  } else {
    $who = trim((string)($b['client_company'] ?? '')) ?: trim((string)($b['enquiry_company'] ?? '')) ?: trim((string)($b['enquiry_name'] ?? ''));
    $summary = 'GAkinz call' . ($who !== '' ? ' with ' . $who : '');
    $lines = ['Call with ' . ($who !== '' ? $who : 'a customer') . '.', $agreed];
    $location = $b['location'] !== null && trim((string)$b['location']) !== '' ? trim((string)$b['location']) : null;
    if ($location !== null) $lines[] = 'Where: ' . $location;
    $lines[] = "Booking #$id in GAkinzOS, Enquiries, Calls.";
  }
  $body = ics_event([
    'uid'          => "booking-$id@gakinz.com",
    'starts_at'    => $b['starts_at'],
    'duration_min' => (int)$b['duration_min'],
    'summary'      => $summary,
    'description'  => implode("\n", $lines),
    'location'     => $location,
    'url'          => $location !== null && preg_match('#^https?://\S+$#i', $location) ? $location : null,
    'sequence'     => bk_reschedules($conn, $id),
  ]);
  ics_send($body, "gakinz-call-$id.ics");
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
  // ── Client branch ───────────────────────────────────────────────────────────
  // Only these three routes accept a client, and they accept nobody else. All
  // always end the request, so a client never reaches the staff code below.
  if (($method === 'GET' && ($action === 'mine' || $action === 'mine_ics')) || ($method === 'POST' && $action === 'request')) {
    $user = require_auth($conn, ['client']);
    $clientId = (int)($user['client_id'] ?? 0);
    if ($clientId <= 0) fail('Your account is not linked to a client.', 403);
    $c = bk_stmt($conn, 'SELECT id FROM clients WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $c->bind_param('i', $clientId);
    $c->execute();
    if (!$c->get_result()->fetch_assoc()) fail('Client not found.', 404);

    if ($action === 'mine_ics') {
      // The same set `mine` lists (their client, raised by a user of that
      // client), and confirmed. Anything else, including another client's
      // call, answers the same 404.
      $id = bk_id($_GET['id'] ?? null);
      $s = bk_stmt($conn, "SELECT b.id, b.starts_at, b.timezone, b.duration_min FROM bookings b
        JOIN users u ON u.id = b.created_by AND u.role = 'client' AND u.client_id = b.client_id
        WHERE b.id = ? AND b.client_id = ? AND b.status = 'confirmed' AND b.deleted_at IS NULL LIMIT 1");
      $s->bind_param('ii', $id, $clientId);
      $s->execute();
      $b = $s->get_result()->fetch_assoc();
      if (!$b) fail('Call not found.', 404);
      bk_send_ics($conn, $b, true);
    }

    if ($method === 'GET') {
      // The client's own requests from the portal: their client, raised by a
      // user of that same client. Calls the owner recorded by hand stay internal.
      $s = bk_stmt($conn, "SELECT b.id, b.starts_at, b.timezone, b.duration_min, b.status, b.created_at FROM bookings b
        JOIN users u ON u.id = b.created_by AND u.role = 'client' AND u.client_id = b.client_id
        WHERE b.client_id = ? AND b.deleted_at IS NULL ORDER BY b.id DESC LIMIT 100");
      $s->bind_param('i', $clientId);
      $s->execute();
      ok(array_map('bk_client_shape', $s->get_result()->fetch_all(MYSQLI_ASSOC)));
    }

    $in = body();
    $topic = $in['topic'] ?? '';
    if (!is_string($topic)) fail('Write the topic as text.');
    $topic = trim((string)preg_replace('/\s+/u', ' ', $topic)); // one line, so it cannot pose as another line of the notes
    if ($topic === '') fail('Say briefly what the call is about.');
    if (mb_strlen($topic) > 200) fail('Please keep the topic under 200 characters.');

    $slots = $in['slots'] ?? null;
    if (!is_array($slots) || $slots === [] || array_keys($slots) !== range(0, count($slots) - 1)) {
      fail('Propose at least one time for the call.');
    }
    if (count($slots) > 3) fail('Propose up to three times.');
    $tz = $in['timezone'] ?? null;
    $now = (string)$conn->query('SELECT UTC_TIMESTAMP()')->fetch_row()[0];
    $times = [];
    foreach ($slots as $i => $slot) {
      $n = $i + 1;
      $date = is_array($slot) ? ($slot['date'] ?? null) : null;
      $time = is_array($slot) ? ($slot['time'] ?? null) : null;
      if (!is_string($date) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || !is_string($time) || !preg_match('/^\d{2}:\d{2}$/', $time)) {
        fail("Time $n needs a date and a time.");
      }
      [$utc] = bk_time(['start_local' => $date . 'T' . $time, 'timezone' => $tz]);
      if ($utc <= $now) fail("Time $n is in the past. Choose a time that is still to come.");
      if (in_array($utc, $times, true)) fail('Each proposed time must be different.');
      $times[] = $utc;
    }

    $lines = ["Call request from the client portal.", "Topic: $topic", "Proposed times ($tz), in order of preference:"];
    foreach ($times as $i => $utc) $lines[] = ($i + 1) . '. ' . bk_local($utc, $tz, 'l j F Y, H:i');
    $lines[] = 'Booked at the first choice until you reschedule it.';
    $notes = implode("\n", $lines);
    $first = $times[0];

    // A double click or a resend answers 409, not a second request.
    $d = bk_stmt($conn, "SELECT id FROM bookings WHERE client_id = ? AND status = 'requested' AND starts_at = ? AND notes = ?
      AND deleted_at IS NULL AND created_at > NOW() - INTERVAL 10 MINUTE LIMIT 1");
    $d->bind_param('iss', $clientId, $first, $notes);
    $d->execute();
    if ($d->get_result()->fetch_assoc()) fail('That call request has already been sent.', 409);

    // At most CLIENT_OPEN_CALLS_MAX portal requests may wait on the owner at once.
    $o = bk_stmt($conn, "SELECT COUNT(*) FROM bookings b
      JOIN users u ON u.id = b.created_by AND u.role = 'client' AND u.client_id = b.client_id
      WHERE b.client_id = ? AND b.status = 'requested' AND b.deleted_at IS NULL");
    $o->bind_param('i', $clientId);
    $o->execute();
    if ((int)$o->get_result()->fetch_row()[0] >= CLIENT_OPEN_CALLS_MAX) {
      fail('You already have ' . CLIENT_OPEN_CALLS_MAX . ' call requests waiting for the studio. Please wait for a reply before asking for another.', 429);
    }

    $status = 'requested';
    $duration = 30;
    $uid = (int)$user['id'];
    $s = bk_stmt($conn, 'INSERT INTO bookings (enquiry_id, client_id, starts_at, timezone, duration_min, location, status, notes, created_by)
      VALUES (NULL, ?, ?, ?, ?, NULL, ?, ?, ?)');
    $s->bind_param('ississi', $clientId, $first, $tz, $duration, $status, $notes, $uid);
    $s->execute();
    $id = (int)$conn->insert_id; // before audit(), which inserts its own row
    bk_event($conn, $id, $uid, 'created', ['to_status' => $status, 'to_starts_at' => $first, 'to_timezone' => $tz]);
    audit($conn, $uid, 'booking_request', "#$id (client) " . count($times) . ' proposed');
    $s = bk_stmt($conn, 'SELECT id, starts_at, timezone, duration_min, status, created_at FROM bookings WHERE id = ? AND client_id = ? LIMIT 1');
    $s->bind_param('ii', $id, $clientId);
    $s->execute();
    ok(bk_client_shape($s->get_result()->fetch_assoc()), 201);
  }

  if ($method === 'GET' && $action === 'ics') {
    require_auth($conn, STAFF);
    $id = bk_id($_GET['id'] ?? null);
    if ($id <= 0) fail('A booking id is required.');
    $b = bk_find($conn, $id);
    if ($b['status'] !== 'confirmed') fail('Only a confirmed call has a calendar file.', 404);
    bk_send_ics($conn, $b, false);
  }

  if ($method === 'GET') {
    require_auth($conn, STAFF); // staff only; a client never reads bookings
    if (isset($_GET['enquiry_id'])) {
      $eid = bk_id($_GET['enquiry_id']);
      if ($eid <= 0) fail('Invalid enquiry id.');
      $s = bk_stmt($conn, 'SELECT ' . BOOKING_COLS . BOOKING_FROM . ' WHERE b.deleted_at IS NULL AND b.enquiry_id = ? ORDER BY b.starts_at DESC, b.id DESC LIMIT 500');
      $s->bind_param('i', $eid);
    } elseif (isset($_GET['client_id'])) {
      $cid = bk_id($_GET['client_id']);
      if ($cid <= 0) fail('Invalid client id.');
      // The client's own calls, and calls on the enquiry it was converted from.
      $s = bk_stmt($conn, 'SELECT ' . BOOKING_COLS . BOOKING_FROM . ' WHERE b.deleted_at IS NULL AND (b.client_id = ?
        OR b.enquiry_id = (SELECT source_lead_id FROM clients WHERE id = ? AND deleted_at IS NULL))
        ORDER BY b.starts_at DESC, b.id DESC LIMIT 500');
      $s->bind_param('ii', $cid, $cid);
    } else {
      $s = bk_stmt($conn, 'SELECT ' . BOOKING_COLS . BOOKING_FROM . ' WHERE b.deleted_at IS NULL ORDER BY b.starts_at DESC, b.id DESC LIMIT 500');
    }
    $s->execute();
    ok(bk_with_history($conn, $s->get_result()->fetch_all(MYSQLI_ASSOC)));
  }

  if ($method === 'POST' && $action === 'create') {
    $user = require_auth($conn, STAFF);
    $in = body();
    [$eid, $cid] = bk_links($conn, $in);
    [$utc, $tz] = bk_time($in);
    $duration = bk_duration($in, 30);
    $status = array_key_exists('status', $in) ? $in['status'] : 'requested';
    // A new record is a request, or a call the owner has already agreed.
    if (!in_array($status, ['requested', 'confirmed'], true)) fail('A new call is either requested or confirmed.');
    $location = bk_text($in, 'location', 500);
    $notes = bk_text($in, 'notes', 5000);

    $s = bk_stmt($conn, 'INSERT INTO bookings (enquiry_id, client_id, starts_at, timezone, duration_min, location, status, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $s->bind_param('iississsi', $eid, $cid, $utc, $tz, $duration, $location, $status, $notes, $user['id']);
    $s->execute();
    $id = (int)$conn->insert_id; // before audit(), which inserts its own row
    bk_event($conn, $id, $user['id'], 'created', ['to_status' => $status, 'to_starts_at' => $utc, 'to_timezone' => $tz]);
    audit($conn, $user['id'], 'booking_create', "#$id $status");
    ok(bk_with_history($conn, [bk_find($conn, $id)])[0], 201);
  }

  if ($method === 'POST' && $action === 'update') {
    $user = require_auth($conn, STAFF);
    $in = body();
    $id = bk_id($in['id'] ?? null);
    if ($id <= 0) fail('A booking id is required.');
    bk_find($conn, $id);
    $set = [];
    $vals = [];
    foreach (['location' => 500, 'notes' => 5000, 'outcome' => 1000] as $k => $max) {
      if (!array_key_exists($k, $in)) continue;
      $set[] = "$k = ?"; // column names from the fixed list above, never from the request
      $vals[] = bk_text($in, $k, $max);
    }
    if (!$set) fail('Nothing to update.');
    $vals[] = $id;
    $s = bk_stmt($conn, 'UPDATE bookings SET ' . implode(', ', $set) . ' WHERE id = ? AND deleted_at IS NULL');
    $s->bind_param(str_repeat('s', count($set)) . 'i', ...$vals);
    $s->execute();
    audit($conn, $user['id'], 'booking_update', "#$id");
    ok(bk_with_history($conn, [bk_find($conn, $id)])[0]);
  }

  if ($method === 'POST' && $action === 'reschedule') {
    $user = require_auth($conn, STAFF);
    $in = body();
    $id = bk_id($in['id'] ?? null);
    if ($id <= 0) fail('A booking id is required.');
    $b = bk_find($conn, $id);
    if (!in_array($b['status'], ['requested', 'confirmed'], true)) {
      fail('A ' . $b['status'] . ' call cannot be rescheduled. Record a new call instead.', 409);
    }
    [$utc, $tz] = bk_time($in);
    $duration = bk_duration($in, (int)$b['duration_min']);
    if ($utc === $b['starts_at'] && $tz === $b['timezone'] && $duration === (int)$b['duration_min']) {
      fail('That is already the time of this call.');
    }
    // Guarded on the old time and status, so a change made elsewhere meanwhile is not overwritten.
    $s = bk_stmt($conn, 'UPDATE bookings SET starts_at = ?, timezone = ?, duration_min = ?
      WHERE id = ? AND deleted_at IS NULL AND status = ? AND starts_at = ? AND timezone = ?');
    $s->bind_param('ssiisss', $utc, $tz, $duration, $id, $b['status'], $b['starts_at'], $b['timezone']);
    $s->execute();
    if ($s->affected_rows < 1) fail('This call changed while you were editing it. Reload and try again.', 409);
    $eventId = bk_event($conn, $id, $user['id'], 'rescheduled', [
      'from_starts_at' => $b['starts_at'], 'from_timezone' => $b['timezone'], 'to_starts_at' => $utc, 'to_timezone' => $tz,
    ]);
    audit($conn, $user['id'], 'booking_reschedule', "#$id");
    $notice = ($in['notify'] ?? false) === true ? bk_notify_new($conn, $eventId) : null;
    ok(['booking' => bk_with_history($conn, [bk_find($conn, $id)])[0], 'notice' => $notice]);
  }

  if ($method === 'POST' && $action === 'status') {
    $user = require_auth($conn, STAFF);
    $in = body();
    $id = bk_id($in['id'] ?? null);
    if ($id <= 0) fail('A booking id is required.');
    $to = $in['status'] ?? null;
    if (!is_string($to) || !in_array($to, BOOKING_STATUSES, true)) fail('Invalid status.');
    $b = bk_find($conn, $id);
    $from = $b['status'];
    if (!in_array($to, BOOKING_NEXT[$from] ?? [], true)) {
      fail("A $from call cannot become $to.", 409);
    }
    $outcome = array_key_exists('outcome', $in) ? bk_text($in, 'outcome', 1000) : $b['outcome'];
    $s = bk_stmt($conn, 'UPDATE bookings SET status = ?, outcome = ? WHERE id = ? AND status = ? AND deleted_at IS NULL');
    $s->bind_param('ssis', $to, $outcome, $id, $from);
    $s->execute();
    if ($s->affected_rows < 1) fail('This call changed while you were editing it. Reload and try again.', 409);
    $eventId = bk_event($conn, $id, $user['id'], 'status', ['from_status' => $from, 'to_status' => $to]);
    audit($conn, $user['id'], 'booking_status', "#$id $from → $to");
    // Only a cancellation is emailed; confirming and completing are recorded, not sent.
    $notice = $to === 'cancelled' && ($in['notify'] ?? false) === true ? bk_notify_new($conn, $eventId) : null;
    ok(['booking' => bk_with_history($conn, [bk_find($conn, $id)])[0], 'notice' => $notice]);
  }

  if ($method === 'POST' && $action === 'notify') {
    $user = require_auth($conn, STAFF);
    $eventId = bk_id(body()['event_id'] ?? null);
    if ($eventId <= 0) fail('An event id is required.');
    // Claim the failed send atomically: a double click or a second tab gets 409, never a second email.
    $s = bk_stmt($conn, "UPDATE booking_events ev JOIN bookings b ON b.id = ev.booking_id AND b.deleted_at IS NULL
      SET ev.notify_status = 'sending' WHERE ev.id = ? AND ev.notify_status = 'failed'");
    $s->bind_param('i', $eventId);
    $s->execute();
    if ($s->affected_rows < 1) {
      $c = bk_stmt($conn, 'SELECT notify_status FROM booking_events WHERE id = ? LIMIT 1');
      $c->bind_param('i', $eventId);
      $c->execute();
      $row = $c->get_result()->fetch_assoc();
      if (!$row) fail('Event not found.', 404);
      fail('Only a failed email can be retried. This one is ' . ($row['notify_status'] ?? 'not requested') . '.', 409);
    }
    $notice = bk_send_notice($conn, $eventId);
    audit($conn, $user['id'], 'booking_notify_retry', "event #$eventId " . $notice['status']);
    ok(['notice' => $notice]);
  }
} catch (mysqli_sql_exception $e) {
  if ($e->getCode() === 1146) fail(BOOKINGS_MIGRATION, 503); // ER_NO_SUCH_TABLE: the SQL step has not run
  throw $e;
}

fail('Method not allowed.', 405);
