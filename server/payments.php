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

  if ($res === false) fail('Payment request failed: ' . $cerr, 502);
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
    // checkout.session.completed without payment is possible for async methods;
    // require a paid payment_status when present.
    $payStatus = $obj['payment_status'] ?? 'paid';
    if ($payStatus === 'paid' || $type === 'payment_intent.succeeded') {
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

fail('Unknown action.', 400);
