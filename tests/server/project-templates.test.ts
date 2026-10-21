/**
 * Project templates (server/_templates.php, projects.php?action=templates and
 * the `template` key on projects.php?action=create). The properties under
 * test: each template creates exactly its tasks, asset items and measurement
 * rows on the new project, all in one transaction (a failure part way leaves
 * nothing behind), a table whose SQL step has not run is skipped and reported,
 * an unknown template creates nothing, and only staff can use any of it.
 * The client checklist is added only on include_client_checklist: true, and a
 * projects.php uploaded without _templates.php keeps its other routes.
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { WORK_DIR } from "./env"
import { api, createClient, createUser, login, one, q, resetDb, sql } from "./helpers"

type Template = {
  key: string
  name: string
  summary: string
  tasks: { title: string; offset_days: number }[]
  assets: { label: string; note: string }[]
  brief: { deliverables: string; exclusions: string; measurements: { label: string; target: string; method: string }[] }
}
type Created = {
  id: number
  template?: string
  created?: { tasks: number; assets: number; measurements: number }
  skipped?: { table: string; note: string }[]
  error?: string
}

const KEYS = ["business_website", "ecommerce", "website_care", "it_support", "it_consultancy"]
const BANNED = /leverage|empower|showcase|transformative|impactful|cutting-edge|revolutionise|synergy|groundbreaking|utilise/i

const count = (table: string, projectId: number, extra = "") =>
  Number(one(`SELECT COUNT(*) FROM ${table} WHERE project_id = ${projectId}${extra}`))
const projectCount = () => Number(one(`SELECT COUNT(*) FROM projects`))
/** Today plus some days, as the PHP the server runs on sees it (its own time zone). */
const isoDaysFromToday = (days: number) => {
  const code = "echo (new DateTimeImmutable('today'))->modify('+' . (int)$argv[1] . ' days')->format('Y-m-d');"
  const r = spawnSync("php", ["-r", code, "--", String(days)], { encoding: "utf8" })
  if (r.status !== 0) throw new Error(r.stderr)
  return r.stdout
}

