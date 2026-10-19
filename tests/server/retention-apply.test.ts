/**
 * cron.php job=retention_apply, the retention executor (_erasure.php,
 * docs/PRIVACY-READINESS.md section 6, K-062). It may delete only two things,
 * enquiries that never became a client and soft-deleted files, and only when
 * the rule's period is set AND $RETENTION_APPLY is true AND --apply is passed.
 * Every other combination must change nothing and only list what would go.
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { WORK_DIR } from "./env"
import { api, createClient, one, q, resetDb, sql } from "./helpers"

const OVERRIDES = path.join(WORK_DIR, "overrides.json")
const UPLOADS = path.join(WORK_DIR, "uploads")
const setOverrides = (values: Record<string, unknown>) => fs.writeFileSync(OVERRIDES, JSON.stringify(values))

function cron(...args: string[]) {
  const r = spawnSync("php", [path.join(WORK_DIR, "cron.php"), "job=retention_apply", ...args], { encoding: "utf8" })
  return { status: r.status, out: r.stdout, err: r.stderr }
}

/** Every table either rule could reach, plus the ones it must never reach. */
function snapshot(): string {
  const tables = ["enquiries", "bookings", "booking_events", "files", "audit_log", "clients", "projects", "project_assets", "invoices", "tickets", "contracts", "users"]
  return tables.map((t) => `${t}=${one(`SELECT COUNT(*) FROM ${t}`)}:${sql(`CHECKSUM TABLE ${t}`)[0][1]}`).join(" ")
}
const diskFiles = () => (fs.existsSync(UPLOADS) ? fs.readdirSync(UPLOADS).sort() : [])

function enquiry(name: string, email: string, status: string, ageMonths: number): number {
  sql(`INSERT INTO enquiries (name, email, message, status, created_at, updated_at)
       VALUES (${q(name)}, ${q(email)}, 'm', ${q(status)}, NOW() - INTERVAL ${ageMonths} MONTH, NOW() - INTERVAL ${ageMonths} MONTH)`)
  return Number(one("SELECT MAX(id) FROM enquiries"))
}
function file(stored: string, deletedDaysAgo: number | null, onDisk = true): number {
  sql(`INSERT INTO files (name, \`stored\`, deleted_at) VALUES ('doc.pdf', ${q(stored)}, ${deletedDaysAgo === null ? "NULL" : `NOW() - INTERVAL ${deletedDaysAgo} DAY`})`)
  if (onDisk) fs.writeFileSync(path.join(UPLOADS, stored), "synthetic")
  return Number(one("SELECT MAX(id) FROM files"))
}

