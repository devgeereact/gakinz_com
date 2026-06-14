<?php
/**
 * Slack connector (GAkinzOS — Platform). Admins only.
 *   POST /slack.php?action=test   → post a test message to the configured webhook
 */
require __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_slack.php';

const ADMINS = ['super_admin', 'admin'];
$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'test') {
  $user = require_auth($conn, ADMINS);
  if (empty($GLOBALS['SLACK_WEBHOOK_URL'])) fail('Slack is not configured on the server.', 503);
  $res = gk_slack_post(":wave: Test message from GAkinzOS — Slack is connected.");
  if (empty($res['ok'])) fail('Slack rejected the message: ' . ($res['error'] ?? 'unknown'), 502);
  audit($conn, $user['id'], 'slack_test', '');
  ok(['ok' => true]);
}

fail('Method not allowed.', 405);
