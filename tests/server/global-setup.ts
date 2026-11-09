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
import net from "node:net"
import path from "node:path"
import {
  assertSafeTarget, BASE, DB_HOST, DB_NAME, DB_PASS, DB_PORT, DB_USER, PHP_PORT, PROVIDER_BASE,
  AI_MODE, PROVIDER_LOG, PROVIDER_PORT, STRIPE_SECRET, WEBHOOK_SECRET, WORK_DIR,
} from "./env"
import { mysqlArgs } from "./helpers"

const ROOT = path.resolve(__dirname, "../..")

function phpString(v: string): string {
  return `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`
}

function syntheticConfig(): string {
  // The port is passed as the fifth mysqli argument, so GK_TEST_DB_PORT reaches the PHP side too.
  const host = DB_HOST === "127.0.0.1" ? "127.0.0.1" : "localhost"
  return `<?php
// Synthetic configuration written by tests/server/global-setup.ts. Test only.
// No mysqli_report() call, as in config.php.example: PHP 8 defaults apply, so a
// failed query throws exactly as it would on the live host.
define('GK_DEBUG', true);
define('DB_HOST', ${phpString(host)});
define('DB_NAME', ${phpString(DB_NAME)});
define('DB_USER', ${phpString(DB_USER)});
define('DB_PASS', ${phpString(DB_PASS)});
define('OR_MODEL', '');
define('OR_SITE', '${BASE}');
define('ALLOWED_ORIGINS', ['${BASE}']);
define('CLERK_ISSUER', 'https://clerk.test.example');
define('CLERK_AUTHORIZED_PARTIES', ['https://gakinz.com', 'https://local.gakinz.com']);
define('CLERK_CACHE_DIR', ${phpString(path.join(WORK_DIR, "clerk-cache"))});
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
$APP_URL = '${BASE}';
$CRON_KEY = ''; $REPORT_RECIPIENTS = '';
$PAYPAL_CLIENT_ID = ''; $PAYPAL_SECRET = ''; $PAYPAL_MODE = 'sandbox';
$GITHUB_TOKEN = ''; $FIGMA_TOKEN = ''; $SLACK_WEBHOOK_URL = ''; $CALENDLY_URL = '';
// Retention periods (_retention.php): two rules set so privacy.test.ts can check
// the counts, the rest null ("period not set"). The report never changes a row.
$RETENTION_ENQUIRY_MONTHS = 12; $RETENTION_DELETED_FILE_DAYS = 30;
$RETENTION_CLIENT_MONTHS = null; $RETENTION_INVOICE_MONTHS = null; $RETENTION_AUDIT_MONTHS = null;
$RETENTION_SUPPORT_MONTHS = null; $RETENTION_COMMS_MONTHS = null; $RETENTION_STAFF_MONTHS = null;
$RETENTION_CERTIFICATE_MONTHS = null;
// The retention executor (cron.php job=retention_apply) never deletes unless a
// test turns this on through overrides.json, as in config.php.example.
$RETENTION_APPLY = false;
// Client anonymisation is off, as in config.php.example; client-anonymise.test.ts
// turns it on through overrides.json for its own requests.
$CLIENT_ANONYMISE_ENABLED = false;
// Test only: a test may write overrides.json beside this file to change config
// globals for its own requests (privacy.test.ts sets every retention period,
// an invalid one and a cron key), and removes it afterwards.
$__gk_over = @json_decode((string)@file_get_contents(__DIR__ . '/overrides.json'), true);
if (is_array($__gk_over)) foreach ($__gk_over as $__k => $__v) $GLOBALS[$__k] = $__v;
// AI keys (_ai.php): synthetic, pointed at the fake provider. A test may blank one
// through overrides.json (TEST_ANTHROPIC_KEY, TEST_OPENROUTER_KEY).
define('ANTHROPIC_KEY', (string)($GLOBALS['TEST_ANTHROPIC_KEY'] ?? 'test-anthropic-key'));
define('OPENROUTER_KEY', (string)($GLOBALS['TEST_OPENROUTER_KEY'] ?? 'test-openrouter-key'));
// Off unless a test asks for it through overrides.json (ai.test.ts), so other tests see one OpenRouter call.
// This must come after overrides.json is read above.
if (!empty($GLOBALS['TEST_OR_FALLBACK_MODEL'])) define('OR_FALLBACK_MODEL', (string)$GLOBALS['TEST_OR_FALLBACK_MODEL']);
$AI_ANTHROPIC_BASE = '${PROVIDER_BASE}';
$AI_OPENROUTER_BASE = '${PROVIDER_BASE}';
$conn = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, ${Number(DB_PORT) || 3306});
if ($conn->connect_errno) { http_response_code(500); echo json_encode(['error' => 'Test database connection failed']); exit; }
$conn->set_charset('utf8mb4');
$OR_API_KEY = OPENROUTER_KEY;
$OR_MODEL   = OR_MODEL;
`
}

