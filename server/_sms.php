<?php
/**
 * Shared SMS transport for GAkinzOS (Twilio REST). Outbound only.
 *
 * Config lives in config.php (secrets never leave the server):
 *   $TWILIO_SID, $TWILIO_TOKEN, $TWILIO_FROM   (e.g. '+447700900123')
 *
 *   gk_sms_configured()                  → bool
 *   gk_send_sms(string $to, string $body) → ['ok' => bool, 'error' => string, 'sid' => string]
 *
 * The caller is responsible for any consent/opt-out policy; this just delivers.
 */

function gk_sms_configured(): bool {
  return ($GLOBALS['TWILIO_SID'] ?? '') !== ''
      && ($GLOBALS['TWILIO_TOKEN'] ?? '') !== ''
      && ($GLOBALS['TWILIO_FROM'] ?? '') !== '';
}

function gk_send_sms(string $to, string $body): array {
  $sid   = $GLOBALS['TWILIO_SID'] ?? '';
  $token = $GLOBALS['TWILIO_TOKEN'] ?? '';
  $from  = $GLOBALS['TWILIO_FROM'] ?? '';
  if ($sid === '' || $token === '' || $from === '') {
    return ['ok' => false, 'error' => 'SMS is not configured.', 'sid' => ''];
  }
  // Cap length — Twilio bills per 153-char segment; an unbounded body could send
  // hundreds of segments per call. 1600 chars ≈ the practical concatenated max.
  $body = mb_substr($body, 0, 1600);

  $url = 'https://api.twilio.com/2010-04-01/Accounts/' . rawurlencode($sid) . '/Messages.json';
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_USERPWD        => $sid . ':' . $token,
    CURLOPT_POSTFIELDS     => http_build_query([
      'From' => $from,
      'To'   => $to,
      'Body' => $body,
    ]),
  ]);
  $res  = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $cerr = curl_error($ch);
  curl_close($ch);

  if ($res === false) return ['ok' => false, 'error' => 'SMS request failed: ' . $cerr, 'sid' => ''];
  $data = json_decode($res, true) ?: [];
  if ($code >= 400) {
    $msg = $data['message'] ?? 'SMS provider error.';
    return ['ok' => false, 'error' => $msg, 'sid' => ''];
  }
  return ['ok' => true, 'error' => '', 'sid' => $data['sid'] ?? ''];
}

// ── WhatsApp (Twilio) — reuses the SMS credentials, different sender. ──────────
function gk_whatsapp_configured(): bool {
  return ($GLOBALS['TWILIO_SID'] ?? '') !== ''
      && ($GLOBALS['TWILIO_TOKEN'] ?? '') !== ''
      && ($GLOBALS['TWILIO_WHATSAPP_FROM'] ?? '') !== '';
}

function gk_send_whatsapp(string $to, string $body): array {
  $sid   = $GLOBALS['TWILIO_SID'] ?? '';
  $token = $GLOBALS['TWILIO_TOKEN'] ?? '';
  $from  = $GLOBALS['TWILIO_WHATSAPP_FROM'] ?? '';
  if ($sid === '' || $token === '' || $from === '') {
    return ['ok' => false, 'error' => 'WhatsApp is not configured.', 'sid' => ''];
  }
  // Twilio WhatsApp addresses are prefixed "whatsapp:". Normalise both ends.
  if (strpos($from, 'whatsapp:') !== 0) $from = 'whatsapp:' . $from;
  $to = trim($to);
  if (strpos($to, 'whatsapp:') !== 0) $to = 'whatsapp:' . $to;
  $body = mb_substr($body, 0, 1600);

  $url = 'https://api.twilio.com/2010-04-01/Accounts/' . rawurlencode($sid) . '/Messages.json';
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_USERPWD        => $sid . ':' . $token,
    CURLOPT_POSTFIELDS     => http_build_query(['From' => $from, 'To' => $to, 'Body' => $body]),
  ]);
  $res  = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $cerr = curl_error($ch);
  curl_close($ch);

  if ($res === false) return ['ok' => false, 'error' => 'WhatsApp request failed: ' . $cerr, 'sid' => ''];
  $data = json_decode($res, true) ?: [];
  if ($code >= 400) return ['ok' => false, 'error' => $data['message'] ?? 'WhatsApp provider error.', 'sid' => ''];
  return ['ok' => true, 'error' => '', 'sid' => $data['sid'] ?? ''];
}
