<?php
/**
 * Integrations status (GAkinzOS — Platform). Admins only.
 * Reports which external integrations are configured on the server. Returns
 * BOOLEANS ONLY — never the keys/secrets themselves.
 *
 *   GET /integrations.php → { smtp, imap, anthropic, openrouter, stripe, twilio, google, openweather, cron, reports }
 */
require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_ai.php';

const ADMINS = ['super_admin', 'admin'];
if ($_SERVER['REQUEST_METHOD'] !== 'GET') fail('Method not allowed.', 405);
require_auth($conn, ADMINS);

$has = fn($k) => isset($GLOBALS[$k]) && trim((string)$GLOBALS[$k]) !== '';

ok([
  'smtp'       => $has('SMTP_HOST') && $has('SMTP_USER'),
  'imap'       => $has('IMAP_HOST') && function_exists('imap_open'),
  // A placeholder key (REPLACE_…) counts as not configured.
  'anthropic'  => in_array('anthropic', ai_providers(), true),
  'openrouter' => in_array('openrouter', ai_providers(), true),
  'stripe'     => $has('STRIPE_SECRET'),
  'twilio'     => $has('TWILIO_SID') && $has('TWILIO_TOKEN'),
  'openweather'=> $has('OPENWEATHER_API_KEY'),
  'cron'       => $has('CRON_KEY'),
  'reports'    => $has('REPORT_RECIPIENTS'),
  'github'     => $has('GITHUB_TOKEN'),
  'figma'      => $has('FIGMA_TOKEN'),
  'slack'      => $has('SLACK_WEBHOOK_URL'),
  'calendly'   => $has('CALENDLY_URL'),
  'paypal'     => $has('PAYPAL_CLIENT_ID') && $has('PAYPAL_SECRET'),
  'whatsapp'   => $has('TWILIO_SID') && $has('TWILIO_WHATSAPP_FROM'),
]);