describe("retention_apply", () => {
  let ids: Record<string, number>

  beforeEach(() => {
    resetDb()
    fs.rmSync(UPLOADS, { recursive: true, force: true })
    fs.mkdirSync(UPLOADS, { recursive: true })
    // Synthetic config: enquiries 12 months, deleted files 30 days, $RETENTION_APPLY false.
    const cid = createClient("Client Ltd", "client@example.test")
    sql(`INSERT INTO projects (client_id, name) VALUES (${cid}, 'Client site')`)
    const projectId = Number(one("SELECT MAX(id) FROM projects"))
    ids = {
      oldProspect: enquiry("Old Prospect", "old@example.test", "lost", 18),
      oldWithCall: enquiry("Old Caller", "caller@example.test", "contacted", 18),
      recent: enquiry("New Prospect", "new@example.test", "new", 3),
      won: enquiry("Won Person", "won@example.test", "won", 30),
      converted: enquiry("Converted Person", "converted@example.test", "proposal", 30),
      clientAddress: enquiry("Client Person", "client@example.test", "lost", 30),
      recentCall: enquiry("Recent Caller", "recentcall@example.test", "lost", 30),
      oldFile: file("aa11.pdf", 40),
      oldFileGone: file("bb22.pdf", 40, false),
      newFile: file("cc33.pdf", 10),
      liveFile: file("dd44.pdf", null),
      assetFile: file("ee55.pdf", 60),
      unsafeFile: file("../escape.pdf", 60, false),
    }
    sql(`INSERT INTO clients (company, source_lead_id) VALUES ('Converted Ltd', ${ids.converted})`)
    sql(`INSERT INTO bookings (enquiry_id, starts_at, timezone, created_at, updated_at) VALUES (${ids.oldWithCall}, NOW() - INTERVAL 17 MONTH, 'Europe/London', NOW() - INTERVAL 17 MONTH, NOW() - INTERVAL 17 MONTH)`)
    const oldBooking = Number(one("SELECT MAX(id) FROM bookings"))
    sql(`INSERT INTO booking_events (booking_id, kind, to_status, notify_to) VALUES (${oldBooking}, 'created', 'requested', 'caller@example.test')`)
    sql(`INSERT INTO bookings (enquiry_id, starts_at, timezone) VALUES (${ids.recentCall}, NOW() - INTERVAL 1 MONTH, 'Europe/London')`)
    sql(`INSERT INTO project_assets (project_id, label, file_id) VALUES (${projectId}, 'Logo', ${ids.assetFile})`)
    sql(`INSERT INTO audit_log (action, detail, ip) VALUES ('enquiry_submit', 'old@example.test', '198.51.100.1'), ('enquiry_submit', 'new@example.test', '198.51.100.2')`)
  })

  afterEach(() => {
    fs.rmSync(OVERRIDES, { force: true })
    fs.rmSync(UPLOADS, { recursive: true, force: true })
  })

  it("is a dry run by default: lists exactly the eligible ids, says why the rest are kept, and changes nothing", () => {
    const before = snapshot()
    const disk = diskFiles()
    const r = cron()
    expect(r.status).toBe(0)
    expect(r.out).toMatch(/^Retention apply: DRY RUN\. Nothing was deleted\./)
    expect(r.out).toContain(`Enquiries that did not become a client, older than 12 months: would delete 2 (#${ids.oldProspect}, #${ids.oldWithCall}); kept 2 (1 known_address, 1 recent).`)
    expect(r.out).toContain(`Soft-deleted files, older than 30 days: would delete 2 (#${ids.oldFile}, #${ids.oldFileGone}); kept 2 (1 linked_asset, 1 unsafe_name).`)
    expect(r.out).not.toMatch(/@example\.test|Prospect|\.pdf/)
    expect(snapshot()).toBe(before)
    expect(diskFiles()).toEqual(disk)
  })

  it("changes nothing with --dry-run, with --apply while $RETENTION_APPLY is false, or with $RETENTION_APPLY true but no --apply", () => {
    const before = snapshot()
    const disk = diskFiles()
    expect(cron("--dry-run").out).toMatch(/^Retention apply: DRY RUN\. Nothing was deleted\./)
    const refused = cron("--apply")
    expect(refused.status).toBe(0)
    expect(refused.out).toMatch(/^Retention apply: DRY RUN\. --apply was passed, but \$RETENTION_APPLY is not true/)
    for (const notTrue of [1, "true", "yes", null]) {
      setOverrides({ RETENTION_APPLY: notTrue })
      expect(cron("--apply").out).toMatch(/^Retention apply: DRY RUN\. --apply was passed/)
    }
    setOverrides({ RETENTION_APPLY: true })
    expect(cron().out).toMatch(/^Retention apply: DRY RUN\. Nothing was deleted\./)
    expect(cron("--dry-run").out).toMatch(/^Retention apply: DRY RUN\. Nothing was deleted\./)
    expect(snapshot()).toBe(before)
    expect(diskFiles()).toEqual(disk)
  })

  it("does nothing for a rule whose period is not set or invalid, even with apply on", () => {
    setOverrides({ RETENTION_APPLY: true, RETENTION_ENQUIRY_MONTHS: null, RETENTION_DELETED_FILE_DAYS: "thirty" })
    const before = snapshot()
    const disk = diskFiles()
    const r = cron("--apply")
    expect(r.status).toBe(0)
    expect(r.out).toContain("Enquiries that did not become a client: period not set ($RETENTION_ENQUIRY_MONTHS). Nothing happens.")
    expect(r.out).toContain("Soft-deleted files: invalid period in $RETENTION_DELETED_FILE_DAYS. Nothing happens.")
    // The applying run is audited, with counts only; nothing else changed.
    expect(sql("SELECT user_id IS NULL, detail FROM audit_log WHERE action = 'retention_apply'")).toEqual([
      ["1", JSON.stringify({ enquiries: "period_not_set", deleted_files: "invalid_period" })],
    ])
    sql("DELETE FROM audit_log WHERE action = 'retention_apply'")
    expect(snapshot()).toBe(before)
    expect(diskFiles()).toEqual(disk)
  })

  it("refuses unknown flags and both flags together, and refuses the web even with the cron key", async () => {
    setOverrides({ RETENTION_APPLY: true, CRON_KEY: "synthetic-cron-key-only" })
    const before = snapshot()
    expect(cron("--aply").status).toBe(2)
    expect(cron("--apply", "--dry-run").status).toBe(2)
    const web = await api<{ error?: string }>("cron.php?key=synthetic-cron-key-only&job=retention_apply&apply=1")
    expect(web.status).toBe(400)
    expect(web.json.error).toBe("retention_apply runs from the command line only.")
    expect((await api("cron.php?job=retention_apply")).status).toBe(403)
    // `all` never includes it, even with every gate but the flag open.
    const all = spawnSync("php", [path.join(WORK_DIR, "cron.php"), "job=all", "--apply"], { encoding: "utf8" })
    expect(JSON.parse(all.stdout).ran).not.toHaveProperty("retention_apply")
    expect(snapshot()).toBe(before)
  })

  it("with every gate open deletes exactly the eligible enquiries and files, and audits the run with counts only", () => {
    setOverrides({ RETENTION_APPLY: true })
    const r = cron("--apply")
    expect(r.status).toBe(0)
    expect(r.out).toMatch(/^Retention apply: APPLIED\./)
    expect(r.out).toContain(`older than 12 months: deleted 2 (#${ids.oldProspect}, #${ids.oldWithCall}); kept 2`)
    expect(r.out).toContain(`older than 30 days: deleted 2 (#${ids.oldFile}, #${ids.oldFileGone}), of which 1 had no file on disk; kept 2`)

    const left = sql("SELECT id FROM enquiries ORDER BY id").map((x) => Number(x[0]))
    expect(left).toEqual([ids.recent, ids.won, ids.converted, ids.clientAddress, ids.recentCall])
    expect(one(`SELECT COUNT(*) FROM bookings WHERE enquiry_id = ${ids.oldWithCall}`)).toBe("0")
    expect(one("SELECT COUNT(*) FROM booking_events")).toBe("0")
    expect(one(`SELECT COUNT(*) FROM bookings WHERE enquiry_id = ${ids.recentCall}`)).toBe("1")
    expect(sql("SELECT detail, IFNULL(ip, 'NULL') FROM audit_log WHERE action = 'enquiry_submit' ORDER BY id")).toEqual([
      ["[erased]", "NULL"], ["new@example.test", "198.51.100.2"],
    ])

    const files = sql("SELECT id FROM files ORDER BY id").map((x) => Number(x[0]))
    expect(files).toEqual([ids.newFile, ids.liveFile, ids.assetFile, ids.unsafeFile])
    expect(diskFiles()).toEqual(["cc33.pdf", "dd44.pdf", "ee55.pdf"])
    expect(one(`SELECT file_id FROM project_assets`)).toBe(String(ids.assetFile))
    expect(one("SELECT COUNT(*) FROM clients")).toBe("2")
    expect(one("SELECT COUNT(*) FROM projects")).toBe("1")

    const audit = sql("SELECT user_id IS NULL, detail FROM audit_log WHERE action = 'retention_apply'")
    expect(audit).toEqual([["1", JSON.stringify({ enquiries: { deleted: 2, kept: 2 }, deleted_files: { deleted: 2, kept: 2 } })]])
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'enquiry_erase'")).toBe("0")

    // A second applying run finds nothing more to delete.
    const again = cron("--apply")
    expect(again.out).toContain("older than 12 months: deleted 0; kept 2")
    expect(again.out).toContain("older than 30 days: deleted 0; kept 2")
  })

  it("leaves a directory or a symlink behind a stored name alone, and never follows it", () => {
    setOverrides({ RETENTION_APPLY: true })
    const outside = path.join(WORK_DIR, "outside-target.txt")
    fs.writeFileSync(outside, "must survive")
    fs.symlinkSync(outside, path.join(UPLOADS, "ff66.pdf"))
    fs.mkdirSync(path.join(UPLOADS, "gg77.pdf"))
    const link = file("ff66.pdf", 90, false)
    const dir = file("gg77.pdf", 90, false)
    const r = cron("--apply")
    expect(r.out).toContain("unsafe_path")
    expect(sql(`SELECT id FROM files WHERE id IN (${link}, ${dir}) ORDER BY id`).map((x) => Number(x[0]))).toEqual([link, dir])
    expect(fs.readFileSync(outside, "utf8")).toBe("must survive")
    expect(fs.lstatSync(path.join(UPLOADS, "ff66.pdf")).isSymbolicLink()).toBe(true)
    fs.rmSync(outside, { force: true })
  })
})
