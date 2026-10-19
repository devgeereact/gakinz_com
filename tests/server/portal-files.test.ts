/**
 * Files shared to the client portal (server/files.php, SQL 18). Staff mark a
 * file "Visible to client"; the client lists and downloads only their own
 * visible, live files.
 *
 * Client isolation is the property under test above all others: the client
 * comes from the token, another client's file answers exactly as a missing one
 * (404), a stored path from the database is never trusted, and a client never
 * receives the stored name, the share token or the uploader.
 */
import fs from "node:fs"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { BASE, DB_NAME, WORK_DIR } from "./env"
import { api, createClient, createUser, login, one, q, resetDb, sql } from "./helpers"

type StaffFile = { id: number; client_visible: boolean | null; shared_at: string | null; error?: string }
type ClientFile = { id: number; name: string; mime: string; size: number; shared_at: string | null; project_name: string | null }

const PDF = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n", "latin1")
const UPLOADS = path.join(WORK_DIR, "uploads")

function createProject(clientId: number | null, name: string): number {
  sql(`INSERT INTO projects (client_id, name, status) VALUES (${q(clientId)}, ${q(name)}, 'in_progress')`)
  return Number(one(`SELECT MAX(id) FROM projects`))
}

/** A row written straight to the table, for cases the upload route cannot make. */
function fileRow(opts: { clientId?: number | null; projectId?: number | null; stored?: string; visible?: boolean; name?: string }): number {
  sql(
    `INSERT INTO files (client_id, project_id, name, \`stored\`, mime, size, share_token, uploaded_by, client_visible, shared_at) VALUES (` +
      `${q(opts.clientId ?? null)}, ${q(opts.projectId ?? null)}, ${q(opts.name ?? "row.pdf")}, ${q(opts.stored ?? "missing.pdf")}, ` +
      `'application/pdf', 10, NULL, NULL, ${opts.visible ? 1 : 0}, ${opts.visible ? "NOW()" : "NULL"})`,
  )
  return Number(one(`SELECT MAX(id) FROM files`))
}

