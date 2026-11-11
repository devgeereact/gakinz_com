#!/bin/bash
# Daily backup of the GAkinz database and uploaded files, run ON THE HOST by cron (docs/OPERATIONS.md section 5).
#
#   ~/gakinz-backup.sh            # writes into ~/backups/gakinz_com/, keeps the newest 14 days of its own files
#
# Writes gakinz_auto_db_<UTC stamp>.sql.gz (a mysqldump of the one database, single transaction, so it does not lock
# the site) and gakinz_auto_files_<UTC stamp>.tar.gz (the uploads folder). Mode 600. The database login is read from the
# private config.php by PHP; the password reaches mysqldump through the MYSQL_PWD environment variable, so it never
# appears in a process list, a log or this repository. Exits non-zero, and says why in backups/gakinz_com/backup.log, if the dump is not
# complete (it must end with "-- Dump completed") or empty; a failed run never deletes older backups.
# Restore check, on the Mac: copy the .sql.gz down and run `pnpm run drill:restore <file>` (docs/OPERATIONS.md 10.1).
set -euo pipefail
umask 077
HOME_DIR="${HOME:?}"
CONF="$HOME_DIR/private-config/gakinz_com/config.php"
OUT="$HOME_DIR/backups/gakinz_com"
UPLOADS="$HOME_DIR/gakinz.com/uploads"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
mkdir -p "$OUT"
LOG="$OUT/backup.log"
log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" >>"$LOG"; }
fail() { log "FAILED: $*"; echo "gakinz-backup FAILED: $*" >&2; exit 1; }

# The login comes from config.php through PHP. The password goes in MYSQL_PWD (an environment variable, not a
# command-line argument), so it is not in the process list; the user name and host are not secret.
DB_USER_V="$(php -r 'require $argv[1]; echo DB_USER;' "$CONF" 2>/dev/null)" || fail "could not read the database user"
DB_HOST_V="$(php -r 'require $argv[1]; echo DB_HOST;' "$CONF" 2>/dev/null)" || fail "could not read the database host"
DB="$(php -r 'require $argv[1]; echo DB_NAME;' "$CONF" 2>/dev/null)" || fail "could not read the database name"
MYSQL_PWD="$(php -r 'require $argv[1]; echo DB_PASS;' "$CONF" 2>/dev/null)" || fail "could not read the database password"
export MYSQL_PWD
[ -n "$DB" ] && [ -n "$DB_USER_V" ] || fail "empty database name or user"

SQLF="$OUT/gakinz_auto_db_${STAMP}.sql.gz"
DUMP="$(command -v mariadb-dump || command -v mysqldump)"
"$DUMP" -h "$DB_HOST_V" -u "$DB_USER_V" --single-transaction --skip-lock-tables --routines "$DB" 2>>"$LOG" | gzip >"$SQLF" || { rm -f "$SQLF"; fail "mysqldump failed"; }
[ "$(gzip -dc "$SQLF" | tail -c 400 | grep -c '^-- Dump completed')" -ge 1 ] || { rm -f "$SQLF"; fail "dump is incomplete (no completed marker)"; }
[ "$(stat -c %s "$SQLF")" -gt 2000 ] || { rm -f "$SQLF"; fail "dump is suspiciously small"; }
chmod 600 "$SQLF"

FILESF="$OUT/gakinz_auto_files_${STAMP}.tar.gz"
if [ -d "$UPLOADS" ]; then
  tar -czf "$FILESF" -C "$HOME_DIR/gakinz.com" uploads || { rm -f "$FILESF"; fail "tar of uploads failed"; }
  chmod 600 "$FILESF"
else
  FILESF="(no uploads folder yet)"
fi

# Only after both succeeded: drop this script's own files older than 14 days.
find "$OUT" -maxdepth 1 -type f \( -name 'gakinz_auto_db_*.sql.gz' -o -name 'gakinz_auto_files_*.tar.gz' \) -mtime +14 -delete
log "ok db=$(basename "$SQLF") $(stat -c %s "$SQLF")B files=$(basename "$FILESF")"
