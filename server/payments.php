<?php
/**
 * Stripe payments (GAkinzOS §6 Invoicing). Replaces manual "mark as paid".
 *
 *   POST /payments.php?action=link     {invoice_id}   (staff) → { url }
 *        Creates a Stripe Checkout Session for the invoice total and returns the
 *        hosted payment URL. The invoice id travels in the session metadata.
 *
 *   POST /payments.php?action=webhook  (public, Stripe-signed)
 *        On checkout.session.completed / payment_intent.succeeded, marks the
 *        referenced invoice paid. Verified with STRIPE_WEBHOOK_SECRET — NEVER
 *        trust the body without the signature.
 *
 * Config in config.php (secrets stay server-side):
 *   $STRIPE_SECRET, $STRIPE_WEBHOOK_SECRET, optional $STRIPE_SUCCESS_URL/$STRIPE_CANCEL_URL.
 * No Stripe SDK / Composer — plain REST over curl + an HMAC signature check.
 */
require __DIR__ . '/_bootstrap.php';

const PAY_STAFF = ['super_admin', 'admin', 'manager'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── Create a Checkout Session for an invoice ────────────────────────────────
if ($method === 'POST' && $action === 'link') {
  $user = require_auth($conn, PAY_STAFF);
  $secret = $GLOBALS['STRIPE_SECRET'] ?? '';
  if ($secret === '' || str_starts_with($secret, 'REPLACE')) fail('Stripe is not configured on the server.', 503);

  $in = body();
  $invoiceId = (int)($in['invoice_id'] ?? 0);
  if ($invoiceId <= 0) fail('An invoice id is required.');

  $stmt = $conn->prepare(
    'SELECT i.id, i.number, i.status, i.currency, c.email AS client_email, c.company AS client_company,
            (SELECT COALESCE(SUM(qty * unit_price), 0) FROM invoice_items it WHERE it.invoice_id = i.id) AS total
     FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
     WHERE i.id = ? AND i.deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('i', $invoiceId);
  $stmt->execute();
  $inv = $stmt->get_result()->fetch_assoc();
  if (!$inv) fail('Invoice not found.', 404);
  if ($inv['status'] === 'paid') fail('This invoice is already paid.');

  $total = (float)$inv['total'];
  if ($total <= 0) fail('This invoice has no billable total.');
  $minor = (int)round($total * 100); // Stripe wants the smallest currency unit
  $currency = strtolower($inv['currency'] ?: 'gbp');
  $label = 'Invoice ' . ($inv['number'] ?: ('#' . $inv['id']))
         . ($inv['client_company'] ? ' — ' . $inv['client_company'] : '');

  $success = $GLOBALS['STRIPE_SUCCESS_URL'] ?? 'https://gakinz.com/app/invoicing?paid=1';
  $cancel  = $GLOBALS['STRIPE_CANCEL_URL']  ?? 'https://gakinz.com/app/invoicing';

  // Flat form encoding for Stripe's nested params.
  $params = [
    'mode'                                 => 'payment',
    'success_url'                          => $success,
    'cancel_url'                           => $cancel,
    'client_reference_id'                  => (string)$inv['id'],
    'metadata[invoice_id]'                 => (string)$inv['id'],
    'payment_intent_data[metadata][invoice_id]' => (string)$inv['id'],
    'line_items[0][quantity]'              => '1',
    'line_items[0][price_data][currency]'  => $currency,
    'line_items[0][price_data][unit_amount]'        => (string)$minor,
    'line_items[0][price_data][product_data][name]' => $label,
  ];
  if (!empty($inv['client_email']) && filter_var($inv['client_email'], FILTER_VALIDATE_EMAIL)) {
    $params['customer_email'] = $inv['client_email'];
  }

  $ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_USERPWD        => $secret . ':',
    CURLOPT_POSTFIELDS     => http_build_query($params),
  ]);
  $res  = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $cerr = curl_error($ch);
  curl_close($ch);

  if ($res === false) {
    error_log('GAkinz Stripe link (transport): ' . $cerr);
    fail('Could not reach the payment provider. Please try again.', 502);
  }
  $data = json_decode($res, true) ?: [];
  if ($code >= 400) {
    error_log('GAkinz Stripe link: ' . ($data['error']['message'] ?? $res));
    fail('Stripe error creating the payment link.', 502);
  }
  $url = $data['url'] ?? '';
  if ($url === '') fail('Stripe returned no checkout URL.', 502);

  audit($conn, $user['id'], 'invoice_pay_link', '#' . $inv['id'] . ' — ' . $label);
  ok(['url' => $url, 'session_id' => $data['id'] ?? '']);
}

