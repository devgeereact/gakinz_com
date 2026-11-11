#!/usr/bin/env bash
# Save an AI setting into the server's private config, without showing it.
#
#   scripts/set-server-key.sh ANTHROPIC_KEY      # Anthropic, tried first
#   scripts/set-server-key.sh OPENROUTER_KEY     # OpenRouter, the backup
#   scripts/set-server-key.sh STRIPE_SECRET      # Stripe secret or restricted key (sk_test_, rk_test_, sk_live_, rk_live_)
#   scripts/set-server-key.sh STRIPE_WEBHOOK_SECRET   # the endpoint's signing secret (whsec_...)
#   scripts/set-server-key.sh                    # asks which
#
# Also takes ANTHROPIC_MODEL, ANTHROPIC_EFFORT, OR_MODEL and OR_FALLBACK_MODEL (the OpenRouter model tried when
# OR_MODEL fails; shown as you type). The two STRIPE_ settings are written as plain variables ($STRIPE_SECRET = '...';),
# because payments.php reads them from $GLOBALS; the others are define() lines.
#
# The value is read with a hidden prompt and sent over SSH on standard input, so
# it never appears on screen, in shell history, in a process list or in this
# repository. On the server it replaces (or adds) one define() line in
# ~/private-config/gakinz_com/config.php, after a dated backup in
# ~/backups/gakinz_com/, checks the file with php -l, and keeps it mode 600.
# Prints the name and the length only.
#
# Host: the "cpanel" entry in ~/.ssh/config (GK_SSH_HOST overrides it). With
# GK_SSH_HOST=local it edits $HOME/private-config/gakinz_com/config.php on this
# machine instead, for trying the script against a throwaway HOME.
set -euo pipefail

HOST="${GK_SSH_HOST:-cpanel}"
ALLOWED="ANTHROPIC_KEY OPENROUTER_KEY ANTHROPIC_MODEL ANTHROPIC_EFFORT OR_MODEL OR_FALLBACK_MODEL STRIPE_SECRET STRIPE_WEBHOOK_SECRET"

NAME="${1:-}"
if [[ -z "$NAME" ]]; then
  echo "Which setting?"
  select NAME in $ALLOWED; do [[ -n "$NAME" ]] && break; done
fi
if [[ " $ALLOWED " != *" $NAME "* ]]; then
  echo "Unknown setting '$NAME'. Use one of: $ALLOWED" >&2
  exit 2
fi

if [[ "$NAME" == *_KEY || "$NAME" == STRIPE_SECRET || "$NAME" == STRIPE_WEBHOOK_SECRET ]]; then
  read -rs -p "Paste the value for $NAME (hidden), then Enter: " VALUE
  echo
else
  read -r -p "Value for $NAME: " VALUE
fi
VALUE="${VALUE//[$'\t\r\n ']/}"
if [[ -z "$VALUE" ]]; then
  echo "Nothing entered; the server was not changed." >&2
  exit 1
fi

# Runs on the server. Reads the setting name from argv and the value from stdin.
read -r -d '' REMOTE <<'PHP' || true
$name = $argv[1] ?? '';
$allowed = ['ANTHROPIC_KEY', 'OPENROUTER_KEY', 'ANTHROPIC_MODEL', 'ANTHROPIC_EFFORT', 'OR_MODEL', 'OR_FALLBACK_MODEL', 'STRIPE_SECRET', 'STRIPE_WEBHOOK_SECRET'];
$asVariable = in_array($name, ['STRIPE_SECRET', 'STRIPE_WEBHOOK_SECRET'], true);
if (!in_array($name, $allowed, true)) { fwrite(STDERR, "Unknown setting.\n"); exit(2); }
$value = trim((string)stream_get_contents(STDIN));
if (!preg_match('~^[A-Za-z0-9._:/-]{1,400}$~', $value)) { fwrite(STDERR, "That value has characters a key never has; nothing was changed.\n"); exit(2); }
$home = rtrim((string)getenv('HOME'), '/');
$file = "$home/private-config/gakinz_com/config.php";
if (!is_file($file)) { fwrite(STDERR, "No private config at ~/private-config/gakinz_com/config.php; nothing was changed.\n"); exit(1); }
$src = (string)file_get_contents($file);
$line = $asVariable ? "\$$name = '$value';" : "define('$name', '$value');";
$pattern = $asVariable
  ? '~^[ \t]*\$' . $name . '\s*=.*$~m'
  : '~^[ \t]*define\(\s*[\'"]' . $name . '[\'"]\s*,.*$~m';
if (preg_match($pattern, $src)) {
  $out = preg_replace_callback($pattern, fn() => $line, $src, 1);
} elseif (preg_match('~\?>\s*$~', $src)) {
  $out = preg_replace('~\?>\s*$~', $line . "\n?>\n", $src, 1);
} else {
  $out = rtrim($src) . "\n" . $line . "\n";
}
$backups = "$home/backups/gakinz_com";
if (!is_dir($backups)) mkdir($backups, 0700, true);
$backup = "$backups/config.php." . gmdate('Ymd\THis\Z') . '.' . $name;
copy($file, $backup); chmod($backup, 0600);
$tmp = $file . '.new';
file_put_contents($tmp, $out); chmod($tmp, 0600);
exec(escapeshellarg(PHP_BINARY) . ' -l ' . escapeshellarg($tmp) . ' 2>&1', $lint, $rc);
if ($rc !== 0) { unlink($tmp); fwrite(STDERR, "The edited file failed php -l; the old one is untouched.\n"); exit(1); }
rename($tmp, $file); chmod($file, 0600);
echo "Saved $name (" . strlen($value) . " characters) in ~/private-config/gakinz_com/config.php. Backup: " . str_replace($home, '~', $backup) . "\n";
PHP

B64="$(printf '%s' "$REMOTE" | base64 | tr -d '\n')"
CMD="php -r \"eval(base64_decode('$B64'));\" -- $NAME"

if [[ "$HOST" == "local" ]]; then
  printf '%s' "$VALUE" | sh -c "$CMD"
else
  printf '%s' "$VALUE" | ssh "$HOST" "$CMD"
fi
unset VALUE
