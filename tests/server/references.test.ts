/**
 * Work references (SQL 19, server/_reference.php, docs/PRODUCT-SPEC.md 6.1).
 * A new enquiry gets GK-E-YYYY-NNNN and a new project GK-P-YYYY-NNNN, counted
 * per type and per year, unique under parallel creates and never issued
 * twice. The reference is shown to staff, to the visitor once on the contact
 * thank-you, and to a client for their own projects only. It is never a key:
 * no request without staff sign-in finds anything by it.
 */
import fs from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createInvoice, createUser, login, one, q, resetDb, sql } from "./helpers"

type Row = Record<string, unknown>
type Created = { id?: number; reference?: string | null; error?: string }

const SERVER = path.resolve(__dirname, "../../server")
let owner: string
let year: number

const ref = (kind: "E" | "P", n: number, y = year) => `GK-${kind}-${y}-${String(n).padStart(4, "0")}`
const count = (from: string) => Number(one(`SELECT COUNT(*) FROM ${from}`))

function enquire(name: string, company = "") {
  return api<Created>("contact.php", {
    body: { name, email: `${name.toLowerCase().replace(/\W/g, "")}@example.test`, company, message: "We need a new website for the shop, please." },
  })
}

function createProject(name: string, extra: Row = {}, token = owner) {
  return api<Created>("projects.php?action=create", { body: { name, ...extra }, token })
}

/** A sent quote with one line, ready to accept. */
function sentQuote(clientId: number, title: string): number {
  sql(`INSERT INTO proposals (client_id, title, status) VALUES (${clientId}, ${q(title)}, 'sent')`)
  const id = Number(one("SELECT MAX(id) FROM proposals"))
  sql(`INSERT INTO proposal_items (proposal_id, description, qty, unit_price) VALUES (${id}, 'Build', 1, 1000)`)
  return id
}

function accept(id: number) {
  return api<{ project_id?: number; project_reference?: string | null; error?: string }>("proposals.php?action=accept", {
    body: { id, method: "email", reference: "Email from the client", received_on: one("SELECT CURRENT_DATE") },
    token: owner,
  })
}

beforeEach(async () => {
  resetDb()
  createUser({ email: "owner@example.test", role: "super_admin" })
  owner = await login("owner@example.test")
  year = Number(one("SELECT YEAR(CURRENT_TIMESTAMP)"))
})

describe("format and sequence", () => {
  it("numbers enquiries and projects separately, from 0001, in the year they were created", async () => {
    const e1 = await enquire("Ada Lovelace", "Engines Ltd")
    const e2 = await enquire("Grace Hopper")
    expect(e1.status).toBe(201)
    expect(e1.json.reference).toBe(ref("E", 1))
    expect(e2.json.reference).toBe(ref("E", 2))
    expect(e1.json.reference).toMatch(/^GK-E-\d{4}-\d{4}$/)

    const p1 = await createProject("Engines website")
    expect(p1.status).toBe(201)
    expect(p1.json.reference).toBe(ref("P", 1))

    // Every way a project is created draws from the same project sequence.
    const p2 = await createProject("Templated build", { template: "business_website" })
    expect(p2.status).toBe(201)
    expect(p2.json.reference).toBe(ref("P", 2))

    const clientId = createClient("Engines Ltd")
    const accepted = await accept(sentQuote(clientId, "Shop build"))
    expect(accepted.status).toBe(200)
    expect(accepted.json.project_reference).toBe(ref("P", 3))

    sql(`INSERT INTO tickets (client_id, subject, body) VALUES (${clientId}, 'Printer offline', 'Synthetic body')`)
    const logged = await api<{ project_id: number }>("support.php?action=log_time", {
      body: { id: Number(one("SELECT MAX(id) FROM tickets")), minutes: 30 },
      token: owner,
    })
    expect(logged.status).toBe(201)
    expect(one(`SELECT reference FROM projects WHERE id = ${logged.json.project_id}`)).toBe(ref("P", 4))

    expect(sql("SELECT reference FROM enquiries ORDER BY id").map((r) => r[0])).toEqual([ref("E", 1), ref("E", 2)])
    expect(sql("SELECT kind, ref_year, last_n FROM reference_counters WHERE ref_year > 0 ORDER BY kind")).toEqual([
      ["E", String(year), "2"],
      ["P", String(year), "4"],
    ])
  })

  it("keeps each year's count apart", async () => {
    sql(`INSERT INTO reference_counters (kind, ref_year, last_n) VALUES ('E', ${year - 1}, 41), ('P', ${year - 1}, 17)`)
    expect((await enquire("Alan Turing")).json.reference).toBe(ref("E", 1))
    expect((await createProject("Bombe")).json.reference).toBe(ref("P", 1))
    expect(one(`SELECT last_n FROM reference_counters WHERE kind = 'E' AND ref_year = ${year - 1}`)).toBe("41")
  })

  it("never issues a number twice, even after the record is deleted", async () => {
    await createProject("First")
    const second = await createProject("Second")
    sql(`DELETE FROM projects WHERE id = ${second.json.id}`)
    const third = await createProject("Third")
    expect(third.json.reference).toBe(ref("P", 3))

    const e = await enquire("Margaret Hamilton")
    sql(`UPDATE enquiries SET deleted_at = NOW() WHERE id = ${e.json.id}`)
    expect((await enquire("Katherine Johnson")).json.reference).toBe(ref("E", 2))
  })

  it("takes the next number when one is already in use, and grows past 9999", async () => {
    // A row holding the number the counter will issue next, as a late backfill could leave.
    sql(`INSERT INTO enquiries (name, email, message, reference) VALUES ('Old', 'old@example.test', 'Old enquiry text', ${q(ref("E", 1))})`)
    const r = await enquire("Hedy Lamarr")
    expect(r.status).toBe(201)
    expect(r.json.reference).toBe(ref("E", 2))

    sql(`INSERT INTO reference_counters (kind, ref_year, last_n) VALUES ('P', ${year}, 9999)`)
    expect((await createProject("Big year")).json.reference).toBe(`GK-P-${year}-10000`)
  })
})

