/**
 * Helpers for server integration tests: run SQL against the throwaway test
 * database, call the local PHP server, and create synthetic users and records.
 */
import { spawnSync } from "node:child_process"
import crypto from "node:crypto"
import fs from "node:fs"
import { BASE, DB_HOST, DB_NAME, DB_PASS, DB_PORT, DB_USER, PROVIDER_LOG, WEBHOOK_SECRET } from "./env"

export function mysqlArgs(database?: string): string[] {
  const args = ["-u", DB_USER, "-N", "-B"]
  if (DB_PASS) args.push(`-p${DB_PASS}`)
  if (DB_HOST === "127.0.0.1") args.push("-h", DB_HOST, "-P", DB_PORT, "--protocol=tcp")
  if (database) args.push(database)
  return args
}

/** Run SQL and return the rows as arrays of strings. */
export function sql(query: string): string[][] {
  const r = spawnSync("mysql", [...mysqlArgs(DB_NAME), "-e", query], { encoding: "utf8" })
  if (r.status !== 0) throw new Error(`SQL failed: ${r.stderr}\n${query}`)
  return r.stdout
    .split("\n")
    .filter((l) => l !== "")
    .map((l) => l.split("\t"))
}

export function one(query: string): string | undefined {
  return sql(query)[0]?.[0]
}

/** Quote a synthetic test value for SQL. Test data only, never user input. */
export function q(v: string | number | null): string {
  if (v === null) return "NULL"
  if (typeof v === "number") return String(v)
  return `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`
}

const TABLES = [
  "payment_events", "audit_log", "magic_links", "auth_tokens", "invoice_items", "invoices",
  "ticket_replies", "tickets", "work_images", "work", "files",
  "proposal_items", "proposals", "tasks", "projects", "posts", "users", "clients",
]

/** Empty every table the tests touch. */
export function resetDb(): void {
  sql(`SET FOREIGN_KEY_CHECKS = 0; ${TABLES.map((t) => `TRUNCATE TABLE ${t};`).join(" ")} SET FOREIGN_KEY_CHECKS = 1;`)
}

export type ApiResult<T = Record<string, unknown>> = { status: number; json: T; headers: Headers }

export async function api<T = Record<string, unknown>>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string; headers?: Record<string, string>; raw?: string } = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...opts.headers }
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`
  const res = await fetch(`${BASE}/${path}`, {
    method: opts.method ?? (opts.body !== undefined || opts.raw !== undefined ? "POST" : "GET"),
    headers,
    body: opts.raw ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    redirect: "manual",
  })
  const text = await res.text()
  let json: unknown = {}
  try { json = text ? JSON.parse(text) : {} } catch { json = { _raw: text } }
  return { status: res.status, json: json as T, headers: res.headers }
}

export function passwordHash(password: string): string {
  const r = spawnSync("php", ["-r", "echo password_hash($argv[1], PASSWORD_BCRYPT);", "--", password], { encoding: "utf8" })
  if (r.status !== 0) throw new Error(r.stderr)
  return r.stdout
}

export const PASSWORD = "Synthetic-Passw0rd!"
let hashCache: string | undefined

export function createUser(opts: {
  email: string
  role: string
  clientId?: number | null
  totpSecret?: string | null
}): number {
  hashCache ??= passwordHash(PASSWORD)
  sql(
    `INSERT INTO users (name, email, password_hash, role, client_id, totp_secret, totp_enabled) VALUES (` +
      `${q(opts.email.split("@")[0])}, ${q(opts.email)}, ${q(hashCache)}, ${q(opts.role)}, ` +
      `${q(opts.clientId ?? null)}, ${q(opts.totpSecret ?? null)}, ${opts.totpSecret ? 1 : 0})`,
  )
  return Number(one(`SELECT id FROM users WHERE email = ${q(opts.email)}`))
}

export async function login(email: string, code?: string): Promise<string> {
  const r = await api<{ token?: string; error?: string }>("auth.php?action=login", {
    body: { email, password: PASSWORD, ...(code ? { code } : {}) },
  })
  if (!r.json.token) throw new Error(`login failed for ${email}: ${r.status} ${JSON.stringify(r.json)}`)
  return r.json.token
}

export function createClient(company: string, email = `${company.toLowerCase().replace(/\W/g, "")}@example.test`): number {
  sql(`INSERT INTO clients (company, email) VALUES (${q(company)}, ${q(email)})`)
  return Number(one(`SELECT MAX(id) FROM clients`))
}

export function createInvoice(clientId: number, items: Array<[number, number]>, vatRate = 0, currency = "GBP"): number {
  sql(`INSERT INTO invoices (client_id, status, currency, vat_rate, issued_at) VALUES (${clientId}, 'sent', ${q(currency)}, ${vatRate}, CURRENT_DATE)`)
  const id = Number(one(`SELECT MAX(id) FROM invoices`))
  for (const [qty, unit] of items) {
    sql(`INSERT INTO invoice_items (invoice_id, description, qty, unit_price) VALUES (${id}, 'Synthetic line', ${qty}, ${unit})`)
  }
  return id
}

/** A Stripe-style signature header for a payload, using the synthetic secret. */
export function stripeSignature(payload: string, at = Math.floor(Date.now() / 1000)): string {
  const v1 = crypto.createHmac("sha256", WEBHOOK_SECRET).update(`${at}.${payload}`).digest("hex")
  return `t=${at},v1=${v1}`
}

export function providerRequests(): Array<{ path: string; body: string }> {
  if (!fs.existsSync(PROVIDER_LOG)) return []
  return fs.readFileSync(PROVIDER_LOG, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
}

export function clearProviderRequests(): void {
  fs.rmSync(PROVIDER_LOG, { force: true })
}

/** RFC 6238 TOTP, matching gk_totp_at in server/auth.php. */
export function totp(secretB32: string, at = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  let bits = ""
  for (const c of secretB32.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(c).toString(2).padStart(5, "0")
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)))
  const h = crypto.createHmac("sha1", Buffer.from(bytes)).update(counter).digest()
  const o = h[h.length - 1] & 0xf
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]
  return String(n % 1_000_000).padStart(6, "0")
}
