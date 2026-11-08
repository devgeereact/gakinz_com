<?php
/**
 * AI providers for ai.php: Anthropic first, OpenRouter when Anthropic has no key
 * or fails, so a single provider outage does not take AI away. On OpenRouter the
 * default model is OR_MODEL and an optional cheaper OR_FALLBACK_MODEL is tried when it fails.
 *
 *   ai_providers()                  → the configured providers, in the order tried
 *   ai_generate($system, $input)    → ['text' => …, 'provider' => …] or null
 *
 * Keys live only in the server's private config.php (ANTHROPIC_KEY,
 * OPENROUTER_KEY) and never reach the browser. A failure is logged with the
 * provider and status, never with the key or the text.
 */

// Anthropic Messages API, raw HTTP (the server has no Composer, as with Stripe).
const AI_ANTHROPIC_VERSION = '2026-10-21';
// Models that accept server-side refusal fallbacks in their "default" form.
const AI_ANTHROPIC_FALLBACK_MODELS = ['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5'];
// All attempts together (Anthropic, then each OpenRouter model) stay under Cloudflare's 100-second
// proxy limit: a later attempt gets only the time left in the budget, and is skipped below the minimum.
const AI_TOTAL_BUDGET = 90;
const AI_MIN_ATTEMPT = 5;
const AI_ANTHROPIC_TIMEOUT = 50;
const AI_OPENROUTER_TIMEOUT = 40;

function ai_key(string $name): string {
  if (!defined($name)) return '';
  $v = trim((string)constant($name));
  return ($v === '' || str_starts_with($v, 'REPLACE')) ? '' : $v;
}

function ai_const(string $name, string $default): string {
  $v = defined($name) ? trim((string)constant($name)) : '';
  return $v === '' ? $default : $v;
}

/** Configured providers, in the order ai_generate() tries them. */
function ai_providers(): array {
  $out = [];
  if (ai_key('ANTHROPIC_KEY') !== '') $out[] = 'anthropic';
  if (ai_key('OPENROUTER_KEY') !== '') $out[] = 'openrouter';
  return $out;
}

/** POST JSON; returns [status, decoded body or null, transport error]. */
function ai_post(string $url, array $headers, array $payload, int $timeout): array {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => $timeout,
    CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
    CURLOPT_POSTFIELDS => json_encode($payload),
  ]);
  $res  = curl_exec($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err  = curl_error($ch);
  curl_close($ch);
  if ($res === false) return [0, null, $err];
  $data = json_decode((string)$res, true);
  return [$code, is_array($data) ? $data : null, ''];
}

function ai_anthropic(string $system, string $input): ?string {
  $model = ai_const('ANTHROPIC_MODEL', 'claude-opus-5-5');
  $payload = [
    'model' => $model,
    'max_tokens' => 8000,
    'system' => $system,
    'messages' => [['role' => 'user', 'content' => $input]],
    // Short drafts: low effort keeps the reply well inside the timeout.
    'output_config' => ['effort' => ai_const('ANTHROPIC_EFFORT', 'low')],
  ];
  $headers = [
    'x-api-key: ' . ai_key('ANTHROPIC_KEY'),
    'anthropic-version: ' . AI_ANTHROPIC_VERSION,
  ];
  if (in_array($model, AI_ANTHROPIC_FALLBACK_MODELS, true)) {
    // A declined request is re-run on Anthropic's recommended model in the same call.
    $payload['fallbacks'] = 'default';
    $headers[] = 'anthropic-beta: server-side-fallback-2026-07-01';
  }
  $base = rtrim((string)($GLOBALS['AI_ANTHROPIC_BASE'] ?? 'https://api.anthropic.com'), '/');
  [$code, $data, $err] = ai_post($base . '/v1/messages', $headers, $payload, AI_ANTHROPIC_TIMEOUT);
  if ($code < 200 || $code >= 300 || !$data) {
    error_log('GAkinz AI anthropic: ' . ($err !== '' ? "transport $err" : "HTTP $code " . ($data['error']['type'] ?? '')));
    return null;
  }
  if (($data['stop_reason'] ?? '') === 'refusal') {
    error_log('GAkinz AI anthropic: refusal ' . ($data['stop_details']['category'] ?? ''));
    return null;
  }
  $text = '';
  foreach ($data['content'] ?? [] as $block) {
    if (($block['type'] ?? '') === 'text') $text .= (string)($block['text'] ?? '');
  }
  return trim($text) === '' ? null : $text;
}

/** OpenRouter models in the order tried: the default, then the backup when one is set and differs. */
function ai_openrouter_models(): array {
  $primary = ai_const('OR_MODEL', 'openrouter/auto');
  $backup  = ai_const('OR_FALLBACK_MODEL', '');
  return ($backup !== '' && $backup !== $primary) ? [$primary, $backup] : [$primary];
}

/** One model on OpenRouter, within $timeout seconds. */
function ai_openrouter_call(string $model, string $system, string $input, int $timeout): ?string {
  $payload = [
    'model' => $model,
    'messages' => [
      ['role' => 'system', 'content' => $system],
      ['role' => 'user',   'content' => $input],
    ],
  ];
  $headers = [
    'Authorization: Bearer ' . ai_key('OPENROUTER_KEY'),
    'HTTP-Referer: ' . ai_const('OR_SITE', 'https://gakinz.com'),
    'X-Title: GAkinzOS',
  ];
  $base = rtrim((string)($GLOBALS['AI_OPENROUTER_BASE'] ?? 'https://openrouter.ai/api'), '/');
  [$code, $data, $err] = ai_post($base . '/v1/chat/completions', $headers, $payload, $timeout);
  if ($code < 200 || $code >= 300 || !$data) {
    error_log('GAkinz AI openrouter ' . $model . ': ' . ($err !== '' ? "transport $err" : "HTTP $code"));
    return null;
  }
  $text = (string)($data['choices'][0]['message']['content'] ?? '');
  return trim($text) === '' ? null : $text;
}

/** Tries each OpenRouter model in turn until $deadline (a microtime). Null when every attempt failed. */
function ai_openrouter(string $system, string $input, float $deadline): ?string {
  foreach (ai_openrouter_models() as $model) {
    $left = (int)floor($deadline - microtime(true));
    if ($left < AI_MIN_ATTEMPT) break; // too little time left to try again
    $text = ai_openrouter_call($model, $system, $input, min(AI_OPENROUTER_TIMEOUT, $left));
    if ($text !== null) return $text;
  }
  return null;
}

/** Tries each configured provider in turn; null when every one failed. */
function ai_generate(string $system, string $input): ?array {
  $deadline = microtime(true) + AI_TOTAL_BUDGET;
  foreach (ai_providers() as $p) {
    $text = $p === 'anthropic' ? ai_anthropic($system, $input) : ai_openrouter($system, $input, $deadline);
    if ($text !== null) return ['text' => $text, 'provider' => $p];
  }
  return null;
}
