/**
 * Vitest global setup for server integration tests.
 *
 * 1. Refuses to run unless the database is local and its name ends in _test.
 * 2. Recreates that database from server/schema.sql.
 * 3. Copies server/ to a temporary folder and writes a synthetic config.php
 *    there. The repository's own config.php (if any) is never read or copied.
 * 4. Starts a fake payment provider and `php -S` on 127.0.0.1. PHP mail() is
 *    pointed at /usr/bin/true so nothing can be sent.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process"
import fs from "node:fs"
import http from "node:http"
import path from "node:path"
import {
  assertSafeTarget, BASE, DB_HOST, DB_NAME, DB_PASS, DB_PORT, DB_USER, PHP_PORT, PROVIDER_BASE,
  PROVIDER_LOG, PROVIDER_PORT, STRIPE_SECRET, WEBHOOK_SECRET, WORK_DIR,
} from "./env"
import { mysqlArgs } from "./helpers"

const ROOT = path.resolve(__dirname, "../..")

function phpString(v: string): string {
  return `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`
}

function syntheticConfig(): string {
  const host = DB_HOST === "127.0.0.1" ? `127.0.0.1:${DB_PORT}` : "localhost"
  return `<?php
// Synthetic configuration written by tests/server/global-setup.ts. Test only.
// No mysqli_report() call, as in config.php.example: PHP 8 defaults apply, so a
// failed query throws exactly as it would on the live host.
define('GK_DEBUG', true);
define('DB_HOST', ${phpString(host)});
define('DB_NAME', ${phpString(DB_NAME)});
define('DB_USER', ${phpString(DB_USER)});
define('DB_PASS', ${phpString(DB_PASS)});
define('OPENROUTER_KEY', '');
define('OR_MODEL', '');
define('OR_SITE', '${BASE}');
define('ALLOWED_ORIGINS', ['${BASE}']);
define('OPENWEATHER_API_KEY', '');
define('OPENWEATHER_UNITS', 'metric');
$SEED_ADMIN_EMAIL = ''; $SEED_ADMIN_PASSWORD = '';
$SMTP_HOST = ''; $SMTP_PORT = 465; $SMTP_SECURE = ''; $SMTP_USER = ''; $SMTP_PASS = '';
$SMTP_FROM = 'test@example.test'; $SMTP_FROM_NAME = 'Test';
$IMAP_HOST = ''; $IMAP_PORT = 993; $IMAP_USER = ''; $IMAP_PASS = '';
$TWILIO_SID = ''; $TWILIO_TOKEN = ''; $TWILIO_FROM = ''; $TWILIO_WHATSAPP_FROM = '';
$STRIPE_SECRET = '${STRIPE_SECRET}';
$STRIPE_WEBHOOK_SECRET = '${WEBHOOK_SECRET}';
$STRIPE_API_BASE = '${PROVIDER_BASE}';
$STRIPE_SUCCESS_URL = '${BASE}/paid'; $STRIPE_CANCEL_URL = '${BASE}/cancel';
$GOOGLE_CLIENT_ID = ''; $GOOGLE_CLIENT_SECRET = ''; $GOOGLE_REDIRECT = ''; $APP_URL = '${BASE}';
$CRON_KEY = ''; $REPORT_RECIPIENTS = '';
$PAYPAL_CLIENT_ID = ''; $PAYPAL_SECRET = ''; $PAYPAL_MODE = 'sandbox';
$GITHUB_TOKEN = ''; $FIGMA_TOKEN = ''; $SLACK_WEBHOOK_URL = ''; $CALENDLY_URL = '';
$conn = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_errno) { http_response_code(500); echo json_encode(['error' => 'Test database connection failed']); exit; }
$conn->set_charset('utf8mb4');
$OR_API_KEY = OPENROUTER_KEY;
$OR_MODEL   = OR_MODEL;
`
}

function startProvider(): http.Server {
  // Minimal stand-in for Stripe's Checkout Session endpoint. Records requests.
  const server = http.createServer((req, res) => {
    let body = ""
    req.on("data", (c) => (body += c))
    req.on("end", () => {
      fs.appendFileSync(PROVIDER_LOG, JSON.stringify({ path: req.url, body }) + "\n")
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify({ id: "cs_test_synthetic", url: "https://checkout.example.test/cs_test_synthetic" }))
    })
  })
  server.listen(PROVIDER_PORT, "127.0.0.1")
  return server
}

async function waitFor(url: string, ms = 10_000): Promise<void> {
  const until = Date.now() + ms
  while (Date.now() < until) {
    try { await fetch(url); return } catch { await new Promise((r) => setTimeout(r, 100)) }
  }
  throw new Error(`Timed out waiting for ${url}`)
}

export default async function setup(): Promise<() => Promise<void>> {
  assertSafeTarget()

  const admin = spawnSync("mysql", [...mysqlArgs(), "-e", `DROP DATABASE IF EXISTS ${DB_NAME}; CREATE DATABASE ${DB_NAME} CHARACTER SET utf8mb4;`], { encoding: "utf8" })
  if (admin.status !== 0) throw new Error(`Could not create ${DB_NAME}: ${admin.stderr}`)
  const schema = spawnSync("mysql", mysqlArgs(DB_NAME), { input: fs.readFileSync(path.join(ROOT, "server/schema.sql")), encoding: "utf8" })
  if (schema.status !== 0) throw new Error(`Could not load schema: ${schema.stderr}`)

  fs.rmSync(WORK_DIR, { recursive: true, force: true })
  fs.cpSync(path.join(ROOT, "server"), WORK_DIR, {
    recursive: true,
    filter: (src) => !/[\\/](config\.php|uploads)$/.test(src),
  })
  fs.writeFileSync(path.join(WORK_DIR, "config.php"), syntheticConfig())

  const provider = startProvider()
  const php: ChildProcess = spawn(
    "php",
    ["-d", "sendmail_path=/usr/bin/true", "-d", "display_errors=0", "-d", "log_errors=1",
     "-d", `error_log=${path.join(WORK_DIR, "php-error.log")}`, "-S", `127.0.0.1:${PHP_PORT}`, "-t", WORK_DIR],
    // Several workers so concurrency tests exercise real parallel requests.
    { stdio: "ignore", env: { ...process.env, PHP_CLI_SERVER_WORKERS: "6" } },
  )
  await waitFor(`${BASE}/book.php`)

  return async () => {
    php.kill()
    provider.close()
    spawnSync("mysql", [...mysqlArgs(), "-e", `DROP DATABASE IF EXISTS ${DB_NAME};`])
  }
}