// Stand-ins for the Anthropic Messages API and OpenRouter. ai.test.ts picks each
// one's answer by writing AI_MODE ({ anthropic, openrouter }: ok | error | refusal).
function aiReply(url: string, reqBody = ""): { status: number; body: unknown } | null {
  const which = url.startsWith("/v1/messages") ? "anthropic" : url.startsWith("/v1/chat/completions") ? "openrouter" : null
  if (!which) return null
  let mode = "ok"
  try { mode = JSON.parse(fs.readFileSync(AI_MODE, "utf8"))[which] ?? "ok" } catch { /* default ok */ }
  // "error-primary": OpenRouter refuses every model except the configured backup one.
  if (mode === "error-primary") {
    let model = ""
    try { model = JSON.parse(reqBody).model ?? "" } catch { /* not JSON */ }
    mode = model === "test/backup-model" ? "ok" : "error"
  }
  if (mode === "error") return { status: 529, body: { type: "error", error: { type: "overloaded_error", message: "Overloaded" } } }
  if (which === "anthropic") {
    if (mode === "refusal") return { status: 200, body: { stop_reason: "refusal", stop_details: { type: "refusal", category: null }, content: [] } }
    return { status: 200, body: { stop_reason: "end_turn", content: [{ type: "thinking", thinking: "" }, { type: "text", text: "Draft from Anthropic." }] } }
  }
  return { status: 200, body: { choices: [{ message: { content: "Draft from OpenRouter." } }] } }
}

function startProvider(): http.Server {
  // Minimal stand-in for Stripe's Checkout Session endpoint. Records requests.
  const server = http.createServer((req, res) => {
    let body = ""
    req.on("data", (c) => (body += c))
    req.on("end", () => {
      fs.appendFileSync(PROVIDER_LOG, JSON.stringify({ path: req.url, headers: req.headers, body }) + "\n")
      res.setHeader("Content-Type", "application/json")
      const ai = aiReply(req.url ?? "", body)
      if (ai) {
        res.statusCode = ai.status
        res.end(JSON.stringify(ai.body))
        return
      }
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

/**
 * Throws when something already listens on `port`. Without this, a stale
 * `php -S` left by an earlier run would silently answer this run's requests
 * from whatever it was started with.
 */
async function assertPortFree(port: number, what: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const probe = net.createServer()
    probe.once("error", (e: NodeJS.ErrnoException) =>
      reject(new Error(e.code === "EADDRINUSE"
        ? `Port ${port} (${what}) is already in use on 127.0.0.1. Stop whatever listens there (lsof -nP -iTCP:${port} -sTCP:LISTEN) or pick another port.`
        : `Could not check port ${port} (${what}): ${e.message}`)))
    probe.once("listening", () => probe.close(() => resolve()))
    probe.listen(port, "127.0.0.1")
  })
}

/** True once nothing accepts a connection on `port`. */
async function portClosed(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.connect(port, "127.0.0.1")
    s.once("connect", () => { s.destroy(); resolve(false) })
    s.once("error", () => resolve(true))
  })
}

/**
 * Stops `php -S` and every worker it forked. With PHP_CLI_SERVER_WORKERS the
 * workers outlive a kill of the parent alone, so the server is started in its
 * own process group and the whole group is signalled.
 */
async function stopPhp(php: ChildProcess): Promise<void> {
  const signal = (sig: NodeJS.Signals) => {
    try { if (php.pid) process.kill(-php.pid, sig) } catch { /* group already gone */ }
  }
  signal("SIGTERM")
  const until = Date.now() + 5_000
  while (Date.now() < until) {
    if (await portClosed(PHP_PORT)) return
    await new Promise((r) => setTimeout(r, 100))
  }
  signal("SIGKILL")
}

export default async function setup(): Promise<() => Promise<void>> {
  assertSafeTarget()
  await assertPortFree(PHP_PORT, "PHP test server")
  await assertPortFree(PROVIDER_PORT, "fake payment provider")

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
    // detached: its own process group, so teardown can stop the workers too.
    { stdio: "ignore", detached: true, env: { ...process.env, PHP_CLI_SERVER_WORKERS: "6" } },
  )
  // Ctrl-C, a kill or a crash skips the teardown below, so stop the whole
  // php -S group synchronously on the way out, or its workers keep the port.
  const killGroup = () => {
    try { if (php.pid) process.kill(-php.pid, "SIGKILL") } catch { /* group already gone */ }
  }
  const onSignal = (sig: NodeJS.Signals) => {
    killGroup()
    // A listener stops Node's default exit, so re-raise the signal when no one
    // else (vitest included) is left to handle it.
    if (process.listenerCount(sig) === 0) process.kill(process.pid, sig)
  }
  process.once("SIGINT", onSignal)
  process.once("SIGTERM", onSignal)
  process.once("exit", killGroup)
  const removeExitHandlers = () => {
    process.off("SIGINT", onSignal)
    process.off("SIGTERM", onSignal)
    process.off("exit", killGroup)
  }

  try {
    await waitFor(`${BASE}/book.php`)
  } catch (e) {
    await stopPhp(php)
    removeExitHandlers()
    provider.close()
    throw e
  }

  return async () => {
    await stopPhp(php)
    removeExitHandlers()
    provider.close()
    spawnSync("mysql", [...mysqlArgs(), "-e", `DROP DATABASE IF EXISTS ${DB_NAME};`])
  }
}
