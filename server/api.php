<?php
/**
 * Health check (build order step 1). Unauthenticated and read-only: it proves
 * PHP runs and the database connection works, and nothing else.
 *
 *   GET /api.php → { ok: true, php: "8.x.y", db: true }
 *
 * It used to list and INSERT rows in `items`, which let anyone write to the
 * production database. Both branches were removed; the endpoint now touches no
 * application table and never mutates anything.
 */
require __DIR__ . '/_bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') fail('Method not allowed.', 405);

$db = false;
if ($res = $conn->query('SELECT 1 AS ping')) {
  $db = (int)($res->fetch_assoc()['ping'] ?? 0) === 1;
}
if (!$db) fail('Database connection failed.', 500);

// No version numbers: this endpoint is public, and the PHP version only helps
// someone matching the host against known vulnerabilities.
ok(['ok' => true, 'db' => true]);
