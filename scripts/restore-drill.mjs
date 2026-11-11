// restore-drill.mjs: restores a database dump into a THROWAWAY local database and checks it. This is the
// repeatable form of the restore test that closes K-010 (docs/OPERATIONS.md section 10).
//
//   pnpm run drill:restore                       # newest dump in ~/Backups/projects/gakinz_com/local-state
//   pnpm run drill:restore /path/to/dump.sql.gz [--keep]
//
// Safe by construction: the target database name must end in _test and the host must be local; the dump is only
// read; row VALUES are never printed (counts and table names only); the database is dropped afterwards unless
// --keep. Connection settings are the same GK_TEST_DB_* variables the server tests use
// (GK_TEST_DB_HOST, GK_TEST_DB_PORT, GK_TEST_DB_USER, GK_TEST_DB_PASS). The result block it prints is what goes
// into docs/OPERATIONS.md section 10.
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import zlib from "node:zlib"

/** Table names created by schema.sql (the tables the application expects). */
export function schemaTables(sql) {
  return [...sql.matchAll(/^CREATE TABLE IF NOT EXISTS `?(\w+)`?/gim)].map((m) => m[1])
}

/** The lines of a dump header that identify what produced it: database, server engine and version. */
export function dumpFacts(head) {
  const db = /^-- Host: .*?\s+Database: (\S+)/m.exec(head)?.[1] ?? null
  const server = /^-- Server version\s+(.+)$/m.exec(head)?.[1]?.trim() ?? null
  const tool = /^-- (MariaDB|MySQL) dump (\S+)/m.exec(head)
  return { database: db, serverVersion: server, engine: tool?.[1] ?? null }
}

/** Foreign-key-style checks: [label, SQL that returns the number of rows pointing at a missing parent]. */
export const ORPHAN_CHECKS = [
  ["invoices without a client", "SELECT COUNT(*) FROM invoices i LEFT JOIN clients c ON c.id = i.client_id WHERE i.client_id IS NOT NULL AND c.id IS NULL"],
  ["invoice lines without an invoice", "SELECT COUNT(*) FROM invoice_items x LEFT JOIN invoices i ON i.id = x.invoice_id WHERE i.id IS NULL"],
  ["projects without a client", "SELECT COUNT(*) FROM projects p LEFT JOIN clients c ON c.id = p.client_id WHERE p.client_id IS NOT NULL AND c.id IS NULL"],
  ["quote lines without a quote", "SELECT COUNT(*) FROM proposal_items x LEFT JOIN proposals p ON p.id = x.proposal_id WHERE p.id IS NULL"],
  ["tickets without a client", "SELECT COUNT(*) FROM tickets t LEFT JOIN clients c ON c.id = t.client_id WHERE t.client_id IS NOT NULL AND c.id IS NULL"],
  ["files whose client is missing", "SELECT COUNT(*) FROM files f LEFT JOIN clients c ON c.id = f.client_id WHERE f.client_id IS NOT NULL AND c.id IS NULL"],
  ["client logins linked to a missing client", "SELECT COUNT(*) FROM users u LEFT JOIN clients c ON c.id = u.client_id WHERE u.client_id IS NOT NULL AND c.id IS NULL"],
]

function mysqlArgs(db) {
  const a = ["-h", process.env.GK_TEST_DB_HOST ?? "localhost", "-P", process.env.GK_TEST_DB_PORT ?? "3306", "-u", process.env.GK_TEST_DB_USER ?? os.userInfo().username]
  if (db) a.push(db)
  return a
}

/** The password goes in MYSQL_PWD, not on the command line, where `ps` would show it to other local users. */
function mysql(db, query, input) {
  const args = [...mysqlArgs(db), ...(query ? ["-N", "-B", "-e", query] : [])]
  const env = process.env.GK_TEST_DB_PASS ? { ...process.env, MYSQL_PWD: process.env.GK_TEST_DB_PASS } : process.env
  const r = spawnSync("mysql", args, { encoding: "utf8", input, env, maxBuffer: 256 * 1024 * 1024 })
  if (r.error) return { status: 127, stdout: "", stderr: `could not run the mysql client: ${r.error.message}` }
  return { ...r, stdout: r.stdout ?? "", stderr: r.stderr ?? "" }
}

/**
 * Statements in a dump that would escape the throwaway database: a USE, or a CREATE/DROP of a database. An ordinary
 * `mysqldump` of one database has none; one taken with --databases or --add-drop-database does, and loading it would
 * act on the database it names (possibly a real local one) instead of the _test target. Returns the offending lines.
 */
/** mysqldump / mariadb-dump end a complete dump with "-- Dump completed on ..."; a truncated one lacks it. */
export function dumpCompleted(sql) {
  return /^-- Dump completed on /m.test(sql.slice(-400))
}

export function unsafeStatements(sql) {
  return sql.split("\n").filter((l) => /^\s*(USE\s|CREATE\s+(DATABASE|SCHEMA)\b|DROP\s+(DATABASE|SCHEMA)\b)/i.test(l)).map((l) => l.trim().slice(0, 80))
}

