<?php
/**
 * Server-side AI proxy. EVERY AI feature in GAkinzOS routes through here, so no
 * key reaches the browser (brief §2, §6.7). Anthropic answers first; OpenRouter
 * takes over when Anthropic has no key or fails (_ai.php).
 *   POST /ai.php { task, input, system? }
 *     task   : short label of the feature (logged, not sent verbatim)
 *     input  : the user/content text to act on
 *     system : optional system instruction (else a sensible default)
 *   → { text, provider }   provider: 'anthropic' | 'openrouter'
 *
 * Gated behind the auth token: every AI feature runs from the authenticated
 * /app, so without this the endpoint would be an open proxy to a paid LLM key.
 */
require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_ai.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Method not allowed.', 405);

// Staff only. A `client`-role portal user has no AI feature in the interface
// and must not be able to spend the studio's paid LLM key by calling this
// directly. Trainer is kept, matching the STAFF list in time.php, so no
// existing staff role loses a feature it already had.
const STAFF = ['super_admin', 'admin', 'manager', 'trainer', 'editor', 'employee'];
$user = require_auth($conn, STAFF);

// Per-role daily cap so a single signed-in account can't run up the AI bill. Counted from audit_log (no extra table); resets at midnight server time.
const AI_DAILY_LIMITS = [
  'super_admin' => 1000,
  'admin'       => 1000,
  'manager'     => 400,
  'editor'      => 250,
  'employee'    => 150,
];
$limit = AI_DAILY_LIMITS[$user['role']] ?? 50;
$stmt = $conn->prepare(
  "SELECT COUNT(*) AS n FROM audit_log
   WHERE user_id = ? AND action = 'ai_call' AND created_at >= CURDATE()"
);
$stmt->bind_param('i', $user['id']);
$stmt->execute();
$usedToday = (int)($stmt->get_result()->fetch_assoc()['n'] ?? 0);
if ($usedToday >= $limit) {
  fail("Daily AI limit reached ($limit requests). Try again tomorrow.", 429);
}

if (!ai_providers()) fail('AI is not configured on the server.', 503);

$in     = body();
$task   = str_field($in, 'task', 80);
$input  = str_field($in, 'input', 12000);
$system = str_field($in, 'system', 2000);
if ($input === '') fail('Nothing to send.');

if ($system === '') {
  $system = 'You write for GAkinz, a web design and development studio. '
    . 'Use UK English, plain and direct. No marketing filler, no em dashes.';
}

$out = ai_generate($system, $input);
if ($out === null) fail('The AI providers did not answer. Please try again.', 502);

// Record the call so the daily cap can count it.
audit($conn, $user['id'], 'ai_call', $task . ' via ' . $out['provider']);

ok($out);
