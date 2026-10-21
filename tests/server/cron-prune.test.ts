/**
 * cron.php on the command line (K-061) and the prune job (K-062): expired
 * sign-in credentials go, live ones and business records stay.
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { WORK_DIR } from "./env"
import { api, createUser, login, one, resetDb, sql } from "./helpers"

function cron(job: string) {
  const r = spawnSync("php", [path.join(WORK_DIR, "cron.php"), `job=${job}`], { encoding: "utf8" })
  return { status: r.status, json: JSON.parse(r.stdout || "{}") as { ran?: Record<string, unknown>; error?: string } }
}

describe("cron prune", () => {
  beforeEach(() => resetDb())

  it("runs from the command line without a key, and refuses the web without one", async () => {
    expect(cron("prune").json.ran).toHaveProperty("prune")
    expect((await api("cron.php?job=prune")).status).toBe(403)
  })

  it("deletes credentials a day past expiry and keeps everything else", async () => {
    const id = createUser({ email: "owner@example.test", role: "super_admin" })
    const live = await login("owner@example.test")
    sql(
      `INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (${id}, 'expired-session', NOW() - INTERVAL 2 DAY), (${id}, 'just-expired', NOW() - INTERVAL 1 HOUR);` +
        `INSERT INTO magic_links (user_id, token, expires_at) VALUES (${id}, 'old-magic', NOW() - INTERVAL 3 DAY);` +
        `INSERT INTO password_resets (user_id, token, expires_at) VALUES (${id}, 'old-reset', NOW() - INTERVAL 3 DAY), (${id}, 'live-reset', NOW() + INTERVAL 1 HOUR);`,
    )

    const r = cron("prune")
    expect(r.json.ran?.prune).toEqual({ auth_tokens: 1, magic_links: 1, password_resets: 1 })

    expect(one("SELECT COUNT(*) FROM auth_tokens WHERE token = 'expired-session'")).toBe("0")
    expect(one("SELECT COUNT(*) FROM auth_tokens WHERE token = 'just-expired'")).toBe("1")
    expect(one("SELECT COUNT(*) FROM password_resets WHERE token = 'live-reset'")).toBe("1")
    expect(one(`SELECT COUNT(*) FROM users WHERE id = ${id}`)).toBe("1")
    expect((await api("auth.php?action=me", { token: live })).status).toBe(200)
  })
})