async function upload(token: string, name: string, bytes: Buffer, fields: Record<string, number> = {}): Promise<{ status: number; id: number }> {
  const form = new FormData()
  form.append("file", new Blob([bytes]), name)
  for (const [k, v] of Object.entries(fields)) form.append(k, String(v))
  const res = await fetch(`${BASE}/files.php?action=upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form })
  const json = (await res.json()) as { id?: number }
  return { status: res.status, id: json.id ?? 0 }
}

async function fetchRaw(pathAndQuery: string, token: string): Promise<{ status: number; body: Buffer; headers: Headers }> {
  const res = await fetch(`${BASE}/${pathAndQuery}`, { headers: { Authorization: `Bearer ${token}` } })
  return { status: res.status, body: Buffer.from(await res.arrayBuffer()), headers: res.headers }
}

const auditCount = (action: string) => Number(one(`SELECT COUNT(*) FROM audit_log WHERE action = ${q(action)}`))

describe("files shared to the client portal", () => {
  let clientA: number
  let clientB: number
  let projectA: number
  let projectB: number
  let owner: string
  let employee: string
  let tokenA: string
  let tokenB: string

  beforeEach(async () => {
    resetDb()
    clientA = createClient("Synthetic A Ltd")
    clientB = createClient("Synthetic B Ltd")
    projectA = createProject(clientA, "A recommendation")
    projectB = createProject(clientB, "B secret relaunch")
    createUser({ email: "owner@example.test", role: "super_admin" })
    createUser({ email: "employee@example.test", role: "employee" })
    createUser({ email: "client-a@example.test", role: "client", clientId: clientA })
    createUser({ email: "client-b@example.test", role: "client", clientId: clientB })
    owner = await login("owner@example.test")
    employee = await login("employee@example.test")
    tokenA = await login("client-a@example.test")
    tokenB = await login("client-b@example.test")
  })

  const setShare = (id: number, visible: unknown, token = owner) => api<StaffFile>("files.php?action=client_share", { token, body: { id, visible } })
  const mine = (token = tokenA) => api<ClientFile[]>("files.php?action=mine", { token })
  const staffRow = async (id: number) => (await api<StaffFile[]>("files.php", { token: owner })).json.find((f) => f.id === id)

  it("shares and unshares a file, audits each change once and keeps the first shared_at", async () => {
    const up = await upload(owner, "Recommendation.pdf", PDF, { project_id: projectA })
    expect(up.status).toBe(201)
    expect(await staffRow(up.id)).toMatchObject({ client_visible: false, shared_at: null })

    const on = await setShare(up.id, true)
    expect(on.status).toBe(200)
    expect(on.json).toMatchObject({ id: up.id, client_visible: true })
    expect(on.json.shared_at).toMatch(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/)
    expect(await staffRow(up.id)).toMatchObject({ client_visible: true, shared_at: on.json.shared_at })

    // Sharing again changes nothing and writes no second audit row.
    sql(`UPDATE files SET shared_at = '2026-01-02 03:04:05' WHERE id = ${up.id}`)
    const again = await setShare(up.id, true, employee)
    expect(again.json).toMatchObject({ client_visible: true, shared_at: "2026-01-02 03:04:05" })
    expect(auditCount("file_client_share")).toBe(1)

    const off = await setShare(up.id, false)
    expect(off.json).toMatchObject({ client_visible: false, shared_at: null })
    expect(auditCount("file_client_share")).toBe(2)
    expect((await mine()).json).toEqual([])
  })

  it("refuses to share a file that resolves to no client, or to two", async () => {
    const loose = fileRow({})
    const noClientProject = fileRow({ projectId: createProject(null, "Internal") })
    const mismatched = fileRow({ clientId: clientA, projectId: projectB })
    const removedProject = createProject(clientA, "A removed")
    const onRemoved = fileRow({ projectId: removedProject })
    sql(`UPDATE projects SET deleted_at = NOW() WHERE id = ${removedProject}`)
    for (const id of [loose, noClientProject, mismatched, onRemoved]) {
      const r = await setShare(id, true)
      expect(r.status).toBe(409)
      expect(one(`SELECT client_visible FROM files WHERE id = ${id}`)).toBe("0")
    }
    expect((await setShare(onRemoved, true)).json.error).toMatch(/project was removed/)
    expect((await setShare(noClientProject, true)).json.error).toMatch(/project has no client/)
    expect((await setShare(9999, true)).status).toBe(404)
    expect((await setShare(fileRow({ clientId: clientA }), "yes")).status).toBe(400)
    expect((await setShare(fileRow({ clientId: clientA }), undefined)).status).toBe(400)
    expect(auditCount("file_client_share")).toBe(0)
    // Hiding is always allowed, even for a file that could never be shown.
    expect((await setShare(mismatched, false)).status).toBe(200)
  })

  it("lists only the caller's own visible, live files, directly and through their projects", async () => {
    const direct = fileRow({ clientId: clientA, visible: true, name: "Direct.pdf" })
    const viaProject = fileRow({ projectId: projectA, visible: true, name: "Via project.pdf" })
    const both = fileRow({ clientId: clientA, projectId: projectA, visible: true, name: "Both.pdf" })
    fileRow({ clientId: clientA, name: "Not shared.pdf" })
    fileRow({ clientId: clientB, visible: true, name: "B direct.pdf" })
    fileRow({ projectId: projectB, visible: true, name: "B project.pdf" })
    fileRow({ clientId: clientA, projectId: projectB, visible: true, name: "Mismatched.pdf" })
    const deleted = fileRow({ clientId: clientA, visible: true, name: "Deleted.pdf" })
    sql(`UPDATE files SET deleted_at = NOW() WHERE id = ${deleted}`)
    const goneProject = createProject(clientA, "A cancelled")
    fileRow({ projectId: goneProject, visible: true, name: "Cancelled project.pdf" })
    sql(`UPDATE projects SET deleted_at = NOW() WHERE id = ${goneProject}`)

    const a = await mine()
    expect(a.status).toBe(200)
    expect(a.json.map((f) => f.id).sort()).toEqual([direct, viaProject, both].sort())
    const vp = a.json.find((f) => f.id === viaProject)!
    expect(Object.keys(vp).sort()).toEqual(["id", "mime", "name", "project_name", "shared_at", "size"])
    expect(vp).toMatchObject({ name: "Via project.pdf", mime: "application/pdf", size: 10, project_name: "A recommendation" })
    expect(a.json.find((f) => f.id === direct)!.project_name).toBeNull()

    const b = await mine(tokenB)
    expect(b.json.map((f) => f.name).sort()).toEqual(["B direct.pdf", "B project.pdf"])
  })

  it("names a file on the standing IT support project as IT support, whatever staff called it", async () => {
    sql(`INSERT INTO projects (client_id, name, status, kind) VALUES (${clientA}, 'Helpdesk internal bucket', 'in_progress', 'it_support')`)
    const standing = Number(one(`SELECT MAX(id) FROM projects`))
    fileRow({ projectId: standing, visible: true, name: "Router notes.pdf" })
    fileRow({ projectId: projectA, visible: true, name: "Plan.pdf" })
    const listed = (await mine()).json
    expect(listed.find((f) => f.name === "Router notes.pdf")?.project_name).toBe("IT support")
    // An ordinary project keeps its own name, and the kind itself is never sent.
    expect(listed.find((f) => f.name === "Plan.pdf")?.project_name).toBe("A recommendation")
    expect(JSON.stringify(listed)).not.toMatch(/Helpdesk internal bucket|kind/)
  })

  it("streams the client's own file with the exact bytes and the download headers", async () => {
    const up = await upload(owner, "Final recommendation.pdf", PDF, { project_id: projectA })
    await setShare(up.id, true)
    const listed = (await mine()).json
    expect(listed).toHaveLength(1)
    expect(JSON.stringify(listed)).not.toMatch(/stored|share_token|uploaded_by|client_id/)

    const r = await fetchRaw(`files.php?action=mine_download&id=${up.id}`, tokenA)
    expect(r.status).toBe(200)
    expect(r.body.equals(PDF)).toBe(true)
    expect(r.headers.get("content-type")).toBe("application/pdf")
    expect(r.headers.get("content-disposition")).toBe(
      "attachment; filename=\"Final recommendation.pdf\"; filename*=UTF-8''Final%20recommendation.pdf",
    )
    expect(r.headers.get("content-length")).toBe(String(PDF.length))
    expect(r.headers.get("x-content-type-options")).toBe("nosniff")
    expect(r.headers.get("cache-control")).toBe("private, no-store")
    // The staff download sends the same headers through the same helper.
    const staff = await fetchRaw(`files.php?download=${up.id}`, owner)
    expect(staff.body.equals(PDF)).toBe(true)
    expect(staff.headers.get("cache-control")).toBe("private, no-store")
  })

  it("sends an ASCII fallback name beside the UTF-8 name, and never a quote, backslash or control character", async () => {
    const id = fileRow({ clientId: clientA, visible: true, name: 'Résumé "final"\\v2\t.pdf', stored: "a1b2c3named.pdf" })
    fs.mkdirSync(UPLOADS, { recursive: true })
    fs.writeFileSync(path.join(UPLOADS, "a1b2c3named.pdf"), PDF)
    try {
      const r = await fetchRaw(`files.php?action=mine_download&id=${id}`, tokenA)
      expect(r.status).toBe(200)
      expect(r.headers.get("content-disposition")).toBe(
        "attachment; filename=\"R_sum_ _final__v2.pdf\"; filename*=UTF-8''R%C3%A9sum%C3%A9%20%22final%22%5Cv2.pdf",
      )
    } finally {
      fs.rmSync(path.join(UPLOADS, "a1b2c3named.pdf"), { force: true })
    }
  })

  it("serves the public share link with the same download headers, and refuses an expired one", async () => {
    const up = await upload(owner, "Public brief.pdf", PDF, { project_id: projectA })
    const link = await api<{ token: string }>("files.php?action=share", { token: owner, body: { id: up.id, days: 1 } })
    expect(link.status).toBe(200)
    const res = await fetch(`${BASE}/files.php?token=${link.json.token}`)
    expect(res.status).toBe(200)
    expect(Buffer.from(await res.arrayBuffer()).equals(PDF)).toBe(true)
    expect(res.headers.get("content-type")).toBe("application/pdf")
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="Public brief\.pdf"/)
    expect(res.headers.get("x-content-type-options")).toBe("nosniff")
    // A link that expires is never cached, so it cannot outlive its expiry.
    expect(res.headers.get("cache-control")).toBe("private, no-store")

    sql(`UPDATE files SET expires_at = NOW() - INTERVAL 1 MINUTE WHERE id = ${up.id}`)
    expect((await fetch(`${BASE}/files.php?token=${link.json.token}`)).status).toBe(404)
  })

  it("lets a browser cache a share link that never expires, as every public Work image uses", async () => {
    const up = await upload(owner, "Work hero.pdf", PDF, { project_id: projectA })
    const token = "c0ffee".padEnd(40, "0")
    sql(`UPDATE files SET share_token = ${q(token)}, expires_at = NULL WHERE id = ${up.id}`)
    const res = await fetch(`${BASE}/files.php?token=${token}`)
    expect(res.status).toBe(200)
    expect(Buffer.from(await res.arrayBuffer()).equals(PDF)).toBe(true)
    expect(res.headers.get("cache-control")).toBe("public, max-age=86400")
    // Everything else about the response is unchanged from the expiring link.
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="Work hero\.pdf"/)
    expect(res.headers.get("x-content-type-options")).toBe("nosniff")
    // The signed-in downloads of the same file stay private.
    expect((await fetchRaw(`files.php?download=${up.id}`, owner)).headers.get("cache-control")).toBe("private, no-store")
    // Giving it an expiry makes the same link uncached again.
    sql(`UPDATE files SET expires_at = NOW() + INTERVAL 1 DAY WHERE id = ${up.id}`)
    expect((await fetch(`${BASE}/files.php?token=${token}`)).headers.get("cache-control")).toBe("private, no-store")
  })

  it("answers another client's file, a hidden file, a deleted file and a missing id with the same 404", async () => {
    const up = await upload(owner, "B plan.pdf", PDF, { project_id: projectB })
    await setShare(up.id, true)
    const hidden = await upload(owner, "A draft.pdf", PDF, { project_id: projectA })
    const deleted = await upload(owner, "A old.pdf", PDF, { project_id: projectA })
    await setShare(deleted.id, true)
    expect((await api(`files.php?action=delete`, { token: owner, body: { id: deleted.id } })).status).toBe(200)

    const answers = await Promise.all(
      [up.id, hidden.id, deleted.id, 99999, 0].map((id) => api(`files.php?action=mine_download&id=${id}`, { token: tokenA })),
    )
    for (const r of answers) {
      expect(r.status).toBe(404)
      expect(r.json).toEqual({ error: "File not found." })
    }
    // A client id in the query is ignored: the token decides.
    const spoof = await api(`files.php?action=mine_download&id=${up.id}&client_id=${clientB}`, { token: tokenA })
    expect(spoof.status).toBe(404)
    expect((await api<ClientFile[]>(`files.php?action=mine&client_id=${clientB}`, { token: tokenA })).json).toEqual([])
    // B, the owner of the file, can download it.
    expect((await fetchRaw(`files.php?action=mine_download&id=${up.id}`, tokenB)).body.equals(PDF)).toBe(true)
  })

  it("never follows a stored path out of the upload directory", async () => {
    fs.mkdirSync(UPLOADS, { recursive: true })
    const link = path.join(UPLOADS, "a1b2c3linked.pdf")
    fs.rmSync(link, { force: true })
    fs.symlinkSync(path.join(WORK_DIR, "config.php"), link)
    // A real file whose name ends in a newline: a `$` anchor would accept it.
    const newline = path.join(UPLOADS, "a1b2c3nl.pdf\n")
    fs.writeFileSync(newline, PDF)
    try {
      const stored = ["../config.php", "..", ".htaccess", "sub/../../config.php", "/etc/passwd", "a1b2c3linked.pdf", "a1b2c3nl.pdf\n", ""]
      for (const [n, s] of stored.entries()) {
        const id = fileRow({ clientId: clientA, stored: s, visible: true })
        const share = (n + 1).toString(16).padStart(40, "a")
        sql(`UPDATE files SET share_token = ${q(share)} WHERE id = ${id}`)
        const routes = [
          [`files.php?action=mine_download&id=${id}`, tokenA],
          [`files.php?download=${id}`, owner],
          [`files.php?token=${share}`, ""],
        ] as const
        for (const [route, token] of routes) {
          const r = await fetchRaw(route, token)
          expect(r.status, `${JSON.stringify(s)} via ${route}`).toBe(404)
          expect(r.body.toString("utf8")).not.toContain(DB_NAME)
          expect(r.headers.get("content-type")).toMatch(/^application\/json/)
        }
      }
    } finally {
      fs.rmSync(link, { force: true })
      fs.rmSync(newline, { force: true })
    }
  })

  it("refuses a client on every staff route and staff on both client routes", async () => {
    const id = fileRow({ clientId: clientA, visible: true })
    const clientCalls = await Promise.all([
      api("files.php", { token: tokenA }),
      api(`files.php?client_id=${clientA}`, { token: tokenA }),
      api(`files.php?download=${id}`, { token: tokenA }),
      api("files.php?action=client_share", { token: tokenA, body: { id, visible: false } }),
      api("files.php?action=share", { token: tokenA, body: { id } }),
      api("files.php?action=delete", { token: tokenA, body: { id } }),
    ])
    for (const r of clientCalls) expect(r.status).toBe(403)
    expect((await upload(tokenA, "x.pdf", PDF)).status).toBe(403)
    expect(one(`SELECT client_visible FROM files WHERE id = ${id}`)).toBe("1")
    expect(one(`SELECT deleted_at IS NULL FROM files WHERE id = ${id}`)).toBe("1")

    for (const token of [owner, employee]) {
      expect((await api("files.php?action=mine", { token })).status).toBe(403)
      expect((await api(`files.php?action=mine_download&id=${id}`, { token })).status).toBe(403)
    }
    expect((await api("files.php?action=mine")).status).toBe(401)

    createUser({ email: "unlinked@example.test", role: "client" })
    const unlinked = await login("unlinked@example.test")
    expect((await api("files.php?action=mine", { token: unlinked })).status).toBe(403)
  })

  it("hides everything from a client whose client record is deleted", async () => {
    fileRow({ clientId: clientA, visible: true })
    sql(`UPDATE clients SET deleted_at = NOW() WHERE id = ${clientA}`)
    expect((await mine()).status).toBe(404)
  })
})

describe("before SQL 18 has run", () => {
  // The ALTER recorded at the foot of server/schema.sql, uncommented.
  const migrate = fs.readFileSync(path.resolve(__dirname, "../../server/schema.sql"), "utf8")
    .match(/-- {3}ALTER TABLE files\n[\s\S]*?ADD COLUMN shared_at[^;]*;/)![0]
    .replace(/^--\s{3}/gm, "")

  afterEach(() => {
    if (one(`SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'files' AND column_name = 'client_visible'`) === "0") {
      sql(migrate)
    }
  })

  it("answers 503 for the client routes and client_share, and keeps every existing files action working", async () => {
    resetDb()
    const clientId = createClient("Synthetic C Ltd")
    createUser({ email: "owner@example.test", role: "super_admin" })
    createUser({ email: "client-c@example.test", role: "client", clientId })
    const owner = await login("owner@example.test")
    const client = await login("client-c@example.test")
    const up = await upload(owner, "Before.pdf", PDF, { client_id: clientId })
    expect(up.status).toBe(201)

    sql("ALTER TABLE files DROP COLUMN client_visible, DROP COLUMN shared_at")
    const list = await api<StaffFile[]>("files.php", { token: owner })
    expect(list.status).toBe(200)
    expect(list.json[0]).toMatchObject({ id: up.id, client_visible: null, shared_at: null })
    const share = await api<StaffFile>("files.php?action=client_share", { token: owner, body: { id: up.id, visible: true } })
    expect(share.status).toBe(503)
    expect(share.json.error).toMatch(/SQL 18/)
    expect((await api("files.php?action=mine", { token: client })).status).toBe(503)
    expect((await api(`files.php?action=mine_download&id=${up.id}`, { token: client })).status).toBe(503)
    expect((await fetchRaw(`files.php?download=${up.id}`, owner)).body.equals(PDF)).toBe(true)
    expect((await api("files.php?action=share", { token: owner, body: { id: up.id } })).status).toBe(200)

    sql(migrate)
    const after = await api<StaffFile[]>("files.php", { token: owner })
    expect(after.json[0]).toMatchObject({ client_visible: false, shared_at: null })
  })
})