// ── Stripe webhook: mark an invoice paid ────────────────────────────────────
if ($method === 'POST' && $action === 'webhook') {
  $secret = $GLOBALS['STRIPE_WEBHOOK_SECRET'] ?? '';
  $payload = file_get_contents('php://input') ?: '';
  $sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

  if ($secret === '' || str_starts_with($secret, 'REPLACE')) { http_response_code(503); echo '{}'; exit; }

  // Parse "t=...,v1=..." and recompute the HMAC over "{t}.{payload}".
  $t = ''; $v1 = '';
  foreach (explode(',', $sigHeader) as $part) {
    [$k, $val] = array_pad(explode('=', $part, 2), 2, '');
    if ($k === 't') $t = $val;
    elseif ($k === 'v1' && $v1 === '') $v1 = $val;
  }
  if ($t === '' || $v1 === '') { http_response_code(400); echo '{}'; exit; }
  $expected = hash_hmac('sha256', $t . '.' . $payload, $secret);
  if (!hash_equals($expected, $v1)) { http_response_code(400); echo '{}'; exit; }
  // Reject very old timestamps (replay guard): 5 minute tolerance.
  if (abs(time() - (int)$t) > 300) { http_response_code(400); echo '{}'; exit; }

  $event = json_decode($payload, true) ?: [];
  $type = $event['type'] ?? '';
  $obj  = $event['data']['object'] ?? [];

  $invoiceId = 0;
  if (isset($obj['metadata']['invoice_id'])) $invoiceId = (int)$obj['metadata']['invoice_id'];
  elseif (isset($obj['client_reference_id'])) $invoiceId = (int)$obj['client_reference_id'];

  $paidTypes = ['checkout.session.completed', 'payment_intent.succeeded'];
  if (in_array($type, $paidTypes, true) && $invoiceId > 0) {
    // Require explicit confirmation — never optimistically assume paid.
    // checkout.session.completed must carry payment_status=paid (async methods
    // can complete unpaid); payment_intent must report status=succeeded.
    $payStatus = $obj['payment_status'] ?? '';
    $intentOk  = $type === 'payment_intent.succeeded' && ($obj['status'] ?? '') === 'succeeded';
    if ($payStatus === 'paid' || $intentOk) {
      $stmt = $conn->prepare(
        'UPDATE invoices SET status = "paid", paid_at = NOW()
         WHERE id = ? AND status <> "paid" AND deleted_at IS NULL'
      );
      $stmt->bind_param('i', $invoiceId);
      $stmt->execute();
      if ($stmt->affected_rows > 0) audit($conn, null, 'invoice_paid_stripe', '#' . $invoiceId . ' via ' . $type);
    }
  }

  http_response_code(200);
  echo '{"received":true}';
  exit;
}

// ── PayPal (Orders API v2) ──────────────────────────────────────────────────
function paypal_base(): string {
  return (($GLOBALS['PAYPAL_MODE'] ?? 'live') === 'sandbox')
    ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
}
function paypal_token(): string {
  $id = $GLOBALS['PAYPAL_CLIENT_ID'] ?? '';
  $secret = $GLOBALS['PAYPAL_SECRET'] ?? '';
  if ($id === '' || $secret === '') return '';
  $ch = curl_init(paypal_base() . '/v1/oauth2/token');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_USERPWD => $id . ':' . $secret,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_POSTFIELDS => 'grant_type=client_credentials',
  ]);
  $res = curl_exec($ch);
  curl_close($ch);
  return json_decode((string)$res, true)['access_token'] ?? '';
}

