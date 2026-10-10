<?php
/**
 * Public enquiry endpoint. The corporate contact form posts here; each enquiry
 * lands in the `enquiries` table, which feeds the GAkinzOS leads pipeline (§6).
 *   POST /contact.php {name, email, company?, budget?, projectType?, message}
 */
require __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Method not allowed.', 405);

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
audit($conn, null, 'enquiry_submit', $email);

ok(['id' => $newId], 201);