function newestDump() {
  const dir = path.join(os.homedir(), "Backups/projects/gakinz_com/local-state")
  if (!fs.existsSync(dir)) return null
  const files = fs.readdirSync(dir).filter((f) => /\.sql(\.gz)?$/.test(f)).map((f) => ({ f: path.join(dir, f), t: fs.statSync(path.join(dir, f)).mtimeMs }))
  return files.sort((a, b) => b.t - a.t)[0]?.f ?? null
}

function main() {
  const argv = process.argv.slice(2)
  const keep = argv.includes("--keep")
  const dumpPath = argv.find((a) => !a.startsWith("--")) ?? newestDump()
  if (!dumpPath || !fs.existsSync(dumpPath)) {
    console.error("No dump found. Pass the path to a .sql or .sql.gz file.")
    process.exit(2)
  }
  const host = process.env.GK_TEST_DB_HOST ?? "localhost"
  const db = process.env.GK_RESTORE_DB ?? "gakinz_restore_drill_test"
  if (!["localhost", "127.0.0.1"].includes(host) || !/_test$/.test(db)) {
    console.error(`Refusing: the target must be a local database whose name ends in _test (got ${host} / ${db}).`)
    process.exit(2)
  }

  const raw = fs.readFileSync(dumpPath)
  const sqlText = (dumpPath.endsWith(".gz") ? zlib.gunzipSync(raw) : raw).toString("utf8")
  const facts = dumpFacts(sqlText.slice(0, 2000))
  const ageDays = Math.floor((Date.now() - fs.statSync(dumpPath).mtimeMs) / 86400000)

  if (!sqlText.trim() || !dumpCompleted(sqlText)) {
    console.error("FAIL: the dump is empty or truncated (it does not end with '-- Dump completed on ...'). Nothing was restored, so this is not a valid backup.")
    process.exit(1)
  }
  const bad = unsafeStatements(sqlText)
  if (bad.length) {
    console.error(`Refusing: the dump contains statements that act on a named database (${bad.slice(0, 3).join(" | ")}). Take the dump of one database without --databases or --add-drop-database.`)
    process.exit(2)
  }

  const made = mysql(null, `DROP DATABASE IF EXISTS \`${db}\`; CREATE DATABASE \`${db}\` CHARACTER SET utf8mb4;`)
  if (made.status !== 0) {
    console.error(`Could not create the throwaway database: ${made.stderr.trim().split("\n")[0]}`)
    process.exit(2)
  }
  // The dump names its own database only in a comment, and has no USE line, so it loads into the target.
  const started = Date.now()
  const load = mysql(db, null, sqlText)
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  if (load.status !== 0) {
    console.error(`RESTORE FAILED: ${load.stderr.trim().split("\n")[0]}`)
    mysql(null, `DROP DATABASE IF EXISTS \`${db}\`;`)
    process.exit(1)
  }

  const tables = mysql(db, "SHOW TABLES").stdout.split("\n").filter(Boolean)
  const counts = {}
  for (const t of tables) counts[t] = Number(mysql(db, `SELECT COUNT(*) FROM \`${t}\``).stdout.trim())
  const here = path.dirname(new URL(import.meta.url).pathname)
  const expected = schemaTables(fs.readFileSync(path.join(here, "../server/schema.sql"), "utf8"))
  const missing = expected.filter((t) => !tables.includes(t))
  const extra = tables.filter((t) => !expected.includes(t))
  const orphans = ORPHAN_CHECKS.map(([label, q]) => {
    const r = mysql(db, q)
    return [label, r.status === 0 ? Number(r.stdout.trim()) : "n/a (table or column not in this dump)"]
  })

  if (tables.length === 0) {
    console.error("FAIL: the dump loaded but created no tables.")
    mysql(null, `DROP DATABASE IF EXISTS \`${db}\`;`)
    process.exit(1)
  }
  const rows = Object.values(counts).reduce((a, b) => a + b, 0)
  console.log("RESTORE DRILL RESULT")
  console.log(`  dump:            ${path.basename(dumpPath)} (${(raw.length / 1024).toFixed(1)} KB, ${ageDays} day(s) old)`)
  console.log(`  produced by:     ${facts.engine ?? "unknown"} dump; source database ${facts.database ?? "unknown"}; server ${facts.serverVersion ?? "unknown"}`)
  console.log(`  restored into:   ${host} / ${db} in ${seconds}s`)
  console.log(`  tables restored: ${tables.length} of ${expected.length} in schema.sql; ${rows} rows in total`)
  console.log(`  missing tables:  ${missing.length ? missing.join(", ") : "none"}${missing.length ? "  (created by schema changes newer than the dump)" : ""}`)
  console.log(`  extra tables:    ${extra.length ? extra.join(", ") : "none"}`)
  console.log(`  dump completed:  yes (ends with the dump-completed marker)`)
  console.log("  rows per table (non-empty only):")
  for (const [t, n] of Object.entries(counts).filter(([, n]) => n > 0)) console.log(`    ${t}: ${n}`)
  console.log("  orphan checks (0 is good):")
  for (const [label, n] of orphans) console.log(`    ${label}: ${n}`)
  console.log("  NOT CHECKED: uploaded files (the dump holds only database rows), file permissions, the live host's own copy.")

  if (!keep) mysql(null, `DROP DATABASE IF EXISTS \`${db}\`;`)
  const broken = orphans.some(([, n]) => typeof n === "number" && n > 0)
  process.exit(broken ? 1 : 0)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
