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
// Every attempt that reaches a provider counts, including one that fails: the provider may still bill it
// (K-122). The slot is taken under a per-user lock before the call, so parallel requests cannot all pass.
const AI_DAILY_LIMITS = [
  'super_admin' => 1000,
  'admin'       => 1000,
  'manager'     => 400,
  'editor'      => 250,
  'employee'    => 150,
];
$limit = AI_DAILY_LIMITS[$user['role']] ?? 50;

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

// Take a slot: count and insert inside one named lock, so two requests never read the same count.
$lockName = 'gk_ai_cap_' . $user['id'];
$st = $conn->prepare('SELECT GET_LOCK(?, 10) AS got');
$st->bind_param('s', $lockName);
$st->execute();
if ((int)($st->get_result()->fetch_assoc()['got'] ?? 0) !== 1) fail('AI is busy for this account. Please try again in a moment.', 429);
$st = $conn->prepare(
  "SELECT COUNT(*) AS n FROM audit_log
   WHERE user_id = ? AND action = 'ai_call' AND created_at >= CURDATE()"
);
$st->bind_param('i', $user['id']);
$st->execute();
$usedToday = (int)($st->get_result()->fetch_assoc()['n'] ?? 0);
$slotId = 0;
if ($usedToday < $limit) {
  audit($conn, $user['id'], 'ai_call', $task . ' pending');
  $slotId = (int)$conn->insert_id;
}
$st = $conn->prepare('SELECT RELEASE_LOCK(?) AS released');
$st->bind_param('s', $lockName);
$st->execute();
$st->get_result()->free(); // read the result, or the next statement fails "out of sync"
if ($slotId === 0) fail("Daily AI limit reached ($limit requests). Try again tomorrow.", 429);

$out = ai_generate($system, $input);

// The slot stays counted either way; its detail says how the attempt ended.
$detail = $out === null ? $task . ' failed' : $task . ' via ' . $out['provider'];
$st = $conn->prepare("UPDATE audit_log SET detail = ? WHERE id = ? AND action = 'ai_call'");
$st->bind_param('si', $detail, $slotId);
$st->execute();

if ($out === null) fail('The AI providers did not answer. Please try again.', 502);

ok($out);
