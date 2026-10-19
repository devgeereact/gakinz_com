/**
 * Project brief, measurements and the GEE OS handoff export (server/briefs.php,
 * SQL 16). Staff only. The properties under test: a brief saves field by field
 * with nothing required, every text field is capped, a measurement can only be
 * changed through its own project, a client is refused everywhere, and the
 * handoff carries the allowed fields and nothing personal about the client.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createUser, login, one, q, resetDb, sql } from "./helpers"

type Brief = Record<string, string | null> & { error?: string }
type Measure = {
  id: number
  project_id: number
  label: string
  target: string | null
  baseline: string | null
  actual: string | null
  result: string
  measured_on: string | null
  environment: string | null
  method: string | null
  evidence_location: string | null
  kind: string
  observation_window: string | null
  error?: string
}
type BriefView = { project: { id: number; name: string; client_id: number | null }; brief: Brief | null; measurements: Measure[]; error?: string }

// Synthetic client personal data. None of it may ever appear in a handoff.
const CLIENT = {
  company: "Pemberton Florists Ltd",
  contact: "Harriet Pemberton",
  email: "harriet.pemberton@pemberton-florists.example.test",
  phone: "07700 900123",
  notes: "OWNER NOTE: pays late, prefers calls after six, daughter is the real decision maker.",
}

function createProject(clientId: number | null, name: string): number {
  sql(`INSERT INTO projects (client_id, name, status) VALUES (${q(clientId)}, ${q(name)}, 'in_progress')`)
  return Number(one(`SELECT MAX(id) FROM projects`))
}

const auditCount = (action: string) => Number(one(`SELECT COUNT(*) FROM audit_log WHERE action = ${q(action)}`))
const raw = (r: { json: unknown }) => (r.json as { _raw?: string })._raw ?? ""

describe("project brief and measurements", () => {
  let clientId: number
  let projectA: number
  let projectB: number
  let owner: string
  let employee: string
  let client: string

  beforeEach(async () => {
    resetDb()
    sql(
      `INSERT INTO clients (company, contact_name, email, phone, notes) VALUES ` +
        `(${q(CLIENT.company)}, ${q(CLIENT.contact)}, ${q(CLIENT.email)}, ${q(CLIENT.phone)}, ${q(CLIENT.notes)})`,
    )
    clientId = Number(one(`SELECT MAX(id) FROM clients`))
    projectA = createProject(clientId, "Shop relaunch")
    projectB = createProject(null, "Studio internal tools")
    createUser({ email: "owner@example.test", role: "super_admin" })
    createUser({ email: "employee@example.test", role: "employee" })
    createUser({ email: "client@example.test", role: "client", clientId })
    owner = await login("owner@example.test")
    employee = await login("employee@example.test")
    client = await login("client@example.test")
  })

  const view = (projectId: number | string, token = owner) => api<BriefView>(`briefs.php?project_id=${projectId}`, { token })
  const save = (body: unknown, token = owner) => api<Brief>("briefs.php?action=save", { token, body })
  const measure = (action: string, body: unknown, token = owner) => api<Measure>(`briefs.php?action=${action}`, { token, body })
  const handoff = (projectId: number, token = owner) => api(`briefs.php?action=handoff&project_id=${projectId}`, { token })

  describe("brief", () => {
    it("starts empty, then saves one field at a time without touching the others", async () => {
      const first = await view(projectA)
      expect(first.status).toBe(200)
      expect(first.json.project).toEqual({ id: projectA, name: "Shop relaunch", client_id: clientId })
      expect(first.json.brief).toBeNull()
      expect(first.json.measurements).toEqual([])

      const a = await save({ project_id: projectA, problem: "  Orders arrive by phone only.  " })
      expect(a.status).toBe(200)
      expect(a.json.problem).toBe("Orders arrive by phone only.")
      expect(a.json.deliverables).toBeNull()

      const b = await save({ project_id: projectA, deliverables: "- Catalogue\n- Checkout", quote_reference: "Q-0042", invented_field: "ignored" })
      expect(b.status).toBe(200)
      expect(b.json).toMatchObject({ problem: "Orders arrive by phone only.", deliverables: "- Catalogue\n- Checkout", quote_reference: "Q-0042" })
      expect(b.json).not.toHaveProperty("invented_field")
      expect(Number(one(`SELECT COUNT(*) FROM project_briefs WHERE project_id = ${projectA}`))).toBe(1)

      // null and a blank string both clear; a single-line field loses its newlines.
      const c = await save({ project_id: projectA, problem: null, quote_reference: "   ", next_action: "Send\nthe draft" })
      expect(c.json).toMatchObject({ problem: null, quote_reference: null, next_action: "Send the draft", deliverables: "- Catalogue\n- Checkout" })
      expect(one(`SELECT updated_by FROM project_briefs WHERE project_id = ${projectA}`)).toBe(one(`SELECT id FROM users WHERE email = 'owner@example.test'`))
      expect(auditCount("brief_save")).toBe(3)
    })

    it("creates an empty brief from a body with no fields, because no field is required", async () => {
      const r = await save({ project_id: projectA })
      expect(r.status).toBe(200)
      expect(r.json.problem).toBeNull()
      expect((await view(projectA)).json.brief).not.toBeNull()
    })

    it("records and clears the completion acknowledgement date, refusing a date that does not exist", async () => {
      expect((await save({ project_id: projectA, completion_ack_on: "2026-10-19", completion_ack_note: "By email" })).json.completion_ack_on).toBe("2026-10-19")
      expect((await save({ project_id: projectA, completion_ack_on: "2026-02-30" })).status).toBe(400)
      expect((await save({ project_id: projectA, completion_ack_on: "19/10/2026" })).status).toBe(400)
      expect(one(`SELECT completion_ack_on FROM project_briefs WHERE project_id = ${projectA}`)).toBe("2026-10-19")
      expect((await save({ project_id: projectA, completion_ack_on: null })).json.completion_ack_on).toBeNull()
    })

    it("refuses an over-long or non-text field and writes nothing", async () => {
      const long = await save({ project_id: projectA, problem: "ok", deliverables: "x".repeat(4001) })
      expect(long.status).toBe(400)
      expect(long.json.error).toBe("Keep deliverables to 4000 characters or fewer.")
      expect((await save({ project_id: projectA, deliverables: "x".repeat(4000) })).status).toBe(200)
      expect((await save({ project_id: projectA, quote_reference: "Q".repeat(121) })).status).toBe(400)
      expect((await save({ project_id: projectA, intended_users: "u".repeat(1001) })).status).toBe(400)
      expect((await save({ project_id: projectA, next_action: "n".repeat(501) })).status).toBe(400)
      expect((await save({ project_id: projectA, exclusions: ["not", "text"] })).status).toBe(400)
      expect((await save({ project_id: projectA, open_decisions: 42 })).status).toBe(400)
      expect(one(`SELECT problem FROM project_briefs WHERE project_id = ${projectA}`)).toBe("NULL")
    })

    it("answers 404 for a missing or deleted project and 400 for a malformed id", async () => {
      expect((await save({ project_id: 999_999, problem: "x" })).status).toBe(404)
      expect((await view(999_999)).status).toBe(404)
      expect((await view("1 OR 1=1")).status).toBe(400)
      sql(`UPDATE projects SET deleted_at = NOW() WHERE id = ${projectB}`)
      expect((await save({ project_id: projectB, problem: "x" })).status).toBe(404)
      expect(Number(one(`SELECT COUNT(*) FROM project_briefs`))).toBe(0)
    })
  })

  describe("measurements", () => {
    it("creates a technical measurement as NOT TESTED, updates its result and soft deletes it", async () => {
      const c = await measure("measure_create", { project_id: projectA, label: "Checkout works on a phone", target: "Three sandbox orders complete" })
      expect(c.status).toBe(201)
      expect(c.json).toMatchObject({ project_id: projectA, label: "Checkout works on a phone", result: "NOT TESTED", kind: "technical", observation_window: null })
      const id = c.json.id

      const u = await measure("measure_update", {
        id,
        project_id: projectA,
        result: "PASS",
        actual: "3 of 3",
        measured_on: "2026-10-18",
        environment: "staging, Safari on iPhone",
        evidence_location: "Files: checkout-run.pdf",
      })
      expect(u.status).toBe(200)
      expect(u.json).toMatchObject({ result: "PASS", actual: "3 of 3", measured_on: "2026-10-18", target: "Three sandbox orders complete" })
      expect((await view(projectA)).json.measurements.map((m) => m.result)).toEqual(["PASS"])

      expect((await measure("measure_delete", { id, project_id: projectA })).status).toBe(200)
      expect(one(`SELECT deleted_at IS NOT NULL FROM project_measurements WHERE id = ${id}`)).toBe("1")
      expect((await view(projectA)).json.measurements).toEqual([])
      expect((await measure("measure_delete", { id, project_id: projectA })).status).toBe(404)
      expect((await measure("measure_update", { id, project_id: projectA, result: "FAIL" })).status).toBe(404)
      expect([auditCount("measure_create"), auditCount("measure_update"), auditCount("measure_delete")]).toEqual([1, 1, 1])
    })

    it("accepts only PASS, FAIL, PARTIAL or NOT TESTED, and a known kind", async () => {
      for (const result of ["pass", "DONE", "", 1]) {
        const r = await measure("measure_create", { project_id: projectA, label: "Keyboard use", result })
        expect(r.status).toBe(400)
      }
      expect((await measure("measure_create", { project_id: projectA, label: "Keyboard use", kind: "vibes" })).status).toBe(400)
      expect((await measure("measure_create", { project_id: projectA, label: "   " })).status).toBe(400)
      expect((await measure("measure_create", { project_id: projectA })).status).toBe(400)
      expect((await measure("measure_create", { project_id: projectA, label: "L".repeat(201) })).status).toBe(400)
      expect((await measure("measure_create", { project_id: projectA, label: "Keyboard use", method: "m".repeat(1001) })).status).toBe(400)
      expect((await measure("measure_create", { project_id: projectA, label: "Keyboard use", measured_on: "2026-13-01" })).status).toBe(400)
      expect(Number(one(`SELECT COUNT(*) FROM project_measurements`))).toBe(0)
      const ok = await measure("measure_create", { project_id: projectA, label: "Keyboard use", result: "PARTIAL" })
      expect(ok.json.result).toBe("PARTIAL")
      const nope = await measure("measure_update", { id: ok.json.id, project_id: projectA, result: "Passed" })
      expect(nope.status).toBe(400)
      expect(one(`SELECT result FROM project_measurements WHERE id = ${ok.json.id}`)).toBe("PARTIAL")
    })

    it("keeps an observation window for a business observation only", async () => {
      const biz = await measure("measure_create", { project_id: projectA, label: "Online orders", kind: "business", observation_window: "1 to 30 November" })
      expect(biz.json).toMatchObject({ kind: "business", observation_window: "1 to 30 November" })
      expect((await measure("measure_create", { project_id: projectA, label: "Form sends", observation_window: "a week" })).status).toBe(400)
      // Turning it into a technical check drops the window.
      const tech = await measure("measure_update", { id: biz.json.id, project_id: projectA, kind: "technical" })
      expect(tech.json).toMatchObject({ kind: "technical", observation_window: null })
    })

    it("refuses to edit or delete a measurement through another project's id", async () => {
      const m = await measure("measure_create", { project_id: projectA, label: "Pages agreed", target: "Five pages" })
      const id = m.json.id
      const wrong = await measure("measure_update", { id, project_id: projectB, result: "FAIL", target: "Hijacked" })
      expect(wrong.status).toBe(404)
      expect(wrong.json.error).toBe("Measurement not found.")
      expect((await measure("measure_update", { id, result: "FAIL" })).status).toBe(400) // no project id at all
      expect((await measure("measure_delete", { id, project_id: projectB })).status).toBe(404)
      expect(sql(`SELECT result, target, deleted_at IS NULL, project_id FROM project_measurements WHERE id = ${id}`)[0]).toEqual([
        "NOT TESTED",
        "Five pages",
        "1",
        String(projectA),
      ])
      expect(auditCount("measure_update") + auditCount("measure_delete")).toBe(0)
    })
  })

  describe("access", () => {
    it("refuses a client on every route, reads included, and an anonymous caller with 401", async () => {
      await save({ project_id: projectA, deliverables: "Catalogue" })
      const m = await measure("measure_create", { project_id: projectA, label: "Pages agreed" })
      expect((await view(projectA, client)).status).toBe(403)
      expect((await handoff(projectA, client)).status).toBe(403)
      expect((await save({ project_id: projectA, deliverables: "Client edit" }, client)).status).toBe(403)
      expect((await measure("measure_create", { project_id: projectA, label: "Client" }, client)).status).toBe(403)
      expect((await measure("measure_update", { id: m.json.id, project_id: projectA, result: "PASS" }, client)).status).toBe(403)
      expect((await measure("measure_delete", { id: m.json.id, project_id: projectA }, client)).status).toBe(403)
      expect((await api(`briefs.php?project_id=${projectA}`)).status).toBe(401)
      expect(one(`SELECT deliverables FROM project_briefs WHERE project_id = ${projectA}`)).toBe("Catalogue")
      expect(sql(`SELECT result, deleted_at IS NULL FROM project_measurements WHERE id = ${m.json.id}`)[0]).toEqual(["NOT TESTED", "1"])
    })

    it("lets an employee work on the brief, as projects.php does", async () => {
      expect((await save({ project_id: projectA, problem: "From an employee" }, employee)).status).toBe(200)
      expect((await measure("measure_create", { project_id: projectA, label: "Pages agreed" }, employee)).status).toBe(201)
      expect((await handoff(projectA, employee)).status).toBe(200)
    })

    it("answers 503 with the SQL 16 step while the tables are missing", async () => {
      sql(`RENAME TABLE project_briefs TO project_briefs_parked`)
      try {
        const r = await view(projectA)
        expect(r.status).toBe(503)
        expect(r.json.error).toContain("SQL 16")
        expect((await handoff(projectA)).status).toBe(503)
        expect((await save({ project_id: projectA, problem: "x" })).status).toBe(503)
      } finally {
        sql(`RENAME TABLE project_briefs_parked TO project_briefs`)
      }
    })
  })

  describe("handoff export", () => {
    async function fullBrief(): Promise<void> {
      await save({
        project_id: projectA,
        problem: "PROBLEM-TEXT customers cannot order online",
        intended_users: "INTENDED-USERS local buyers",
        agreed_outcome: "AGREED-OUTCOME-TEXT",
        deliverables: "- Product catalogue\n- Sandbox checkout",
        exclusions: "No stock control integration",
        quote_reference: "Q-0042",
        milestones_note: "MILESTONES-TEXT",
        next_action: "Owner sends the catalogue draft",
        open_decisions: "Which payment provider",
        handover_checklist: "HANDOVER-TEXT",
        support_boundaries: "SUPPORT-BOUNDARY-TEXT",
        completion_ack_on: "2026-10-19",
        completion_ack_note: "ACK-NOTE-TEXT",
      })
      await measure("measure_create", {
        project_id: projectA,
        label: "Checkout completes",
        target: "Three sandbox orders",
        method: "Manual run in Stripe test mode",
        result: "PASS",
        baseline: "BASELINE-TEXT",
        actual: "ACTUAL-TEXT",
        environment: "ENVIRONMENT-TEXT",
        evidence_location: "Files: checkout-run.pdf",
      })
      await measure("measure_create", { project_id: projectA, label: "Weekly online orders", kind: "business", observation_window: "WINDOW-TEXT" })
    }

    it("downloads as a Markdown attachment with the no-store and nosniff headers", async () => {
      const r = await handoff(projectA)
      expect(r.status).toBe(200)
      expect(r.headers.get("content-type")).toBe("text/markdown; charset=utf-8")
      expect(r.headers.get("content-disposition")).toBe(`attachment; filename="gakinz-handoff-project-${projectA}.md"`)
      expect(r.headers.get("x-content-type-options")).toBe("nosniff")
      expect(r.headers.get("cache-control")).toBe("private, no-store")
      expect(auditCount("brief_handoff_export")).toBe(1)
    })

    it("includes the project and client references, scope, criteria, decisions, next action and evidence", async () => {
      await fullBrief()
      const md = raw(await handoff(projectA))
      expect(md).toContain(`- Project ID: ${projectA}`)
      expect(md).toContain("- Project name: Shop relaunch")
      expect(md).toContain(`- Client ID: ${clientId}`)
      expect(md).toContain("- Product catalogue\n- Sandbox checkout")
      expect(md).toContain("No stock control integration")
      expect(md).toContain("Q-0042")
      expect(md).toContain("1. Checkout completes\n   - Target: Three sandbox orders\n   - Method: Manual run in Stripe test mode\n   - Result: PASS")
      expect(md).toContain("2. Weekly online orders\n   - Target: not recorded\n   - Method: not recorded\n   - Result: NOT TESTED")
      expect(md).toContain("## Open decisions\n\nWhich payment provider")
      expect(md).toContain("## Next action\n\nOwner sends the catalogue draft")
      expect(md).toContain("- Checkout completes: Files: checkout-run.pdf")
    })

    it("leaves out the client's name, email, phone and notes, and every brief or measurement field not on the list", async () => {
      await fullBrief()
      const md = raw(await handoff(projectA))
      expect(md.length).toBeGreaterThan(200)
      for (const secret of [CLIENT.company, CLIENT.contact, CLIENT.email, CLIENT.phone, "OWNER NOTE", "pays late", "Pemberton"]) {
        expect(md).not.toContain(secret)
      }
      for (const left of [
        "PROBLEM-TEXT", "INTENDED-USERS", "AGREED-OUTCOME-TEXT", "MILESTONES-TEXT", "HANDOVER-TEXT", "SUPPORT-BOUNDARY-TEXT",
        "ACK-NOTE-TEXT", "BASELINE-TEXT", "ACTUAL-TEXT", "ENVIRONMENT-TEXT", "WINDOW-TEXT", "owner@example.test",
      ]) {
        expect(md).not.toContain(left)
      }
    })

    it("removes client details, other email addresses and URL credentials typed into exported text", async () => {
      sql(`UPDATE projects SET name = ${q(`${CLIENT.company} relaunch`)} WHERE id = ${projectA}`)
      await save({
        project_id: projectA,
        deliverables: `Homepage for ${CLIENT.contact.toUpperCase()}, call ${CLIENT.phone}`,
        open_decisions: "Ask someone@else.example.test about hosting",
      })
      await measure("measure_create", { project_id: projectA, label: "Staging reachable", evidence_location: "https://deploy:hunter2@staging.example.test/report" })
      const md = raw(await handoff(projectA))
      expect(md).toContain("- Project name: \\[client detail removed\\] relaunch")
      expect(md).toContain("Homepage for \\[client detail removed\\], call \\[client detail removed\\]")
      expect(md).toContain("Ask \\[email removed\\] about hosting")
      expect(md).toContain("https://\\[credentials removed\\]@staging.example.test/report")
      for (const gone of ["Pemberton", "PEMBERTON", CLIENT.phone, "someone@else", "hunter2"]) expect(md).not.toContain(gone)
    })

    it("escapes Markdown and HTML in staff text so it cannot add headings, links, tags or tables", async () => {
      await save({
        project_id: projectA,
        deliverables: "# Injected heading\n[click](javascript:alert(1))\n<script>alert(1)</script>\n| a | b |\n```\n* kept bullet\n1. not a list\n===",
        next_action: "## Also\ninjected",
        quote_reference: "![img](x.png) &amp;",
      })
      await measure("measure_create", { project_id: projectA, label: "# Label heading", target: "<b>bold</b>", method: "`code`" })
      const md = raw(await handoff(projectA))
      const headings = md.split("\n").filter((l) => /^#/.test(l))
      expect(headings).toEqual([
        `# GEE OS handoff: project ${projectA}`,
        "## Project reference",
        "## Approved scope",
        "### Deliverables",
        "### Exclusions",
        "### Quote reference",
        "## Acceptance criteria",
        "## Open decisions",
        "## Next action",
        "## Evidence locations",
      ])
      expect(md).toContain("\\# Injected heading")
      expect(md).toContain("\\[click\\](javascript:alert(1))")
      expect(md).toContain("\\<script\\>alert(1)\\</script\\>")
      expect(md).toContain("\\| a \\| b \\|")
      expect(md).toContain("\\`\\`\\`")
      expect(md).toContain("- kept bullet")
      expect(md).toContain("1\\. not a list")
      expect(md).toContain("\\===")
      expect(md).toContain("## Next action\n\n\\#\\# Also injected")
      expect(md).toContain("\\!\\[img\\](x.png) \\&amp;")
      expect(md).toContain("1. \\# Label heading\n   - Target: \\<b\\>bold\\</b\\>\n   - Method: \\`code\\`")
      expect(md).not.toMatch(/(^|[^\\])<script/)
    })

    it("says plainly when nothing is recorded, and marks an internal project as having no client", async () => {
      const md = raw(await handoff(projectB))
      expect(md).toContain("- Client ID: none (internal project)")
      expect(md).toContain("### Deliverables\n\n_Not recorded._")
      expect(md).toContain("_No measurements recorded._")
      expect(md).toContain("## Evidence locations\n\n_None recorded._")
    })
  })
})
