<?php
/**
 * Server-side OpenWeather proxy. The API key never reaches the browser (same
 * rule as ai.php — brief §2). Auth-gated: any signed-in CMS user may read it.
 *
 *   GET /weather.php?city=London   (Bearer)   → { city, country, temp,
 *       feels_like, description, icon, humidity, wind, units, updated }
 *
 * Responses are cached per city for 10 minutes in the system temp dir so a busy
 * dashboard doesn't burn the OpenWeather rate limit.
 */
require __DIR__ . '/_bootstrap.php';

require_auth($conn); // any authenticated user

if ($_SERVER['REQUEST_METHOD'] !== 'GET') fail('Method not allowed.', 405);

if (!defined('OPENWEATHER_API_KEY') || OPENWEATHER_API_KEY === '' || str_starts_with(OPENWEATHER_API_KEY, 'REPLACE')) {
  fail('Weather is not configured on the server.', 503);
}

$city  = str_field($_GET, 'city', 80);
if ($city === '') $city = 'London'; // company HQ default
$units = defined('OPENWEATHER_UNITS') ? OPENWEATHER_UNITS : 'metric';

// ── Cache (10 min, per city+units) ───────────────────────────────────────────
$cacheKey  = 'gk_weather_' . md5(strtolower($city) . '|' . $units) . '.json';
$cacheFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . $cacheKey;
const WEATHER_TTL = 600; // seconds

if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < WEATHER_TTL) {
  $cached = file_get_contents($cacheFile);
  if ($cached !== false && $cached !== '') {
    echo $cached;
    exit;
  }
}

// ── Fetch ────────────────────────────────────────────────────────────────────
$url = 'https://api.openweathermap.org/data/2.5/weather?'
  . http_build_query([
      'q'     => $city,
      'units' => $units,
      'appid' => OPENWEATHER_API_KEY,
    ]);

$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 15,
]);
$res  = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err  = curl_error($ch);
curl_close($ch);

if ($res === false) fail('Weather request failed: ' . $err, 502);
if ($code === 404)  fail('City not found.', 404);
if ($code >= 400)   fail('Weather provider error.', 502);

$d = json_decode($res, true);
if (!is_array($d) || !isset($d['main'])) fail('Weather returned no data.', 502);

$out = [
  'city'       => $d['name'] ?? $city,
  'country'    => $d['sys']['country'] ?? '',
  'temp'       => isset($d['main']['temp']) ? round((float)$d['main']['temp']) : null,
  'feels_like' => isset($d['main']['feels_like']) ? round((float)$d['main']['feels_like']) : null,
  'description'=> $d['weather'][0]['description'] ?? '',
  'icon'       => $d['weather'][0]['icon'] ?? '',
  'humidity'   => $d['main']['humidity'] ?? null,
  'wind'       => isset($d['wind']['speed']) ? (float)$d['wind']['speed'] : null,
  'units'      => $units,
  'updated'    => gmdate('c'),
];

$json = json_encode($out);
@file_put_contents($cacheFile, $json); // best-effort cache write
echo $json;
exit;
