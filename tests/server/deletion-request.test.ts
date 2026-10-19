/**
 * "Ask to delete my data" (support.php?action=deletion_request,
 * docs/PRIVACY-READINESS.md section 7): a client-role user creates one support
 * ticket with fixed text through the existing client ticket path. It must
 * delete nothing, take its client from the token only, ignore anything sent
 * in the body, allow one open request per client, and be refused to staff.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createUser, login, one, resetDb, sql } from "./helpers"

type Reply = { id?: number; subject?: string; error?: string }
const ask = (token: string | undefined, body: unknown = {}) => api<Reply>("support.php?action=deletion_request", { token, body })

/** Counts and checksums of the client data a request must never change. */
function clientData(): string {
  const tables = ["clients", "users", "projects", "invoices", "contracts", "files", "enquiries", "ticket_replies"]
  return tables.map((t) => `${t}=${one(`SELECT COUNT(*) FROM ${t}`)}:${sql(`CHECKSUM TABLE ${t}`)[0][1]}`).join(" ")
}

describe("deletion_request", () => {
  let clientA: number
  let clientB: number
  let tokenA: string
  let tokenA2: string
  let tokenB: string
  let userA: number

  beforeEach(async () => {
    resetDb()
    clientA = createClient("Synthetic A Ltd")
    clientB = createClient("Synthetic B Ltd")
    sql(`INSERT INTO projects (client_id, name) VALUES (${clientA}, 'A site')`)
    sql(`INSERT INTO invoices (client_id, status, issued_at) VALUES (${clientA}, 'paid', CURRENT_DATE)`)
    userA = createUser({ email: "a1@example.test", role: "client", clientId: clientA })
    createUser({ email: "a2@example.test", role: "client", clientId: clientA })
    createUser({ email: "b@example.test", role: "client", clientId: clientB })
    tokenA = await login("a1@example.test")
    tokenA2 = await login("a2@example.test")
    tokenB = await login("b@example.test")
  })

  it("creates one fixed-text ticket for the caller's own client, ignores the body, deletes nothing and audits it", async () => {
    const before = clientData()
    const r = await ask(tokenA, { client_id: clientB, subject: "Something else", body: "<script>x</script>" })
    expect(r.status).toBe(201)
    expect(r.json.subject).toBe("Data deletion request")

    const t = sql(`SELECT client_id, subject, body, status, priority FROM tickets WHERE id = ${r.json.id}`)[0]
    expect(t[0]).toBe(String(clientA))
    expect(t[1]).toBe("Data deletion request")
    expect(t[2]).toMatch(/^Please delete the personal data GAkinz holds about me and my account\./)
    expect(t[2]).toContain("Nothing has been deleted yet")
    expect(t[2]).not.toContain("script")
    expect(t.slice(3)).toEqual(["open", "normal"])
    expect(one(`SELECT COUNT(*) FROM tickets WHERE client_id = ${clientB}`)).toBe("0")
    expect(sql("SELECT user_id, detail FROM audit_log WHERE action = 'ticket_deletion_request'")).toEqual([[String(userA), `#${r.json.id} (client)`]])
    expect(clientData()).toBe(before)

    // The client sees it in their own messages; the other client does not.
    const mine = await api<Array<{ subject: string }>>("support.php", { token: tokenA })
    expect(mine.json.map((x) => x.subject)).toContain("Data deletion request")
    const theirs = await api<Array<{ subject: string }>>("support.php", { token: tokenB })
    expect(theirs.json).toEqual([])
  })

  it("allows one open request per client, across that client's logins, and another once it is resolved", async () => {
    expect((await ask(tokenA)).status).toBe(201)
    const again = await ask(tokenA)
    expect(again.status).toBe(409)
    expect(again.json.error).toBe("You already have a data deletion request open. GAkinz will reply to it.")
    expect((await ask(tokenA2)).status).toBe(409)
    // Another client is not affected.
    expect((await ask(tokenB)).status).toBe(201)
    sql(`UPDATE tickets SET status = 'in_progress' WHERE client_id = ${clientA}`)
    expect((await ask(tokenA)).status).toBe(409)
    sql(`UPDATE tickets SET status = 'resolved' WHERE client_id = ${clientA}`)
    expect((await ask(tokenA)).status).toBe(201)
    expect(one(`SELECT COUNT(*) FROM tickets WHERE client_id = ${clientA}`)).toBe("2")
  })

  it("makes one ticket when several requests arrive at once", async () => {
    const results = await Promise.all([ask(tokenA), ask(tokenA), ask(tokenA2), ask(tokenA)])
    expect(results.filter((r) => r.status === 201)).toHaveLength(1)
    expect(results.filter((r) => r.status === 409)).toHaveLength(3)
    expect(one(`SELECT COUNT(*) FROM tickets WHERE client_id = ${clientA}`)).toBe("1")
  })

  it("is for client accounts only: staff, no token and a client account with no client are refused", async () => {
    createUser({ email: "owner@example.test", role: "super_admin" })
    createUser({ email: "orphan@example.test", role: "client", clientId: null })
    // Staff fall through to the staff branch, which has no such action.
    expect((await ask(await login("owner@example.test"))).status).toBe(405)
    expect((await ask(undefined)).status).toBe(401)
    const orphan = await ask(await login("orphan@example.test"))
    expect(orphan.status).toBe(403)
    expect(orphan.json.error).toBe("Your account is not linked to a client.")
    expect(one("SELECT COUNT(*) FROM tickets")).toBe("0")
    expect(one("SELECT COUNT(*) FROM audit_log WHERE action = 'ticket_deletion_request'")).toBe("0")
  })
})
