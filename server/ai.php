<?php
/**
 * Server-side OpenRouter proxy. EVERY AI feature in GAkinzOS routes through here,
 * so the API key never reaches the browser (brief §2, §6.7).
 *   POST /ai.php { task, input, system? }
 *     task   : short label of the feature (logged, not sent verbatim)
 *     input  : the user/content text to act on
 *     system : optional system instruction (else a sensible default)
 *   → { text }
 *
 * Phase 2: gate behind the auth token + per-role rate limits.
 */
require __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Method not allowed.', 405);

if (!defined('OPENROUTER_KEY') || OPENROUTER_KEY === '' || str_starts_with(OPENROUTER_KEY, 'REPLACE')) {
  fail('AI is not configured on the server.', 503);
}

$in     = body();
$task   = str_field($in, 'task', 80);
$input  = str_field($in, 'input', 12000);
$system = str_field($in, 'system', 2000);
if ($input === '') fail('Nothing to send.');

if ($system === '') {
  $system = 'You write for GAkinz, a web design and development studio. '
    . 'Use UK English, plain and direct. No marketing filler, no em dashes.';
}

$payload = [
  'model' => OR_MODEL,
  'messages' => [
    ['role' => 'system', 'content' => $system],
    ['role' => 'user',   'content' => $input],
  ],
];

$ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_TIMEOUT => 60,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer ' . OPENROUTER_KEY,
    'Content-Type: application/json',
    'HTTP-Referer: ' . OR_SITE,
    'X-Title: GAkinzOS',
  ],
  CURLOPT_POSTFIELDS => json_encode($payload),
]);
$res  = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err  = curl_error($ch);
curl_close($ch);

if ($res === false)  fail('AI request failed: ' . $err, 502);
if ($code >= 400)    fail('AI provider error.', 502);

$data = json_decode($res, true);
$text = $data['choices'][0]['message']['content'] ?? '';
if ($text === '') fail('AI returned no text.', 502);

ok(['text' => $text]);
