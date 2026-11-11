/**
 * V1 finish line item 9: scheduled work is either running or visibly switched off.
 * The host has no GAkinz cron entry (K-145), so invoice reminders, retainer billing, the weekly digest, uptime
 * checks and pruning do not run. Every cron.php run now leaves a `cron_run` audit row (the heartbeat) naming the job,
 * and today.php tells the owner roles which jobs have not been seen in the last 36 hours. `all` counts for every job;
 * a run of one job counts for that job only, so a prune-only line cannot make reminders and billing look alive.
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { WORK_DIR } from "./env"
import { api, createUser, login, one, resetDb, sql } from "./helpers"

type Jobs = { last_run: string | null; stale: boolean; all_off: boolean; off: string[] }
type Today = { sections: Record<string, unknown>; scheduled_jobs?: Jobs }

const runCron = (job: string) => spawnSync("php", [path.join(WORK_DIR, "cron.php"), `job=${job}`], { encoding: "utf8" })

let owner: string
beforeEach(async () => {
  resetDb()
  createUser({ email: "owner@example.test", role: "super_admin" })
  owner = await login("owner@example.test")
})

describe("cron heartbeat", () => {
  it("records one cron_run row per run, naming the job", () => {
    expect(runCron("prune").status).toBe(0)
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'cron_run'")).toBe("1")
    expect(one("SELECT detail FROM audit_log WHERE action = 'cron_run'")).toBe("prune")
  })

  it("is not recorded by a read-only retention report, which runs no job", () => {
    runCron("retention_report")
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'cron_run'")).toBe("0")
  })
})

describe("today.php scheduled_jobs", () => {
  const jobs = async (token = owner) => (await api<Today>("today.php", { token })).json.scheduled_jobs

  it("says every job is off, and names them, when no run has ever been seen", async () => {
    const j = (await jobs())!
    expect(j.stale).toBe(true)
    expect(j.all_off).toBe(true)
    expect(j.last_run).toBeNull()
    expect(j.off).toEqual(["Overdue-invoice reminders", "Retainer billing", "The weekly digest", "Uptime checks", "Clean-up of expired sign-in records"])
  })

  it("says nothing is off after a recent run of all", async () => {
    runCron("all")
    const j = (await jobs())!
    expect(j).toMatchObject({ stale: false, all_off: false, off: [] })
    expect(j.last_run).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
  })

  it("a prune-only line clears only the prune job: reminders and billing still show as off", async () => {
    runCron("prune")
    const j = (await jobs())!
    expect(j.stale).toBe(true)
    expect(j.all_off).toBe(false)
    expect(j.off).toEqual(["Overdue-invoice reminders", "Retainer billing", "The weekly digest", "Uptime checks"])
  })

  it("goes stale again once the last run is more than 36 hours old", async () => {
    runCron("all")
    sql("UPDATE audit_log SET created_at = NOW() - INTERVAL 40 HOUR WHERE action = 'cron_run'")
    const j = (await jobs())!
    expect(j.stale).toBe(true)
    expect(j.all_off).toBe(true)
    expect(j.last_run).not.toBeNull()
  })

  it("writes at most one heartbeat per job per ten minutes, so a every-minute line cannot flood the log", () => {
    runCron("prune")
    runCron("prune")
    runCron("prune")
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'cron_run'")).toBe("1")
  })

  it("is shown to the owner roles only, not to an editor", async () => {
    createUser({ email: "editor@example.test", role: "editor" })
    const editor = await login("editor@example.test")
    const r = await api<Today>("today.php", { token: editor })
    expect(r.status).toBe(200)
    expect(r.json.scheduled_jobs).toBeUndefined()
  })
})