describe("under concurrency", () => {
  it("gives parallel project creates distinct, consecutive references, the year's first included", async () => {
    // Half plain creates (their own short transaction), half from a template
    // (inside the create's transaction), all racing for the year's first row.
    const replies = await Promise.all(
      Array.from({ length: 12 }, (_, i) => createProject(`Parallel ${i}`, i % 2 ? { template: "it_consultancy" } : {})),
    )
    expect(replies.every((r) => r.status === 201)).toBe(true)
    const refs = replies.map((r) => r.json.reference as string)
    expect(new Set(refs).size).toBe(12)
    expect([...refs].sort()).toEqual(Array.from({ length: 12 }, (_, i) => ref("P", i + 1)))
    expect(count("projects WHERE reference IS NULL")).toBe(0)
    expect(one(`SELECT last_n FROM reference_counters WHERE kind = 'P' AND ref_year = ${year}`)).toBe("12")
  })

  it("gives parallel public enquiries distinct references", async () => {
    const replies = await Promise.all(["Ann", "Ben", "Cas", "Dee", "Eve"].map((n) => enquire(`${n} Parallel`)))
    expect(replies.map((r) => r.status)).toEqual([201, 201, 201, 201, 201])
    expect(replies.map((r) => r.json.reference).sort()).toEqual([1, 2, 3, 4, 5].map((n) => ref("E", n)))
  })
})

describe("where a reference is shown", () => {
  it("is in the staff lists, the quote and the invoice PDF data", async () => {
    const e = await enquire("Ada Lovelace", "Engines Ltd")
    const leads = await api<Row[]>("leads.php", { token: owner })
    expect(leads.json.find((l) => l.id === e.json.id)?.reference).toBe(ref("E", 1))

    const clientId = createClient("Engines Ltd")
    const quote = sentQuote(clientId, "Shop build")
    const before = await api<Row>(`proposals.php?id=${quote}`, { token: owner })
    expect(before.json.project_reference).toBeNull()

    sql(`UPDATE proposals SET share_token = ${q("a".repeat(40))} WHERE id = ${quote}`)
    const shared = await api<Row>(`proposals.php?token=${"a".repeat(40)}`)
    expect(shared.status).toBe(200)
    expect(shared.json.project_reference).toBeNull()

    const accepted = await accept(quote)
    const projectRef = ref("P", 1)
    expect(accepted.json.project_reference).toBe(projectRef)

    const projects = await api<Row[]>("projects.php", { token: owner })
    expect(projects.json[0]).toMatchObject({ id: accepted.json.project_id, reference: projectRef })
    const list = await api<Row[]>("proposals.php", { token: owner })
    expect(list.json[0]).toMatchObject({ id: quote, project_reference: projectRef })
    expect((await api<Row>(`proposals.php?id=${quote}`, { token: owner })).json.project_reference).toBe(projectRef)
    // The agreed quote, opened from its share link, names the work it became.
    expect((await api<Row>(`proposals.php?token=${"a".repeat(40)}`)).json.project_reference).toBe(projectRef)

    const invoiceId = Number(one(`SELECT MIN(id) FROM invoices WHERE project_id = ${accepted.json.project_id}`))
    const inv = await api<Row>(`invoices.php?id=${invoiceId}`, { token: owner })
    expect(inv.json.project_reference).toBe(projectRef)
    const loose = createInvoice(clientId, [[1, 50]])
    expect((await api<Row>(`invoices.php?id=${loose}`, { token: owner })).json.project_reference).toBeNull()
  })

  it("shows a client their own project references only", async () => {
    const mine = createClient("Mine Ltd")
    const theirs = createClient("Theirs Ltd")
    const own = await createProject("Our shop", { client_id: mine })
    const other = await createProject("Secret rebuild", { client_id: theirs })
    // An invoice wrongly linked to the other client's project must not leak its reference.
    const stray = createInvoice(mine, [[1, 10]])
    sql(`UPDATE invoices SET project_id = ${other.json.id} WHERE id = ${stray}`)
    const ownInvoice = createInvoice(mine, [[1, 20]])
    sql(`UPDATE invoices SET project_id = ${own.json.id} WHERE id = ${ownInvoice}`)

    createUser({ email: "client@example.test", role: "client", clientId: mine })
    const client = await login("client@example.test")
    // The client_id parameter is ignored for a client; their own portal comes back.
    const r = await api<{ projects: Row[]; invoices: Row[] }>(`portal.php?client_id=${theirs}&reference=${other.json.reference}`, { token: client })
    expect(r.status).toBe(200)
    expect(r.json.projects).toEqual([expect.objectContaining({ id: own.json.id, reference: own.json.reference })])
    expect(r.json.invoices.find((i) => i.id === ownInvoice)?.project_reference).toBe(own.json.reference)
    expect(r.json.invoices.find((i) => i.id === stray)?.project_reference).toBeNull()
    const text = JSON.stringify(r.json)
    expect(text).not.toContain(other.json.reference as string)
    expect(text).not.toContain("Secret rebuild")
  })
})

