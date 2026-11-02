/**
 * cron.php billing (go-live audit 2026-11-01, deferred unit): two overlapping runs (the
 * scheduled cron and a web call) must not both bill a retainer client. The job takes a
 * named database lock and a run that cannot get it skips.
 */
import { spawn, spawnSync } from "node:child_process"
import path from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { WORK_DIR } from "./env"
import { mysqlArgs, one, resetDb, sql } from "./helpers"

function cron(job: string) {
  const r = spawnSync("php", [path.join(WORK_DIR, "cron.php"), `job=${job}`], { encoding: "utf8" })
  return JSON.parse(r.stdout || "{}") as { ran?: { billing?: Record<string, unknown> } }
}

describe("cron billing lock", () => {
  beforeEach(() => resetDb())

  it("bills a retainer once, and a second run the same month adds nothing", () => {
    sql("INSERT INTO clients (company, email, tag, retainer_amount) VALUES ('Retained Ltd', 'r@example.test', 'retainer', 120)")
    expect(cron("billing").ran?.billing).toEqual({ created: 1 })
    expect(cron("billing").ran?.billing).toEqual({ created: 0 })
    expect(one("SELECT COUNT(*) FROM invoices")).toBe("1")
  })

  it("skips while another run holds the lock, and bills nothing", async () => {
    sql("INSERT INTO clients (company, email, tag, retainer_amount) VALUES ('Retained Ltd', 'r@example.test', 'retainer', 120)")
    const holder = spawn("mysql", [...mysqlArgs(), "-N", "-e", "SELECT GET_LOCK('gk_cron_billing', 0); SELECT SLEEP(4);"])
    await new Promise((r) => setTimeout(r, 800))
    try {
      expect(cron("billing").ran?.billing).toEqual({ skipped: "another billing run is in progress" })
      expect(one("SELECT COUNT(*) FROM invoices")).toBe("0")
    } finally {
      holder.kill()
    }
  })
})
