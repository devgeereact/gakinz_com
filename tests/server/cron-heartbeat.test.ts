/**
 * V1 finish line item 9: scheduled work is either running or visibly switched off.
 * The host has no GAkinz cron entry (K-145), so invoice reminders, retainer billing, the weekly digest, uptime
 * checks and pruning do not run. Every cron.php run now leaves a `cron_run` audit row (the heartbeat), and
 * today.php tells the owner roles whether one has been seen in the last 36 hours and what is off if not.
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { WORK_DIR } from "./env"
import { api, createUser, login, one, resetDb, sql } from "./helpers"

type Jobs = { last_run: string | null; stale: boolean; off: string[] }
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
  it("says the jobs are off, and which, when no run has ever been seen", async () => {
    const r = await api<Today>("today.php", { token: owner })
    expect(r.status).toBe(200)
    expect(r.json.scheduled_jobs?.stale).toBe(true)
    expect(r.json.scheduled_jobs?.last_run).toBeNull()
    expect(r.json.scheduled_jobs?.off).toEqual(
      expect.arrayContaining(["Overdue-invoice reminders", "Retainer billing", "The weekly digest", "Uptime checks"]),
    )
  })

  it("says nothing is off after a recent run", async () => {
    runCron("prune")
    const j = (await api<Today>("today.php", { token: owner })).json.scheduled_jobs!
    expect(j.stale).toBe(false)
    expect(j.off).toEqual([])
    expect(j.last_run).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
  })

  it("goes stale again once the last run is more than 36 hours old", async () => {
    runCron("prune")
    sql("UPDATE audit_log SET created_at = NOW() - INTERVAL 40 HOUR WHERE action = 'cron_run'")
    const j = (await api<Today>("today.php", { token: owner })).json.scheduled_jobs!
    expect(j.stale).toBe(true)
    expect(j.last_run).not.toBeNull()
  })

  it("is shown to the owner roles only, not to an editor", async () => {
    createUser({ email: "editor@example.test", role: "editor" })
    const editor = await login("editor@example.test")
    const r = await api<Today>("today.php", { token: editor })
    expect(r.status).toBe(200)
    expect(r.json.scheduled_jobs).toBeUndefined()
  })
})