// Create a PayPal order and return the approve URL.
if ($method === 'POST' && $action === 'paypal_link') {
  $user = require_auth($conn, PAY_STAFF);
  if (($GLOBALS['PAYPAL_CLIENT_ID'] ?? '') === '' || ($GLOBALS['PAYPAL_SECRET'] ?? '') === '') {
    fail('PayPal is not configured on the server.', 503);
  }
  if (!function_exists('curl_init')) fail('PayPal needs the PHP cURL extension.', 503);

  $invoiceId = (int)(body()['invoice_id'] ?? 0);
  if ($invoiceId <= 0) fail('An invoice id is required.');
  $stmt = $conn->prepare(
    'SELECT i.id, i.number, i.status, i.currency, i.vat_rate,
            (SELECT COALESCE(SUM(qty*unit_price),0) FROM invoice_items it WHERE it.invoice_id=i.id) AS sub
     FROM invoices i WHERE i.id = ? AND i.deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('i', $invoiceId);
  $stmt->execute();
  $inv = $stmt->get_result()->fetch_assoc();
  if (!$inv) fail('Invoice not found.', 404);
  if ($inv['status'] === 'paid') fail('This invoice is already paid.');
  $total = round((float)$inv['sub'] * (1 + (float)$inv['vat_rate'] / 100), 2);
  if ($total <= 0) fail('This invoice has no billable total.');

  $token = paypal_token();
  if ($token === '') fail('Could not authenticate with PayPal.', 502);

  $appUrl = rtrim($GLOBALS['APP_URL'] ?? 'https://gakinz.com', '/');
  $num = $inv['number'] ?: ('#' . $inv['id']);
  $payload = json_encode([
    'intent' => 'CAPTURE',
    'purchase_units' => [[
      'custom_id' => (string)$inv['id'],
      'description' => 'Invoice ' . $num,
      'amount' => ['currency_code' => strtoupper($inv['currency'] ?: 'GBP'), 'value' => number_format($total, 2, '.', '')],
    ]],
    'application_context' => [
      'user_action' => 'PAY_NOW',
      'return_url' => "$appUrl/payments.php?action=paypal_return&invoice_id=" . $inv['id'],
      'cancel_url' => "$appUrl/app/invoicing",
    ],
  ]);
  $ch = curl_init(paypal_base() . '/v2/checkout/orders');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $token],
    CURLOPT_POSTFIELDS => $payload,
  ]);
  $res = curl_exec($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  $data = json_decode((string)$res, true) ?: [];
  if ($code >= 400) { error_log('GAkinz PayPal order: ' . $res); fail('PayPal error creating the order.', 502); }
  $approve = '';
  foreach ($data['links'] ?? [] as $l) if (($l['rel'] ?? '') === 'approve') $approve = $l['href'];
  if ($approve === '') fail('PayPal returned no approval URL.', 502);
  audit($conn, $user['id'], 'invoice_paypal_link', '#' . $inv['id']);
  ok(['url' => $approve, 'order_id' => $data['id'] ?? '']);
}

// PayPal return → capture the order, mark the invoice paid, redirect back.
if ($method === 'GET' && $action === 'paypal_return') {
  $appUrl = rtrim($GLOBALS['APP_URL'] ?? 'https://gakinz.com', '/');
  $invoiceId = (int)($_GET['invoice_id'] ?? 0);
  $orderId = preg_replace('/[^A-Za-z0-9]/', '', (string)($_GET['token'] ?? ''));
  $bounce = "$appUrl/app/invoicing";
  if ($invoiceId <= 0 || $orderId === '') { header("Location: $bounce?payfail=1"); exit; }
  $token = paypal_token();
  if ($token === '') { header("Location: $bounce?payfail=1"); exit; }

  $ch = curl_init(paypal_base() . "/v2/checkout/orders/$orderId/capture");
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $token],
    CURLOPT_POSTFIELDS => '{}',
  ]);
  $res = curl_exec($ch);
  curl_close($ch);
  $data = json_decode((string)$res, true) ?: [];
  // Require COMPLETED capture AND a custom_id matching the expected invoice.
  $captured = ($data['status'] ?? '') === 'COMPLETED';
  $custom = $data['purchase_units'][0]['payments']['captures'][0]['custom_id']
          ?? ($data['purchase_units'][0]['custom_id'] ?? '');
  if ($captured && (int)$custom === $invoiceId) {
    $upd = $conn->prepare('UPDATE invoices SET status = "paid", paid_at = NOW() WHERE id = ? AND status <> "paid" AND deleted_at IS NULL');
    $upd->bind_param('i', $invoiceId);
    $upd->execute();
    if ($upd->affected_rows > 0) audit($conn, null, 'invoice_paid_paypal', '#' . $invoiceId);
    header("Location: $bounce?paid=1"); exit;
  }
  header("Location: $bounce?payfail=1"); exit;
}

fail('Unknown action.', 400);
