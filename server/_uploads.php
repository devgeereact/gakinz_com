<?php
/**
 * Where uploaded files live, and the one rule for turning a stored name from
 * the database into a path on disk. Shared by files.php (streaming) and the
 * retention executor in cron.php (removing soft-deleted files), so both use
 * exactly the same check. Upload this file together with files.php.
 */

const UPLOAD_DIR = __DIR__ . '/uploads';

/**
 * True when a stored name is one plain file name: no separator and no leading
 * dot, so never `..` or `.htaccess`. \z, not $: a `$` would also match before
 * a trailing newline.
 */
function stored_name_ok(string $stored): bool {
  return (bool)preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{0,254}\z/', $stored);
}

/**
 * The on-disk path for a stored name, or null. The stored name comes from the
 * database, so it is never trusted: it must pass stored_name_ok(), and the
 * resolved path must sit directly inside the upload directory, which also
 * rules out a symlink pointing elsewhere.
 */
function stored_path(string $stored): ?string {
  if (!stored_name_ok($stored)) return null;
  $dir = realpath(UPLOAD_DIR);
  $real = realpath(UPLOAD_DIR . '/' . $stored);
  if ($dir === false || $real === false || dirname($real) !== $dir || !is_file($real)) return null;
  return $real;
}
