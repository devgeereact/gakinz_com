<?php
/**
 * Public enquiry endpoint. The corporate contact form posts here; each enquiry
 * lands in the `enquiries` table, which feeds the GAkinzOS leads pipeline (§6).
 *   POST /contact.php {name, email, company?, budget?, projectType?, message, hp_site?, openedAt?}
 *     → 201 {id, reference}
 *
 * `reference` is the enquiry's GK-E-YYYY-NNNN (SQL 19, _reference.php), shown
 * once on the thank-you so the visitor can quote it. It is null until SQL 19
 * has run or while _reference.php is not on the server. Nothing anywhere
 * looks an enquiry up by it for a visitor.
 */
require __DIR__ . '/_bootstrap.php';
// Optional: without it the enquiry is saved exactly as before, with no reference.
if (is_file(__DIR__ . '/_reference.php')) require_once __DIR__ . '/_reference.php';
require_once __DIR__ . '/_notify.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Method not allowed.', 405);

// JSON only. Another site can make a visitor's browser send text/plain or a form post here with no
// CORS preflight; it cannot send application/json that way. The site's own form always sends JSON.
$ctype = strtolower(trim(explode(';', (string)($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? ''))[0]));
if ($ctype !== 'application/json') fail('Send the enquiry as JSON.', 415);

// Rate limit. The form is public, so without this one script can fill the
// leads pipeline. Modelled on the login throttle in auth.php: count this IP's
// recent rows in audit_log, no new table and no extra dependency. Five
// enquiries in fifteen minutes is far above a real person filling the form in
// and far below what an unattended script would send.
const CONTACT_WINDOW_MINUTES = 15;
const CONTACT_MAX_PER_WINDOW = 5;

$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$stmt = $conn->prepare(
  "SELECT COUNT(*) AS c FROM audit_log
   WHERE action = 'enquiry_submit' AND ip = ?
     AND created_at > (NOW() - INTERVAL " . CONTACT_WINDOW_MINUTES . " MINUTE)"
);
$stmt->bind_param('s', $ip);
$stmt->execute();
if ((int)($stmt->get_result()->fetch_assoc()['c'] ?? 0) >= CONTACT_MAX_PER_WINDOW) {
  fail('Too many enquiries from this connection. Please wait a few minutes and try again.', 429);
}

$in = body();

// Two cheap bot signals, checked before anything is validated or saved. They stop form-filling bots only: a script
// that POSTs JSON directly can leave both fields out, so the per-IP throttle above is still the real limit.
//
// 1. Honeypot. `hp_site` is a field the page hides from people (off screen, out of the tab order, aria-hidden), so
//    only a bot completes it. The answer looks exactly like success (201, no reference) so the bot learns nothing;
//    nothing is saved and nobody is mailed. It is not counted by the throttle (that counts `enquiry_submit` rows).
$hp = $in['hp_site'] ?? '';
if (is_array($hp) ? count($hp) > 0 : trim((string)$hp) !== '') {
  audit($conn, null, 'enquiry_bot_dropped', 'honeypot');
  ok(['id' => 0, 'reference' => null], 201);
}

// 2. Minimum fill time. `openedAt` is the browser's Date.now() when the form opened. A post under CONTACT_MIN_FILL_MS
//    later is a script, or a very fast autofill; the sender is told to check and send again, and the retry works
//    because the opening time does not move. A missing, non-numeric, future or over-a-day-old value is NO signal:
//    an older cached page, a wrong clock or another test posts without it, and a genuine enquiry must never be
//    refused for something the sender cannot fix. Browser and server clocks are compared, so a visitor whose clock
//    is slightly ahead is asked to wait a moment longer, never locked out.
const CONTACT_MIN_FILL_MS = 2500;
const CONTACT_MAX_OPEN_AGE_MS = 86400000;
$opened = $in['openedAt'] ?? null;
if ((is_int($opened) || is_float($opened) || (is_string($opened) && is_numeric($opened)))) {
  $age = (int)round(microtime(true) * 1000) - (float)$opened;
  if ($age >= 0 && $age <= CONTACT_MAX_OPEN_AGE_MS && $age < CONTACT_MIN_FILL_MS) {
    audit($conn, null, 'enquiry_too_fast', '');
    fail('That was quick. Please check your details and send again.', 429);
  }
}

$name    = str_field($in, 'name', 200);
$email   = str_field($in, 'email', 200);
$company = str_field($in, 'company', 200);
$budget  = str_field($in, 'budget', 100);
$type    = str_field($in, 'projectType', 100);
$message = str_field($in, 'message', 5000);

if ($name === '')                                fail('Name is required.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL))  fail('A valid email is required.');
if (mb_strlen($message) < 10)                    fail('Please add a little more detail.');

$stmt = $conn->prepare(
  'INSERT INTO enquiries (name, email, company, budget, project_type, message, source, ip)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
$source = 'website';
$stmt->bind_param('ssssssss', $name, $email, $company, $budget, $type, $message, $source, $ip);
if (!$stmt->execute()) fail('Could not save your enquiry.', 500);

// No user id: the caller is anonymous. The row is what the throttle above
// counts, so it has to be written on every accepted submission.
$newId = $conn->insert_id; // read before audit(), which inserts its own row
$reference = function_exists('gk_ref_assign') ? gk_ref_assign($conn, 'enquiries', (int)$newId) : null;
audit($conn, null, 'enquiry_submit', $email);

// Tell the owner, after the visitor has their answer (see _notify.php). Nothing here can fail the request.
$appUrl = rtrim((string)($GLOBALS['APP_URL'] ?? 'https://gakinz.com'), '/');
gk_owner_alert(
  $conn,
  gk_oneline('New enquiry from ' . $name, 100),
  "A new enquiry has come in through the website.\n\n"
    . 'Reference: ' . ($reference ?: '(none)') . "\n"
    . "Name: $name\nEmail: $email\n"
    . ($company !== '' ? "Company: $company\n" : '')
    . ($type !== '' ? "Project type: $type\n" : '')
    . ($budget !== '' ? "Budget: $budget\n" : '')
    . "\nMessage:\n$message\n\n"
    . "Open it in Leads: $appUrl/app/leads\n",
  'enquiry_notified',
  'enquiry_notify_failed',
  $reference ? (string)$reference : ('enquiry ' . $newId)
);

ok(['id' => $newId, 'reference' => $reference], 201);
