/**
 * Record search (server/search.php). One staff GET across clients, projects,
 * enquiries, invoices and quotes. The query is a literal substring of 2 to 80
 * characters, deleted rows never match, each type mirrors the role constant of
 * the endpoint that owns it, at most 8 results come back per type, and a
 * result never carries a note, a message body or an amount.
 *
 * Every row is synthetic.
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { api, createUser, login, one, q, resetDb, sql } from "./helpers"

type Result = { type: string; id: number; title: string; secondary: string; route: string }
type Search = { query: string; types: Record<string, string>; results: Result[]; error?: string }

function search(token: string, query: string) {
  return api<Search>(`search.php?q=${encodeURIComponent(query)}`, { token })
}

function lastId(table: string): number {
  return Number(one(`SELECT MAX(id) FROM ${table}`))
}

function client(company: string, contact: string | null = null, email: string | null = null, deleted = false): number {
  sql(
    `INSERT INTO clients (company, contact_name, email, notes, retainer_amount, deleted_at)
     VALUES (${q(company)}, ${q(contact)}, ${q(email)}, 'Private client note', 450, ${deleted ? "NOW()" : "NULL"})`,
  )
  return lastId("clients")
}

function project(name: string, clientId: number | null = null, deleted = false): number {
  sql(`INSERT INTO projects (client_id, name, status, deleted_at) VALUES (${q(clientId)}, ${q(name)}, 'in_progress', ${deleted ? "NOW()" : "NULL"})`)
  return lastId("projects")
}

function enquiry(name: string, company: string | null, email: string, deleted = false): number {
  sql(
    `INSERT INTO enquiries (name, company, email, budget, message, deleted_at)
     VALUES (${q(name)}, ${q(company)}, ${q(email)}, '£9,000', 'Secret enquiry message body', ${deleted ? "NOW()" : "NULL"})`,
  )
  return lastId("enquiries")
}

function invoice(number: string, clientId: number | null, deleted = false): number {
  sql(
    `INSERT INTO invoices (number, client_id, status, notes, issued_at, paid_amount_pence, deleted_at)
     VALUES (${q(number)}, ${q(clientId)}, 'sent', 'Private invoice note', CURRENT_DATE, 123456, ${deleted ? "NOW()" : "NULL"})`,
  )
  const id = lastId("invoices")
  sql(`INSERT INTO invoice_items (invoice_id, description, qty, unit_price) VALUES (${id}, 'Line', 1, 777.77)`)
  return id
}

function quote(title: string, clientId: number | null, deleted = false): number {
  sql(
    `INSERT INTO proposals (client_id, title, status, notes, deleted_at)
     VALUES (${q(clientId)}, ${q(title)}, 'sent', 'Private quote note', ${deleted ? "NOW()" : "NULL"})`,
  )
  const id = lastId("proposals")
  sql(`INSERT INTO proposal_items (proposal_id, description, qty, unit_price) VALUES (${id}, 'Line', 1, 888.88)`)
  return id
}

const of = (r: Search, type: string) => r.results.filter((x) => x.type === type)
const idsOf = (r: Search, type: string) => of(r, type).map((x) => x.id)

async function tokenFor(role: string): Promise<string> {
  const email = `${role.replace(/_/g, "")}@example.test`
  createUser({ email, role })
  return login(email)
}

describe("search.php record search", () => {
  let owner: string

  beforeEach(async () => {
    resetDb()
    owner = await tokenFor("super_admin")
  })

  it("finds each type by its own fields and routes to the screen that holds it", async () => {
    const byCompany = client("Harbour Bakery Ltd", "Ann Lee", "ann@harbour.example")
    const byContact = client("Other Co", "Bea Harbourne", "bea@other.example")
    const byEmail = client("Third Co", "Cy Doe", "cy@harbourmail.example")
    client("Unrelated Ltd", "Dee Smith", "dee@unrelated.example")
    const proj = project("Harbour website rebuild", byCompany)
    const lead = enquiry("Eve Stone", "Harbour Fish", "eve@fish.example")
    const leadByEmail = enquiry("Finn Hall", null, "finn@harbour-hq.example")
    const inv = invoice("GK-INV-0042", byCompany)
    const qt = quote("Harbour care plan", byCompany)

    const r = await search(owner, "harbour")
    expect(r.status).toBe(200)
    expect(r.json.query).toBe("harbour")
    expect(r.json.types).toEqual({ client: "ok", project: "ok", enquiry: "ok", invoice: "ok", quote: "ok" })
    expect(idsOf(r.json, "client").sort()).toEqual([byCompany, byContact, byEmail].sort())
    expect(idsOf(r.json, "project")).toEqual([proj])
    expect(idsOf(r.json, "enquiry").sort()).toEqual([lead, leadByEmail].sort())
    expect(idsOf(r.json, "quote")).toEqual([qt])
    // Invoices match on the number only, never on the client's company.
    expect(idsOf(r.json, "invoice")).toEqual([])

    expect(of(r.json, "client").find((x) => x.id === byCompany)).toEqual({
      type: "client", id: byCompany, title: "Harbour Bakery Ltd", secondary: "Ann Lee, ann@harbour.example", route: `/app/clients?client=${byCompany}`,
    })
    expect(of(r.json, "project")[0]).toEqual({
      type: "project", id: proj, title: "Harbour website rebuild", secondary: "Harbour Bakery Ltd, in progress",
      route: `/app/projects?project=${proj}`,
    })
    expect(of(r.json, "enquiry").find((x) => x.id === lead)).toMatchObject({
      title: "Eve Stone, Harbour Fish", secondary: "eve@fish.example, new", route: `/app/leads?enquiry=${lead}`,
    })
    expect(of(r.json, "quote")[0]).toMatchObject({ title: "Harbour care plan", secondary: "Harbour Bakery Ltd, sent", route: "/app/proposals" })

    const byNumber = await search(owner, "inv-0042")
    expect(of(byNumber.json, "invoice")).toEqual([
      { type: "invoice", id: inv, title: "GK-INV-0042", secondary: "Harbour Bakery Ltd, sent", route: `/app/invoicing?invoice=${inv}` },
    ])
  })

  it("treats % and _ in the query as literal characters, not wildcards", async () => {
    const percent = client("100% Organic Ltd")
    client("100 Organic Ltd")
    client("1000 Things")
    const underscore = client("Snake_Case Studio")
    client("SnakeXCase Studio")
    const slash = client("Back\\slash Co")
    client("Backslash Co")

    const p = await search(owner, "0%")
    expect(p.status).toBe(200)
    expect(idsOf(p.json, "client")).toEqual([percent])

    const u = await search(owner, "e_c")
    expect(idsOf(u.json, "client")).toEqual([underscore])

    const s = await search(owner, "k\\s")
    expect(idsOf(s.json, "client")).toEqual([slash])

    // `!` is the escape character, so a typed `!` is itself escaped.
    const bang = client("Wow! Studio")
    client("Wowx Studio")
    const b = await search(owner, "w!")
    expect(idsOf(b.json, "client")).toEqual([bang])
    const bb = await search(owner, "!%")
    expect(bb.json.results).toEqual([])

    // A bare wildcard query matches nothing rather than everything.
    const all = await search(owner, "%%")
    expect(all.status).toBe(200)
    expect(all.json.results).toEqual([])
  })

  it("refuses a query shorter than 2 or longer than 80 characters, after trimming", async () => {
    client("Ab Company")
    for (const bad of ["", "a", "  a  "]) {
      const r = await search(owner, bad)
      expect(r.status, JSON.stringify(bad)).toBe(400)
      expect(r.json.error).toMatch(/at least 2/)
    }
    const long = await search(owner, "x".repeat(81))
    expect(long.status).toBe(400)
    expect(long.json.error).toMatch(/80 characters or fewer/)

    expect((await search(owner, "ab")).status).toBe(200)
    expect((await search(owner, "x".repeat(80))).status).toBe(200)
    // Multibyte characters count as one each.
    expect((await search(owner, "é".repeat(80))).status).toBe(200)
    // A query that is not a plain string is refused, not an error.
    const arr = await api<Search>("search.php?q[]=ab", { token: owner })
    expect(arr.status).toBe(400)
  })

  it("matches literally under NO_BACKSLASH_ESCAPES too, using the pattern search.php binds", () => {
    // PHP opens its own connection per request, so the mode is set on a
    // direct session instead, with the exact pattern from server/_like.php
    // and the exact clause search.php appends.
    const likePhp = path.resolve(__dirname, "../../server/_like.php")
    const php = (code: string, typed = "") => {
      const r = spawnSync("php", ["-r", `require $argv[1]; ${code}`, "--", likePhp, typed], { encoding: "utf8" })
      if (r.status !== 0) throw new Error(r.stderr)
      return r.stdout
    }
    const clause = php("echo LIKE_CONTAINS_SQL;")
    expect(clause).toBe(" LIKE ? ESCAPE '!'")
    const hex = (v: string) => `CONVERT(X'${Buffer.from(v, "utf8").toString("hex")}' USING utf8mb4)`
    const matches = (candidate: string, typed: string) =>
      one(
        `SET SESSION sql_mode = CONCAT(@@SESSION.sql_mode, ',NO_BACKSLASH_ESCAPES');
         SELECT ${hex(candidate)}${clause.replace("?", hex(php("echo like_contains($argv[2]);", typed)))}`,
      )
    expect(one(`SET SESSION sql_mode = CONCAT(@@SESSION.sql_mode, ',NO_BACKSLASH_ESCAPES'); SELECT @@SESSION.sql_mode`)).toContain(
      "NO_BACKSLASH_ESCAPES",
    )
    expect(matches("100% Organic", "0%")).toBe("1")
    expect(matches("1000 Organic", "0%")).toBe("0")
    expect(matches("Snake_Case", "e_c")).toBe("1")
    expect(matches("SnakeXCase", "e_c")).toBe("0")
    expect(matches("Back\\slash", "k\\s")).toBe("1")
    expect(matches("Backslash", "k\\s")).toBe("0")
    expect(matches("Wow! Studio", "w!")).toBe("1")
    expect(matches("Wowx Studio", "w!")).toBe("0")
  })

  it("refuses search text that is not valid UTF-8", async () => {
    const r = await api<Search>("search.php?q=%C3%28%C3%28", { token: owner })
    expect(r.status).toBe(400)
    expect(r.json.error).toMatch(/UTF-8/)
  })

  it("blanks the company of a deleted client on a project or invoice", async () => {
    const gone = client("Vanished Client Ltd", null, null, true)
    const proj = project("Orphan build", gone)
    const inv = invoice("GK-ORPHAN-1", gone)
    const r = await search(owner, "orphan")
    expect(of(r.json, "project")).toEqual([
      { type: "project", id: proj, title: "Orphan build", secondary: "in progress", route: `/app/projects?project=${proj}` },
    ])
    expect(of(r.json, "invoice")).toEqual([
      { type: "invoice", id: inv, title: "GK-ORPHAN-1", secondary: "sent", route: `/app/invoicing?invoice=${inv}` },
    ])
    expect(JSON.stringify(r.json)).not.toContain("Vanished")
  })

  it("marks one failing type unavailable while the others still return", async () => {
    const c = client("Outage Co")
    quote("Outage quote", c)
    sql("RENAME TABLE proposals TO proposals_hidden")
    try {
      const r = await search(owner, "outage")
      expect(r.status).toBe(200)
      expect(r.json.types).toEqual({ client: "ok", project: "ok", enquiry: "ok", invoice: "ok", quote: "unavailable" })
      expect(r.json.results.map((x) => [x.type, x.id])).toEqual([["client", c]])
    } finally {
      sql("RENAME TABLE proposals_hidden TO proposals")
    }
    expect(of((await search(owner, "outage")).json, "quote")).toHaveLength(1)
  })

  it("never returns a deleted row of any type", async () => {
    const live = client("Deletion Test Live")
    const dead = client("Deletion Test Gone", null, null, true)
    project("Deletion Test project gone", live, true)
    enquiry("Deletion Test person", null, "gone@example.test", true)
    invoice("GK-DELETION-1", live, true)
    quote("Deletion Test quote gone", live, true)

    const r = await search(owner, "deletion")
    expect(r.status).toBe(200)
    expect(r.json.results.map((x) => [x.type, x.id])).toEqual([["client", live]])
    expect(r.json.results.some((x) => x.id === dead && x.type === "client")).toBe(false)
  })

  it("refuses a client login, a trainer and a request with no token", async () => {
    const own = client("Portal Owner Ltd")
    createUser({ email: "portal@example.test", role: "client", clientId: own })
    const portal = await login("portal@example.test")
    const r = await search(portal, "portal")
    expect(r.status).toBe(403)
    expect(r.json.results).toBeUndefined()

    const trainer = await tokenFor("trainer")
    expect((await search(trainer, "portal")).status).toBe(403)

    expect((await api("search.php?q=portal")).status).toBe(401)
    expect((await api("search.php?q=portal", { token: owner, method: "POST", body: {} })).status).toBe(405)
  })

  it("gives each role only the types its source endpoint lets it read", async () => {
    const c = client("Gating Co")
    project("Gating project", c)
    enquiry("Gating person", null, "gating@example.test")
    invoice("GK-GATING-1", c)
    quote("Gating quote", c)

    const expected: Record<string, string[]> = {
      super_admin: ["client", "project", "enquiry", "invoice", "quote"],
      admin: ["client", "project", "enquiry", "invoice", "quote"],
      manager: ["client", "project", "enquiry", "invoice", "quote"],
      editor: ["client", "project", "enquiry", "quote"],
      employee: ["project"],
    }
    for (const [role, types] of Object.entries(expected)) {
      const token = role === "super_admin" ? owner : await tokenFor(role)
      const r = await search(token, "gating")
      expect(r.status, role).toBe(200)
      expect(Object.keys(r.json.types).sort(), role).toEqual([...types].sort())
      expect([...new Set(r.json.results.map((x) => x.type))].sort(), role).toEqual([...types].sort())
    }
  })

  it("returns at most 8 results per type, newest first", async () => {
    const made: number[] = []
    for (let i = 1; i <= 11; i++) made.push(client(`Capped Client ${i}`))
    for (let i = 1; i <= 10; i++) project(`Capped project ${i}`)
    for (let i = 1; i <= 3; i++) quote(`Capped quote ${i}`, null)

    const r = await search(owner, "capped")
    expect(idsOf(r.json, "client")).toEqual(made.slice(-8).reverse())
    expect(of(r.json, "project")).toHaveLength(8)
    expect(of(r.json, "quote")).toHaveLength(3)
  })

  it("never carries a note, a message body, a budget or an amount", async () => {
    const c = client("Sensitive Co", "Sam Sensitive", "sam@sensitive.example")
    project("Sensitive build", c)
    enquiry("Sensitive person", "Sensitive Co", "lead@sensitive.example")
    invoice("GK-SENSITIVE-1", c)
    quote("Sensitive quote", c)

    const r = await search(owner, "sensitive")
    expect(new Set(r.json.results.map((x) => x.type))).toEqual(new Set(["client", "project", "enquiry", "invoice", "quote"]))
    for (const x of r.json.results) {
      expect(Object.keys(x).sort()).toEqual(["id", "route", "secondary", "title", "type"])
    }
    const text = JSON.stringify(r.json)
    for (const secret of ["Private", "Secret enquiry", "9,000", "450", "1234", "777", "888", "£"]) {
      expect(text, secret).not.toContain(secret)
    }
  })
})
