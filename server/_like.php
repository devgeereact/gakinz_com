<?php
/**
 * Literal substring matching for LIKE. Shared include: no output, no database
 * connection, so the CLI and the tests can load it on its own.
 *
 * The escape character is `!`, not the default backslash. A backslash inside
 * an SQL string literal means something different when the server's sql_mode
 * includes NO_BACKSLASH_ESCAPES (`ESCAPE '\\'` is then two characters and the
 * query fails with error 1210), whereas `'!'` reads the same in every mode.
 *
 *   $sql = '... WHERE name' . LIKE_CONTAINS_SQL;   // " LIKE ? ESCAPE '!'"
 *   bind the value like_contains($typed)
 */

const LIKE_ESCAPE_CHAR = '!';
const LIKE_CONTAINS_SQL = " LIKE ? ESCAPE '!'";

/** A pattern that matches $q literally anywhere: `!`, `%` and `_` escaped with `!`. */
function like_contains(string $q): string {
  return '%' . strtr($q, ['!' => '!!', '%' => '!%', '_' => '!_']) . '%';
}