describe("staff search by reference", () => {
  it("finds a project or enquiry by its reference, within each role's types", async () => {
    const e = await enquire("Ada Lovelace", "Engines Ltd")
    const p = await createProject("Engines website")
    const byProject = await api<{ results: Row[] }>(`search.php?q=${p.json.reference}`, { token: owner })
    expect(byProject.status).toBe(200)
    expect(byProject.json.results).toEqual([
      expect.objectContaining({ type: "project", id: p.json.id, secondary: expect.stringContaining(p.json.reference as string) }),
    ])
    const byEnquiry = await api<{ results: Row[] }>(`search.php?q=${e.json.reference}`, { token: owner })
    expect(byEnquiry.json.results).toEqual([expect.objectContaining({ type: "enquiry", id: e.json.id })])

    // An employee reads projects but not enquiries, so a reference does not widen that.
    createUser({ email: "staff@example.test", role: "employee" })
    const staff = await login("staff@example.test")
    const asEmployee = await api<{ types: Row; results: Row[] }>(`search.php?q=${e.json.reference}`, { token: staff })
    expect(asEmployee.status).toBe(200)
    expect(asEmployee.json.types.enquiry).toBeUndefined()
    expect(asEmployee.json.results).toEqual([])
  })
})

describe("a reference is never a key", () => {
  it("finds nothing for a request without staff sign-in, however the reference is sent", async () => {
    const e = await enquire("Ada Lovelace", "Engines Ltd")
    const clientId = createClient("Engines Ltd")
    const p = await createProject("Engines website", { client_id: clientId })
    createInvoice(clientId, [[1, 99]])
    const secrets = [e.json.reference as string, p.json.reference as string, "Ada Lovelace", "Engines", "Engines website"]

    createUser({ email: "client@example.test", role: "client", clientId: createClient("Other Co") })
    const outsider = await login("client@example.test")

    for (const r of [e.json.reference as string, p.json.reference as string]) {
      const probes: Array<[string, string | undefined]> = [
        [`leads.php?reference=${r}`, undefined],
        [`projects.php?reference=${r}`, undefined],
        [`search.php?q=${r}`, undefined],
        [`portal.php?reference=${r}`, undefined],
        [`invoices.php?reference=${r}`, undefined],
        [`proposals.php?reference=${r}`, undefined],
        [`proposals.php?token=${r}`, undefined],
        [`support.php?reference=${r}`, undefined],
        [`contact.php?reference=${r}`, undefined],
        [`leads.php?reference=${r}`, outsider],
        [`projects.php?reference=${r}`, outsider],
        [`search.php?q=${r}`, outsider],
        [`invoices.php?reference=${r}`, outsider],
      ]
      for (const [url, token] of probes) {
        const res = await api(url, { token })
        expect(res.status, url).toBeGreaterThanOrEqual(400)
        const body = JSON.stringify(res.json)
        for (const s of secrets) expect(body, `${url} leaked ${s}`).not.toContain(s)
      }
      // The outsider's own portal answers, with nothing of the other client in it.
      const portal = await api(`portal.php?reference=${r}`, { token: outsider })
      expect(portal.status).toBe(200)
      for (const s of secrets) expect(JSON.stringify(portal.json)).not.toContain(s)
    }
  })

  it("is read from no request parameter by any endpoint", () => {
    const files = fs.readdirSync(SERVER).filter((f) => f.endsWith(".php"))
    expect(files.length).toBeGreaterThan(40)
    for (const f of files) {
      const src = fs.readFileSync(path.join(SERVER, f), "utf8")
      expect(src, f).not.toMatch(/\$_(GET|POST|REQUEST|COOKIE)\[\s*['"](reference|ref|project_reference)['"]/)
    }
  })
})

describe("before SQL 19 has run", () => {
  // The SQL 19 block at the foot of server/schema.sql, its commented ALTERs and
  // backfill uncommented, run as the operator would.
  const block = fs.readFileSync(path.join(SERVER, "schema.sql"), "utf8")
    .match(/-- 2026-10-19 · SQL 19 ·[\s\S]*$/)![0]
    .replace(/^-- {3}/gm, "")

  it("creates enquiries and projects without one, then the backfill numbers every row per year", async () => {
    sql("ALTER TABLE enquiries DROP COLUMN reference")
    sql("ALTER TABLE projects DROP COLUMN reference")
    sql("DROP TABLE reference_counters")
    try {
      // Older rows: two enquiries and a project from last year.
      sql(`INSERT INTO enquiries (name, email, message, created_at) VALUES
           ('Old one', 'o1@example.test', 'Old enquiry text', '${year - 1}-03-01 10:00:00'),
           ('Old two', 'o2@example.test', 'Old enquiry text', '${year - 1}-11-30 10:00:00')`)
      sql(`INSERT INTO projects (name, created_at) VALUES ('Old project', '${year - 1}-06-01 10:00:00')`)

      const e = await enquire("Ada Lovelace", "Engines Ltd")
      expect(e.status).toBe(201)
      expect(e.json.reference).toBeNull()
      const p = await createProject("Engines website")
      expect(p.status).toBe(201)
      expect(p.json.reference).toBeNull()
      const t = await createProject("Templated", { template: "business_website" })
      expect(t.status).toBe(201)
      expect(t.json.reference).toBeNull()

      const leads = await api<Row[]>("leads.php", { token: owner })
      expect(leads.status).toBe(200)
      expect(leads.json.find((l) => l.id === e.json.id)).toMatchObject({ name: "Ada Lovelace", reference: null })
      const projects = await api<Row[]>("projects.php", { token: owner })
      expect(projects.status).toBe(200)
      expect(projects.json.every((r) => r.reference === null)).toBe(true)

      const search = await api<{ types: Row; results: Row[] }>("search.php?q=Engines", { token: owner })
      expect(search.json.types).toMatchObject({ project: "ok", enquiry: "ok" })
      expect(search.json.results.map((r) => r.type).sort()).toEqual(["enquiry", "project"])

      const clientId = createClient("Engines Ltd")
      const accepted = await accept(sentQuote(clientId, "Shop build"))
      expect(accepted.status).toBe(200)
      expect(accepted.json.project_reference).toBeNull()
      const portal = await api<{ projects: Row[] }>(`portal.php?client_id=${clientId}`, { token: owner })
      expect(portal.status).toBe(200)
      expect(portal.json.projects[0]).toMatchObject({ name: "Shop build", reference: null })
    } finally {
      sql(block)
    }

    // Backfill: per year, in id order.
    expect(sql("SELECT name, reference FROM enquiries ORDER BY id")).toEqual([
      ["Old one", ref("E", 1, year - 1)],
      ["Old two", ref("E", 2, year - 1)],
      ["Ada Lovelace", ref("E", 1)],
    ])
    expect(sql("SELECT name, reference FROM projects ORDER BY id")).toEqual([
      ["Old project", ref("P", 1, year - 1)],
      ["Engines website", ref("P", 1)],
      ["Templated", ref("P", 2)],
      ["Shop build", ref("P", 3)],
    ])
    expect(sql("SELECT kind, ref_year, last_n FROM reference_counters WHERE ref_year > 0 ORDER BY kind, ref_year")).toEqual([
      ["E", String(year - 1), "2"],
      ["E", String(year), "1"],
      ["P", String(year - 1), "1"],
      ["P", String(year), "3"],
    ])
    // New records carry on after the backfilled numbers.
    expect((await enquire("Grace Hopper")).json.reference).toBe(ref("E", 2))
    expect((await createProject("After the update")).json.reference).toBe(ref("P", 4))
  })
})
