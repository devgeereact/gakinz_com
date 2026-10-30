#!/usr/bin/env bash
# Upload dist/ to the cPanel host over FTPS without ever deleting a remote file (RULES.md section 7).
# Two passes: everything except the HTML entry points, then the HTML entry points last, so a visitor
# never gets a page that points at assets not yet uploaded. Replaces FTP-Deploy-Action (K-109), which
# deletes remote files that are missing from the build.
#
# Environment: FTP_SERVER, FTP_USERNAME, FTP_PASSWORD (GitHub secrets). The password is read from
# the environment and written to lftp's standard input, never to the command line.
# Tests: DEPLOY_TARGET_URL=file:///some/dir runs the same two passes against a local folder.
set -euo pipefail

SRC="$(cd "${1:-dist}" && pwd)"

# Explicit FTPS: plain ftp:// on port 21 upgraded with AUTH TLS (ftp:ssl-force below). lftp's ftps:// is
# implicit TLS on port 990, which the host does not offer; the first CI run timed out on it (K-109).
TARGET="${DEPLOY_TARGET_URL:-ftp://${FTP_SERVER:?FTP_SERVER is not set}}"
ENTRY='(^|/)(index|app-shell)\.html$'

{
  echo 'set cmd:fail-exit yes'
  echo 'set net:max-retries 3'
  echo 'set net:timeout 20'
  echo 'set net:reconnect-interval-base 5'
  if [ -z "${DEPLOY_TARGET_URL:-}" ]; then
    echo 'set ftp:ssl-force yes'
    echo 'set ftp:ssl-protect-data yes'
    echo 'set ssl:verify-certificate yes'
    echo "user \"${FTP_USERNAME:?FTP_USERNAME is not set}\" \"${FTP_PASSWORD:?FTP_PASSWORD is not set}\""
  fi
  # No --delete, no --delete-first: nothing on the host is ever removed.
  echo "lcd \"$SRC\""
  echo "mirror -R --parallel=4 -x '$ENTRY' . ."
  echo "mirror -R -i '$ENTRY' . ."
  echo 'bye'
} | lftp "$TARGET"
