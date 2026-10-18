/**
 * Project asset checklist (server/assets.php, SQL 15). The owner lists what a
 * client must send for a project; the client sees the list in the portal and
 * marks items supplied; the owner accepts or reopens them.
 *
 * Client isolation is the property under test above all others: the client
 * comes from the token, another client's item answers exactly as a missing
 * one (404), and a client can never accept, edit or delete. The 503 answer
 * before SQL 15 runs is not tested here: global setup always loads the whole
 * schema, so the table always exists.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createUser, login, one, q, resetDb, sql } from "./helpers"

type StaffItem = {
  id: number
  project_id: number
  label: string
  note: string | null
  status: string
  client_note: string | null
  file_id: number | null
  file_name: string | null
  requested_by: string | null
  supplied_at: string | null
  accepted_at: string | null
  error?: string
}
type ClientItem = Omit<StaffItem, "file_id" | "file_name" | "requested_by"> & { project_name: string }

function createProject(clientId: number | null, name: string): number {
  sql(`INSERT INTO projects (client_id, name, status) VALUES (${q(clientId)}, ${q(name)}, 'in_progress')`)
  return Number(one(`SELECT MAX(id) FROM projects`))
}

function createFile(projectId: number | null, name: string): number {
  sql(`INSERT INTO files (project_id, name, \`stored\`, mime, size) VALUES (${q(projectId)}, ${q(name)}, 'x.png', 'image/png', 10)`)
  return Number(one(`SELECT MAX(id) FROM files`))
}

const auditCount = (action: string) => Number(one(`SELECT COUNT(*) FROM audit_log WHERE action = ${q(action)}`))

describe("project asset checklist", () => {
  let clientA: number
  let clientB: number
  let projectA: number
  let projectB: number
  let tokenA: string
  let tokenB: string
  let tokenOwner: string
  let tokenEmployee: string

  beforeEach(async () => {
    resetDb()
    clientA = createClient("Synthetic A Ltd")
    clientB = createClient("Synthetic B Ltd")
    projectA = createProject(clientA, "A brochure site")
    projectB = createProject(clientB, "B secret relaunch")
    createUser({ email: "owner@example.test", role: "super_admin" })
    createUser({ email: "employee@example.test", role: "employee" })
    createUser({ email: "client-a@example.test", role: "client", clientId: clientA })
    createUser({ email: "client-b@example.test", role: "client", clientId: clientB })
    tokenOwner = await login("owner@example.test")
    tokenEmployee = await login("employee@example.test")
    tokenA = await login("client-a@example.test")
    tokenB = await login("client-b@example.test")
  })

  const add = (body: unknown, token = tokenOwner) => api<StaffItem>("assets.php?action=create", { token, body })
  const staffAct = (action: string, body: unknown, token = tokenOwner) => api<StaffItem>(`assets.php?action=${action}`, { token, body })
  const staffList = (projectId: number, token = tokenOwner) => api<StaffItem[]>(`assets.php?project_id=${projectId}`, { token })
  const mine = (token = tokenA) => api<ClientItem[]>("assets.php?action=mine", { token })
  const supply = (body: unknown, token = tokenA) => api<ClientItem>("assets.php?action=supply", { token, body })

  async function item(projectId: number, label: string, note?: string): Promise<number> {
    const r = await add({ project_id: projectId, label, ...(note ? { note } : {}) })
    expect(r.status).toBe(201)
    return r.json.id
  }

  describe("staff", () => {
    it("adds an item as requested, recording who asked, and lists it on the project", async () => {
      const r = await add({ project_id: projectA, label: "  Logo, as SVG  ", note: "The largest version you have." })
      expect(r.status).toBe(201)
      expect(r.json).toMatchObject({
        project_id: projectA,
        label: "Logo, as SVG",
        note: "The largest version you have.",
        status: "requested",
        requested_by: "owner",
        supplied_at: null,
        accepted_at: null,
      })
      expect(one(`SELECT requested_by FROM project_assets WHERE id = ${r.json.id}`)).toBe(one(`SELECT id FROM users WHERE email = 'owner@example.test'`))
      expect(auditCount("asset_create")).toBe(1)
      const list = await staffList(projectA)
      expect(list.status).toBe(200)
      expect(list.json.map((i) => i.label)).toEqual(["Logo, as SVG"])
      expect((await staffList(projectB)).json).toEqual([])
    })

    it("lets an employee manage the checklist, as projects.php does", async () => {
      const r = await add({ project_id: projectA, label: "Homepage copy" }, tokenEmployee)
      expect(r.status).toBe(201)
      expect((await staffList(projectA, tokenEmployee)).json).toHaveLength(1)
    })

    it("refuses a missing label, an over-long label or note, and an unknown or deleted project", async () => {
      expect((await add({ project_id: projectA, label: "   " })).status).toBe(400)
      expect((await add({ project_id: projectA })).status).toBe(400)
      expect((await add({ project_id: projectA, label: 42 })).status).toBe(400)
      expect((await add({ project_id: projectA, label: "x".repeat(161) })).status).toBe(400)
      expect((await add({ project_id: projectA, label: "Logo", note: "y".repeat(1001) })).status).toBe(400)
      expect((await add({ project_id: "1 OR 1=1", label: "Logo" })).status).toBe(400)
      expect((await add({ project_id: 999_999, label: "Logo" })).status).toBe(404)
      sql(`UPDATE projects SET deleted_at = NOW() WHERE id = ${projectB}`)
      expect((await add({ project_id: projectB, label: "Logo" })).status).toBe(404)
      expect(Number(one(`SELECT COUNT(*) FROM project_assets`))).toBe(0)
    })

    it("edits the label and note, and links only a file stored against the same project", async () => {
      const id = await item(projectA, "Logo")
      const r = await staffAct("update", { id, label: "Logo, vector", note: "SVG or EPS please." })
      expect(r.status).toBe(200)
      expect(r.json).toMatchObject({ label: "Logo, vector", note: "SVG or EPS please.", status: "requested" })

      const own = createFile(projectA, "logo.png")
      const other = createFile(projectB, "b-logo.png")
      expect((await staffAct("update", { id, file_id: other })).status).toBe(404)
      const linked = await staffAct("update", { id, file_id: own })
      expect(linked.json).toMatchObject({ file_id: own, file_name: "logo.png", label: "Logo, vector" })
      const cleared = await staffAct("update", { id, file_id: null, note: null })
      expect(cleared.json).toMatchObject({ file_id: null, note: null, label: "Logo, vector" })
      expect(auditCount("asset_update")).toBe(3)
    })

    it("accepts a supplied item, and reopens it to requested with the timestamps cleared and the client note kept", async () => {
      const id = await item(projectA, "Photos of the team")
      expect((await supply({ id, note: "Sent by email on Monday." })).status).toBe(200)

      const accepted = await staffAct("accept", { id })
      expect(accepted.status).toBe(200)
      expect(accepted.json.status).toBe("accepted")
      expect(accepted.json.accepted_at).not.toBeNull()
      expect((await staffAct("accept", { id })).status).toBe(409)

      const reopened = await staffAct("reopen", { id })
      expect(reopened.status).toBe(200)
      expect(reopened.json).toMatchObject({ status: "requested", supplied_at: null, accepted_at: null, client_note: "Sent by email on Monday." })
      expect((await staffAct("reopen", { id })).status).toBe(409)
      expect(auditCount("asset_accept")).toBe(1)
      expect(auditCount("asset_reopen")).toBe(1)
    })

    it("can accept an item the client sent another way, straight from requested", async () => {
      const id = await item(projectA, "Domain login, described")
      const r = await staffAct("accept", { id })
      expect(r.json).toMatchObject({ status: "accepted", supplied_at: null })
    })

    it("soft deletes an item, which then answers 404 and leaves the list", async () => {
      const id = await item(projectA, "Brand guidelines")
      expect((await staffAct("delete", { id })).status).toBe(200)
      expect(one(`SELECT deleted_at IS NOT NULL FROM project_assets WHERE id = ${id}`)).toBe("1")
      expect((await staffAct("delete", { id })).status).toBe(404)
      expect((await staffAct("accept", { id })).status).toBe(404)
      expect((await staffList(projectA)).json).toEqual([])
      expect(auditCount("asset_delete")).toBe(1)
    })

    it("refuses an unsigned caller and a GET without a project", async () => {
      expect((await api("assets.php?project_id=1")).status).toBe(401)
      expect((await api("assets.php?action=mine")).status).toBe(401)
      expect((await api("assets.php", { token: tokenOwner })).status).toBe(400)
      expect((await staffAct("explode", { id: 1 })).status).toBe(400)
    })
  })

  describe("client", () => {
    it("sees only the items on their own projects, without owner-only fields", async () => {
      const idA = await item(projectA, "Logo", "SVG if you have it.")
      await item(projectB, "B private brief")
      const r = await mine()
      expect(r.status).toBe(200)
      expect(r.json).toHaveLength(1)
      expect(r.json[0]).toMatchObject({ id: idA, project_id: projectA, project_name: "A brochure site", label: "Logo", note: "SVG if you have it.", status: "requested" })
      expect(Object.keys(r.json[0]).sort()).toEqual(
        ["accepted_at", "client_note", "created_at", "id", "label", "note", "project_id", "project_name", "status", "supplied_at", "updated_at"],
      )
      expect(JSON.stringify(r.json)).not.toContain("B private brief")
    })

    it("ignores a client_id or project_id in the query and still sees only their own items", async () => {
      await item(projectB, "B private brief")
      const r = await api<ClientItem[]>(`assets.php?action=mine&client_id=${clientB}&project_id=${projectB}`, { token: tokenA })
      expect(r.status).toBe(200)
      expect(r.json).toEqual([])
    })

    it("does not see items on a deleted project, a deleted item, or a project moved to another client", async () => {
      const gone = await item(projectA, "Old item")
      await staffAct("delete", { id: gone })
      const p2 = createProject(clientA, "A second site")
      await item(p2, "Second site logo")
      sql(`UPDATE projects SET deleted_at = NOW() WHERE id = ${p2}`)
      const p3 = createProject(clientA, "A third site")
      const moved = await item(p3, "Third site copy")
      sql(`UPDATE projects SET client_id = ${clientB} WHERE id = ${p3}`)
      expect((await mine()).json).toEqual([])
      expect((await supply({ id: moved })).status).toBe(404)
      expect((await mine(tokenB)).json.map((i) => i.id)).toEqual([moved])
    })

    it("marks an own item supplied with a note, once", async () => {
      const id = await item(projectA, "Homepage copy")
      const r = await supply({ id, note: "  In the shared folder, file named home.docx.  " })
      expect(r.status).toBe(200)
      expect(r.json).toMatchObject({ id, status: "supplied", client_note: "In the shared folder, file named home.docx." })
      expect(r.json.supplied_at).not.toBeNull()
      expect(auditCount("asset_supply")).toBe(1)

      const again = await supply({ id, note: "A second note" })
      expect(again.status).toBe(409)
      expect(one(`SELECT client_note FROM project_assets WHERE id = ${id}`)).toBe("In the shared folder, file named home.docx.")
      expect(auditCount("asset_supply")).toBe(1)
    })

    it("supplies without a note, and a resupply after reopen keeps the earlier note unless a new one is given", async () => {
      const id = await item(projectA, "Photos")
      expect((await supply({ id, note: "First batch by email." })).status).toBe(200)
      await staffAct("reopen", { id })
      const plain = await supply({ id })
      expect(plain.json).toMatchObject({ status: "supplied", client_note: "First batch by email." })
      await staffAct("reopen", { id })
      const fresh = await supply({ id, note: "Second batch, the right size." })
      expect(fresh.json.client_note).toBe("Second batch, the right size.")
    })

    it("cannot see or supply another client's item: it answers 404, as a missing one does", async () => {
      const idB = await item(projectB, "B private brief")
      const r = await supply({ id: idB, note: "mine now" })
      expect(r.status).toBe(404)
      expect(r.json.error).toBe("Item not found.")
      expect((await supply({ id: 999_999 })).json.error).toBe("Item not found.")
      expect(sql(`SELECT status, client_note FROM project_assets WHERE id = ${idB}`)[0]).toEqual(["requested", "NULL"])
      expect(auditCount("asset_supply")).toBe(0)
    })

    it("cannot accept, reopen, edit, delete, add or read the staff list", async () => {
      const id = await item(projectA, "Logo")
      for (const action of ["accept", "reopen", "update", "delete"]) {
        expect((await staffAct(action, { id, label: "Hacked", status: "accepted" }, tokenA)).status).toBe(403)
      }
      expect((await add({ project_id: projectA, label: "Self-made" }, tokenA)).status).toBe(403)
      expect((await staffList(projectA, tokenA)).status).toBe(403)
      expect(sql(`SELECT label, status FROM project_assets WHERE id = ${id}`)[0]).toEqual(["Logo", "requested"])
      expect(Number(one(`SELECT COUNT(*) FROM project_assets`))).toBe(1)
    })

    it("cannot set accepted, a label, a note or a file through supply: only id and note are read", async () => {
      const own = createFile(projectA, "logo.png")
      const id = await item(projectA, "Logo", "Owner guidance")
      const r = await supply({ id, status: "accepted", accepted_at: "2030-01-01", label: "Changed", note_owner: "x", file_id: own, project_id: projectB })
      expect(r.status).toBe(200)
      expect(sql(`SELECT status, label, note, file_id, accepted_at, project_id FROM project_assets WHERE id = ${id}`)[0]).toEqual(
        ["supplied", "Logo", "Owner guidance", "NULL", "NULL", String(projectA)],
      )
    })

    it("cannot supply an item the studio already accepted", async () => {
      const id = await item(projectA, "Logo")
      await staffAct("accept", { id })
      const r = await supply({ id })
      expect(r.status).toBe(409)
      expect(one(`SELECT status FROM project_assets WHERE id = ${id}`)).toBe("accepted")
    })

    it("refuses a bad id, an over-long note, and a client account not linked to a client", async () => {
      const id = await item(projectA, "Logo")
      expect((await supply({ id: "1; DROP TABLE project_assets" })).status).toBe(400)
      expect((await supply({ id: -1 })).status).toBe(400)
      expect((await supply({ id, note: "z".repeat(1001) })).status).toBe(400)
      expect((await supply({ id, note: 12 })).status).toBe(400)
      createUser({ email: "orphan@example.test", role: "client", clientId: null })
      const orphan = await login("orphan@example.test")
      expect((await mine(orphan)).status).toBe(403)
      expect(one(`SELECT status FROM project_assets WHERE id = ${id}`)).toBe("requested")
    })

    it("lets staff use the client-only routes not at all", async () => {
      const id = await item(projectA, "Logo")
      expect((await mine(tokenOwner)).status).toBe(403)
      expect((await supply({ id }, tokenOwner)).status).toBe(403)
    })

    it("hides a soft-deleted item from the client and refuses to supply it", async () => {
      const id = await item(projectA, "Logo")
      await staffAct("delete", { id })
      expect((await mine()).json).toEqual([])
      expect((await supply({ id })).status).toBe(404)
    })
  })
})
