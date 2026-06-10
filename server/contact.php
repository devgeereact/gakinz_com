<?php
/**
 * Public enquiry endpoint. The corporate contact form posts here; each enquiry
 * lands in the `enquiries` table, which feeds the GAkinzOS leads pipeline (§6).
 *   POST /contact.php {name, email, company?, budget?, projectType?, message}
 */
require __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Method not allowed.', 405);

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

$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$stmt = $conn->prepare(
  'INSERT INTO enquiries (name, email, company, budget, project_type, message, source, ip)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
$source = 'website';
$stmt->bind_param('ssssssss', $name, $email, $company, $budget, $type, $message, $source, $ip);
if (!$stmt->execute()) fail('Could not save your enquiry.', 500);

ok(['id' => $conn->insert_id], 201);