describe("project templates", () => {
  let owner: string
  let employee: string
  let client: string
  let clientId: number
  let ownerId: number
  let templates: Template[]

  const create = (body: unknown, token = owner) => api<Created>("projects.php?action=create", { token, body })

  beforeEach(async () => {
    resetDb()
    clientId = createClient("Larkspur Bakery")
    ownerId = createUser({ email: "owner@example.test", role: "super_admin" })
    createUser({ email: "employee@example.test", role: "employee" })
    createUser({ email: "client@example.test", role: "client", clientId })
    owner = await login("owner@example.test")
    employee = await login("employee@example.test")
    client = await login("client@example.test")
    const r = await api<Template[]>("projects.php?action=templates", { token: owner })
    expect(r.status).toBe(200)
    templates = r.json
  })

  describe("the template list", () => {
    it("lists the five work types of the spec's table, in its order", () => {
      expect(templates.map((t) => t.key)).toEqual(KEYS)
      expect(templates.map((t) => t.name)).toEqual(["Business website", "Ecommerce", "Website care", "General IT support", "IT consultancy"])
    })

    it("keeps every row inside the limits of tasks, assets.php and briefs.php", () => {
      for (const t of templates) {
        expect(t.tasks.length).toBeGreaterThan(0)
        expect(t.assets.length).toBeGreaterThan(0)
        expect(t.brief.measurements.length).toBeGreaterThan(0)
        for (const task of t.tasks) {
          expect(task.title.length).toBeGreaterThan(0)
          expect(task.title.length).toBeLessThanOrEqual(300)
          expect(Number.isInteger(task.offset_days) && task.offset_days >= 0).toBe(true)
        }
        for (const a of t.assets) {
          expect(a.label.length).toBeLessThanOrEqual(160) // ASSET_LABEL_MAX
          expect(a.note.length).toBeLessThanOrEqual(1000) // ASSET_NOTE_MAX
        }
        for (const m of t.brief.measurements) {
          expect(m.label.length).toBeLessThanOrEqual(200) // MEASURE_LABEL_MAX
          expect(m.target.length).toBeLessThanOrEqual(500)
          expect(m.method.length).toBeLessThanOrEqual(1000)
        }
      }
    })

    it("leaves deliverables and exclusions empty and keeps the copy plain", () => {
      for (const t of templates) {
        expect(t.brief.deliverables).toBe("")
        expect(t.brief.exclusions).toBe("")
        const text = JSON.stringify(t)
        expect(text).not.toContain("—") // no em dash
        expect(text).not.toMatch(BANNED)
      }
    })

    it("is staff only: a client is refused and a missing token is refused", async () => {
      expect((await api("projects.php?action=templates", { token: client })).status).toBe(403)
      expect((await api("projects.php?action=templates")).status).toBe(401)
      expect((await api("projects.php?action=templates", { token: employee })).status).toBe(200)
    })
  })

  describe("creating from a template", () => {
    for (const key of KEYS) {
      it(`creates exactly the ${key} tasks, asset items and measurement rows`, async () => {
        const t = templates.find((x) => x.key === key)!
        const r = await create({ name: `Synthetic ${key}`, client_id: clientId, template: key, include_client_checklist: true })
        expect(r.status).toBe(201)
        expect(r.json.template).toBe(key)
        expect(r.json.created).toEqual({ tasks: t.tasks.length, assets: t.assets.length, measurements: t.brief.measurements.length })
        expect(r.json.skipped).toEqual([])
        const pid = r.json.id
        expect(one(`SELECT client_id FROM projects WHERE id = ${pid}`)).toBe(String(clientId))

        expect(count("tasks", pid, " AND status = 'todo'")).toBe(t.tasks.length)
        const firstTask = t.tasks[0]
        expect(one(`SELECT due_date FROM tasks WHERE project_id = ${pid} AND title = ${q(firstTask.title)}`)).toBe(
          isoDaysFromToday(firstTask.offset_days),
        )
        const lastTask = t.tasks[t.tasks.length - 1]
        expect(one(`SELECT due_date FROM tasks WHERE project_id = ${pid} AND title = ${q(lastTask.title)}`)).toBe(
          isoDaysFromToday(lastTask.offset_days),
        )

        expect(count("project_assets", pid, ` AND status = 'requested' AND requested_by = ${ownerId}`)).toBe(t.assets.length)
        expect(count("project_measurements", pid, " AND result = 'NOT TESTED' AND kind = 'technical'")).toBe(t.brief.measurements.length)
        // No brief row: deliverables and exclusions are agreed with each client.
        expect(count("project_briefs", pid)).toBe(0)
        expect(one(`SELECT detail FROM audit_log WHERE action = 'project_create' ORDER BY id DESC LIMIT 1`)).toContain(`template ${key}`)
      })
    }

    it("creates rows the asset and brief endpoints then serve, and the client sees only their own items", async () => {
      const r = await create({ name: "Bakery site", client_id: clientId, template: "business_website", include_client_checklist: true })
      const pid = r.json.id
      const assets = await api<{ label: string }[]>(`assets.php?project_id=${pid}`, { token: employee })
      expect(assets.status).toBe(200)
      expect(assets.json.map((a) => a.label)).toContain("Logo, as SVG or large PNG")
      const brief = await api<{ brief: unknown; measurements: { label: string; result: string }[] }>(`briefs.php?project_id=${pid}`, { token: owner })
      expect(brief.json.brief).toBeNull()
      expect(brief.json.measurements.map((m) => m.result)).toEqual(["NOT TESTED", "NOT TESTED", "NOT TESTED"])

      const otherClient = createClient("Thistle Garage")
      await create({ name: "Garage site", client_id: otherClient, template: "website_care", include_client_checklist: true })
      const mine = await api<{ project_id: number }[]>("assets.php?action=mine", { token: client })
      expect(mine.status).toBe(200)
      expect(mine.json.length).toBe(templates[0].assets.length)
      expect(new Set(mine.json.map((a) => a.project_id))).toEqual(new Set([pid]))
    })

    it("lets an employee create from a template, as without one", async () => {
      const r = await create({ name: "Support desk", template: "it_support" }, employee)
      expect(r.status).toBe(201)
      expect(count("tasks", r.json.id)).toBe(templates.find((t) => t.key === "it_support")!.tasks.length)
    })

    it("refuses a client, and creates nothing", async () => {
      const r = await create({ name: "Client try", template: "ecommerce" }, client)
      expect(r.status).toBe(403)
      expect(projectCount()).toBe(0)
      expect(Number(one(`SELECT COUNT(*) FROM tasks`))).toBe(0)
    })

    it("answers 400 to an unknown or malformed template and creates nothing", async () => {
      for (const template of ["wordpress_theme", "BUSINESS_WEBSITE", ["ecommerce"], 3, { key: "ecommerce" }]) {
        const r = await create({ name: "Mystery", template })
        expect(r.status).toBe(400)
        expect(r.json.error).toBe("Unknown project template.")
      }
      expect(projectCount()).toBe(0)
      expect(Number(one(`SELECT COUNT(*) FROM audit_log WHERE action = 'project_create'`))).toBe(0)
    })

    it("still needs a name, and checks it before the template", async () => {
      const r = await create({ name: "  ", template: "ecommerce" })
      expect(r.status).toBe(400)
      expect(r.json.error).toBe("A project name is required.")
      expect(projectCount()).toBe(0)
    })

    it("treats an empty or null template as none: a bare project, as before", async () => {
      for (const template of ["", null]) {
        const r = await create({ name: `Bare ${String(template)}`, template })
        expect(r.status).toBe(201)
        expect(r.json.created).toBeUndefined()
        expect(count("tasks", r.json.id)).toBe(0)
        expect(count("project_assets", r.json.id)).toBe(0)
      }
    })

    it("makes a separate project on a double submit, each with its own rows", async () => {
      const [a, b] = await Promise.all([
        create({ name: "Twice", template: "it_consultancy" }),
        create({ name: "Twice", template: "it_consultancy" }),
      ])
      expect(a.status).toBe(201)
      expect(b.status).toBe(201)
      expect(a.json.id).not.toBe(b.json.id)
      const t = templates.find((x) => x.key === "it_consultancy")!
      for (const pid of [a.json.id, b.json.id]) {
        expect(count("tasks", pid)).toBe(t.tasks.length)
        expect(count("project_measurements", pid)).toBe(t.brief.measurements.length)
      }
    })
  })

  describe("one transaction", () => {
    it("rolls the project, tasks and asset items back when a measurement row fails", async () => {
      sql(
        `CREATE TRIGGER gk_test_fail_measure BEFORE INSERT ON project_measurements FOR EACH ROW ` +
          `SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'synthetic failure'`,
      )
      try {
        const r = await create({ name: "Doomed", client_id: clientId, template: "ecommerce", include_client_checklist: true })
        expect(r.status).toBe(500)
        expect(r.json.error).toBe("Could not create the project from the template. Nothing was saved.")
      } finally {
        sql(`DROP TRIGGER IF EXISTS gk_test_fail_measure`)
      }
      expect(projectCount()).toBe(0)
      expect(Number(one(`SELECT COUNT(*) FROM tasks`))).toBe(0)
      expect(Number(one(`SELECT COUNT(*) FROM project_assets`))).toBe(0)
      expect(Number(one(`SELECT COUNT(*) FROM audit_log WHERE action = 'project_create'`))).toBe(0)
      // The endpoint works again once the cause is gone.
      expect((await create({ name: "Recovered", template: "ecommerce" })).status).toBe(201)
    })

    it("rolls back when a task fails after the project row is written", async () => {
      sql(
        `CREATE TRIGGER gk_test_fail_task BEFORE INSERT ON tasks FOR EACH ROW ` +
          `SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'synthetic failure'`,
      )
      try {
        expect((await create({ name: "Doomed too", template: "website_care" })).status).toBe(500)
      } finally {
        sql(`DROP TRIGGER IF EXISTS gk_test_fail_task`)
      }
      expect(projectCount()).toBe(0)
    })

    it("writes the audit row inside the transaction: a failed audit leaves no project, tasks or rows", async () => {
      sql(
        `CREATE TRIGGER gk_test_fail_audit BEFORE INSERT ON audit_log FOR EACH ROW ` +
          `SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'synthetic failure'`,
      )
      try {
        const r = await create({ name: "Unaudited", template: "business_website", include_client_checklist: true })
        expect(r.status).toBe(500)
      } finally {
        sql(`DROP TRIGGER IF EXISTS gk_test_fail_audit`)
      }
      expect(projectCount()).toBe(0)
      expect(Number(one(`SELECT COUNT(*) FROM tasks`))).toBe(0)
      expect(Number(one(`SELECT COUNT(*) FROM project_assets`))).toBe(0)
      expect(Number(one(`SELECT COUNT(*) FROM project_measurements`))).toBe(0)
    })
  })

  describe("the client checklist is opt-in", () => {
    it("adds no checklist items by default, but still adds the tasks and measurements", async () => {
      const t = templates[0]
      const r = await create({ name: "Quiet start", client_id: clientId, template: "business_website" })
      expect(r.status).toBe(201)
      expect(r.json.include_client_checklist).toBe(false)
      expect(r.json.created).toEqual({ tasks: t.tasks.length, assets: 0, measurements: t.brief.measurements.length })
      expect(r.json.skipped).toEqual([])
      expect(count("project_assets", r.json.id)).toBe(0)
      // So the client's portal shows nothing new.
      const mine = await api<unknown[]>("assets.php?action=mine", { token: client })
      expect(mine.status).toBe(200)
      expect(mine.json).toEqual([])
    })

    it("only takes a real true: a string, a number or false adds no items", async () => {
      for (const flag of ["true", 1, false, null]) {
        const r = await create({ name: `Flag ${String(flag)}`, template: "ecommerce", include_client_checklist: flag })
        expect(r.status).toBe(201)
        expect(r.json.created?.assets).toBe(0)
      }
      expect(Number(one(`SELECT COUNT(*) FROM project_assets`))).toBe(0)
    })

    it("adds the items when asked, and the client sees them in the portal", async () => {
      const r = await create({ name: "Loud start", client_id: clientId, template: "it_consultancy", include_client_checklist: true })
      expect(r.json.include_client_checklist).toBe(true)
      const mine = await api<{ project_id: number }[]>("assets.php?action=mine", { token: client })
      expect(mine.json.length).toBe(templates.find((x) => x.key === "it_consultancy")!.assets.length)
    })

    it("does not report SQL 15 as skipped when the checklist was not asked for", async () => {
      sql(`RENAME TABLE project_assets TO project_assets_parked`)
      let r: Awaited<ReturnType<typeof create>>
      try {
        r = await create({ name: "No checklist wanted", template: "website_care" })
      } finally {
        sql(`RENAME TABLE project_assets_parked TO project_assets`)
      }
      expect(r.status).toBe(201)
      expect(r.json.skipped).toEqual([])
    })
  })

  describe("projects.php uploaded without _templates.php", () => {
    it("keeps list, create and status working, and answers 503 on the template routes", async () => {
      const file = path.join(WORK_DIR, "_templates.php")
      const parked = path.join(WORK_DIR, "_templates.php.parked")
      fs.renameSync(file, parked)
      try {
        const bare = await create({ name: "Bare while missing" })
        expect(bare.status).toBe(201)
        const list = await api<{ id: number }[]>("projects.php", { token: owner })
        expect(list.status).toBe(200)
        expect(list.json.map((p) => p.id)).toEqual([bare.json.id])
        const status = await api("projects.php?action=status", { token: owner, body: { id: bare.json.id, status: "in_progress" } })
        expect(status.status).toBe(200)

        const tpl = await api<{ error?: string }>("projects.php?action=templates", { token: owner })
        expect(tpl.status).toBe(503)
        expect(tpl.json.error).toBe("Project templates are not available yet.")
        const fromTemplate = await create({ name: "Templated while missing", template: "ecommerce" })
        expect(fromTemplate.status).toBe(503)
        expect(fromTemplate.json.error).toBe("Project templates are not available yet.")
      } finally {
        fs.renameSync(parked, file)
      }
      expect(projectCount()).toBe(1)
      expect((await api("projects.php?action=templates", { token: owner })).status).toBe(200)
    })
  })

  describe("before SQL 15 or SQL 16 has run", () => {
    it("skips the asset items and reports it when project_assets is missing", async () => {
      sql(`RENAME TABLE project_assets TO project_assets_parked`)
      let r: Awaited<ReturnType<typeof create>>
      try {
        r = await create({ name: "No checklist yet", template: "business_website", include_client_checklist: true })
      } finally {
        sql(`RENAME TABLE project_assets_parked TO project_assets`)
      }
      const t = templates[0]
      expect(r.status).toBe(201)
      expect(r.json.created).toEqual({ tasks: t.tasks.length, assets: 0, measurements: t.brief.measurements.length })
      expect(r.json.skipped?.map((s) => s.table)).toEqual(["project_assets"])
      expect(r.json.skipped?.[0].note).toContain("SQL 15")
      expect(count("project_assets", r.json.id)).toBe(0)
      expect(count("tasks", r.json.id)).toBe(t.tasks.length)
    })

    it("skips the measurement rows and reports it when project_measurements is missing", async () => {
      sql(`RENAME TABLE project_measurements TO project_measurements_parked`)
      let r: Awaited<ReturnType<typeof create>>
      try {
        r = await create({ name: "No brief yet", template: "it_support", include_client_checklist: true })
      } finally {
        sql(`RENAME TABLE project_measurements_parked TO project_measurements`)
      }
      const t = templates.find((x) => x.key === "it_support")!
      expect(r.status).toBe(201)
      expect(r.json.created).toEqual({ tasks: t.tasks.length, assets: t.assets.length, measurements: 0 })
      expect(r.json.skipped?.map((s) => s.table)).toEqual(["project_measurements"])
      expect(r.json.skipped?.[0].note).toContain("SQL 16")
      expect(count("project_measurements", r.json.id)).toBe(0)
    })

    it("reports both when neither table exists, and still creates the project and tasks", async () => {
      sql(`RENAME TABLE project_assets TO project_assets_parked, project_measurements TO project_measurements_parked`)
      let r: Awaited<ReturnType<typeof create>>
      try {
        r = await create({ name: "Tasks only", template: "it_consultancy", include_client_checklist: true })
      } finally {
        sql(`RENAME TABLE project_assets_parked TO project_assets, project_measurements_parked TO project_measurements`)
      }
      expect(r.status).toBe(201)
      expect(r.json.skipped?.map((s) => s.table)).toEqual(["project_assets", "project_measurements"])
      expect(r.json.created?.tasks).toBe(templates.find((x) => x.key === "it_consultancy")!.tasks.length)
    })
  })
})
