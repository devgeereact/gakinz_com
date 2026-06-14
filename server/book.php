<?php
/**
 * Discovery-call booking (Calendly). Public — returns the configured booking URL
 * so the marketing site and CMS can show a "Book a call" embed/button. Returns
 * an empty url when not configured (the UI then hides the booking option).
 *
 *   GET /book.php   → { url }
 */
require __DIR__ . '/_bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] !== 'GET') fail('Method not allowed.', 405);
ok(['url' => $GLOBALS['CALENDLY_URL'] ?? '']);
