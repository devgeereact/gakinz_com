/**
 * K-039 (acceptance scenarios J04 and J05 in qa/TEST-PLAN.md): a `client`-role user can message the
 * owner through support tickets, and can only ever see or touch tickets that
 * belong to their own client. The client id always comes from the token, never
 * from the request. Staff behaviour is unchanged.
 *
 * ticket_replies has no internal-note flag: every reply is client-facing by
 * design, so there is no hidden note for these tests to keep back.
 */
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createUser, login, one, q, resetDb, sql } from "./helpers"

type ClientTicket = {
  id: number
  subject: string
  body: string | null
  status: string
  replies: Array<{ id: number; body: string; from_client: boolean }>
  [k: string]: unknown
}

function createTicket(clientId: number | null, subject: string, status = "open", priority = "normal"): number {
  sql(`INSERT INTO tickets (client_id, subject, body, status, priority) VALUES (${q(clientId)}, ${q(subject)}, 'Synthetic body', ${q(status)}, ${q(priority)})`)
  return Number(one(`SELECT MAX(id) FROM tickets`))
}

function addReply(ticketId: number, userId: number, body: string): void {
  sql(`INSERT INTO ticket_replies (ticket_id, user_id, body) VALUES (${ticketId}, ${userId}, ${q(body)})`)
}

const raw0 = (v: unknown) => JSON.stringify(v)
const count = (where: string) => one(`SELECT COUNT(*) FROM ${where}`)

describe("support tickets for a client-role user", () => {
  let clientA: number
  let clientB: number
  let owner: number
  let userA: number
  let tokenA: string
  let tokenOwner: string
  let ticketA: number
  let ticketB: number

  beforeEach(async () => {
    resetDb()
    clientA = createClient("Synthetic A Ltd")
    clientB = createClient("Synthetic B Ltd")
    owner = createUser({ email: "owner@example.test", role: "super_admin" })
    userA = createUser({ email: "client-a@example.test", role: "client", clientId: clientA })
    const userB = createUser({ email: "client-b@example.test", role: "client", clientId: clientB })
    ticketA = createTicket(clientA, "A only: website copy")
    ticketB = createTicket(clientB, "B only: secret launch date")
    addReply(ticketA, owner, "Owner reply to A")
    addReply(ticketB, owner, "Owner reply to B")
    addReply(ticketB, userB, "B's own reply")
    tokenA = await login("client-a@example.test")
    tokenOwner = await login("owner@example.test")
  })

  it("lists only the client's own tickets, with their replies", async () => {
    createTicket(null, "Unlinked internal ticket")
    const deleted = createTicket(clientA, "A deleted ticket")
    sql(`UPDATE tickets SET deleted_at = NOW() WHERE id = ${deleted}`)

    const r = await api<ClientTicket[]>("support.php", { token: tokenA })
    expect(r.status).toBe(200)
    expect(r.json.map((t) => t.id)).toEqual([ticketA])
    expect(r.json[0].replies.map((x) => x.body)).toEqual(["Owner reply to A"])
    expect(r.json[0].replies[0].from_client).toBe(false)
    // A staff reply is shown as the studio, never the staff member's name.
    expect((r.json[0].replies[0] as { author?: string }).author).toBe("GAkinz")
    expect(raw0(r.json)).not.toContain('"author":"owner"')
    const raw = JSON.stringify(r.json)
    expect(raw).not.toContain("B only")
    expect(raw).not.toContain("reply to B")
    expect(raw).not.toContain("Unlinked")
    // Internal fields stay off the client view.
    expect(r.json[0]).not.toHaveProperty("assignee_id")
    expect(r.json[0]).not.toHaveProperty("assignee_name")
  })

  it("ignores a client_id query parameter when listing", async () => {
    const r = await api<ClientTicket[]>(`support.php?client_id=${clientB}`, { token: tokenA })
    expect(r.status).toBe(200)
    expect(r.json.map((t) => t.id)).toEqual([ticketA])
  })

  it("reads its own ticket by id", async () => {
    const r = await api<ClientTicket>(`support.php?id=${ticketA}`, { token: tokenA })
    expect(r.status).toBe(200)
    expect(r.json.id).toBe(ticketA)
    expect(r.json.replies).toHaveLength(1)
  })

  it("cannot read another client's ticket by id", async () => {
    const r = await api(`support.php?id=${ticketB}`, { token: tokenA })
    expect([403, 404]).toContain(r.status)
    expect(JSON.stringify(r.json)).not.toContain("B only")
  })

  it("cannot reply to another client's ticket, and nothing is written", async () => {
    const before = count(`ticket_replies WHERE ticket_id = ${ticketB}`)
    const r = await api("support.php?action=reply", { body: { id: ticketB, body: "Intruder" }, token: tokenA })
    expect([403, 404]).toContain(r.status)
    expect(count(`ticket_replies WHERE ticket_id = ${ticketB}`)).toBe(before)
    expect(count(`ticket_replies WHERE body = 'Intruder'`)).toBe("0")
    expect(one(`SELECT status FROM tickets WHERE id = ${ticketB}`)).toBe("open")
  })

  it("cannot reply to a ticket that has been deleted", async () => {
    sql(`UPDATE tickets SET deleted_at = NOW() WHERE id = ${ticketA}`)
    const r = await api("support.php?action=reply", { body: { id: ticketA, body: "Late" }, token: tokenA })
    expect(r.status).toBe(404)
    expect(count(`ticket_replies WHERE body = 'Late'`)).toBe("0")
  })

  it("replies to its own ticket and audits the reply", async () => {
    const r = await api<{ id: number }>("support.php?action=reply", { body: { id: ticketA, body: "Thanks, one more thing" }, token: tokenA })
    expect(r.status).toBe(201)
    expect(r.json.id).toBe(Number(one(`SELECT id FROM ticket_replies WHERE body = 'Thanks, one more thing'`)))
    expect(one(`SELECT user_id FROM ticket_replies WHERE id = ${r.json.id}`)).toBe(String(userA))
    expect(count(`audit_log WHERE user_id = ${userA} AND action = 'ticket_reply'`)).toBe("1")
    const thread = await api<ClientTicket>(`support.php?id=${ticketA}`, { token: tokenA })
    expect(thread.json.replies.at(-1)).toMatchObject({ body: "Thanks, one more thing", from_client: true })
  })

  it("creates a ticket for its own client and ignores a supplied client_id", async () => {
    const r = await api<{ id: number }>("support.php?action=create", {
      body: { subject: "New question", body: "Details here", client_id: clientB, priority: "urgent" },
      token: tokenA,
    })
    expect(r.status).toBe(201)
    expect(one(`SELECT client_id FROM tickets WHERE id = ${r.json.id}`)).toBe(String(clientA))
    expect(r.json.id).toBe(Number(one(`SELECT id FROM tickets WHERE subject = 'New question'`)))
    expect(count(`audit_log WHERE user_id = ${userA} AND action = 'ticket_create'`)).toBe("1")
  })

  it("cannot set a priority when creating a ticket", async () => {
    const r = await api<{ id: number }>("support.php?action=create", {
      body: { subject: "Please hurry", priority: "urgent" },
      token: tokenA,
    })
    expect(r.status).toBe(201)
    expect(one(`SELECT priority FROM tickets WHERE id = ${r.json.id}`)).toBe("normal")
    expect(one(`SELECT status FROM tickets WHERE id = ${r.json.id}`)).toBe("open")
  })

  it("rejects a missing subject or an overlong message without writing", async () => {
    const before = count("tickets")
    expect((await api("support.php?action=create", { body: { subject: "" }, token: tokenA })).status).toBe(400)
    expect((await api("support.php?action=create", { body: { subject: "x".repeat(201) }, token: tokenA })).status).toBe(400)
    expect((await api("support.php?action=create", { body: { subject: "Ok", body: "x".repeat(5001) }, token: tokenA })).status).toBe(400)
    expect(count("tickets")).toBe(before)
    const replies = count("ticket_replies")
    expect((await api("support.php?action=reply", { body: { id: ticketA, body: "" }, token: tokenA })).status).toBe(400)
    expect((await api("support.php?action=reply", { body: { id: ticketA, body: "x".repeat(5001) }, token: tokenA })).status).toBe(400)
    expect(count("ticket_replies")).toBe(replies)
  })

  it.each([
    ["status", { status: "resolved" }],
    ["priority", { priority: "urgent" }],
    ["assign", { assignee_id: 1 }],
  ])("cannot use the staff %s action, even on its own ticket", async (action, extra) => {
    const r = await api(`support.php?action=${action}`, { body: { id: ticketA, ...extra }, token: tokenA })
    expect(r.status).toBe(403)
    expect(sql(`SELECT status, priority, assignee_id FROM tickets WHERE id = ${ticketA}`)[0]).toEqual(["open", "normal", "NULL"])
  })

  it("does not move its own ticket's status by replying", async () => {
    await api("support.php?action=reply", { body: { id: ticketA, body: "Client follow-up" }, token: tokenA })
    expect(one(`SELECT status FROM tickets WHERE id = ${ticketA}`)).toBe("open")
  })

  it("refuses a client account that is not linked to a client", async () => {
    createUser({ email: "unlinked@example.test", role: "client", clientId: null })
    const token = await login("unlinked@example.test")
    const before = [count("tickets"), count("ticket_replies")]
    expect((await api("support.php", { token })).status).toBe(403)
    expect((await api(`support.php?id=${ticketA}`, { token })).status).toBe(403)
    expect((await api("support.php?action=create", { body: { subject: "Hello", client_id: clientA }, token })).status).toBe(403)
    expect((await api("support.php?action=reply", { body: { id: ticketA, body: "Hello" }, token })).status).toBe(403)
    expect([count("tickets"), count("ticket_replies")]).toEqual(before)
  })

  it("requires sign-in", async () => {
    expect((await api("support.php")).status).toBe(401)
    expect((await api("support.php?action=create", { body: { subject: "Anon" } })).status).toBe(401)
  })

  describe("staff behaviour is unchanged", () => {
    it("lists every ticket", async () => {
      const r = await api<Array<{ id: number; client_id: number | null }>>("support.php", { token: tokenOwner })
      expect(r.status).toBe(200)
      expect(r.json.map((t) => t.id).sort()).toEqual([ticketA, ticketB].sort())
    })

    it("reads any ticket with its replies", async () => {
      const r = await api<ClientTicket>(`support.php?id=${ticketB}`, { token: tokenOwner })
      expect(r.status).toBe(200)
      expect(r.json.replies).toHaveLength(2)
    })

    it("creates a ticket for a chosen client with a chosen priority", async () => {
      const r = await api<{ id: number }>("support.php?action=create", {
        body: { subject: "Staff-raised", client_id: clientB, priority: "high" },
        token: tokenOwner,
      })
      expect(r.status).toBe(201)
      expect(sql(`SELECT client_id, priority FROM tickets WHERE id = ${r.json.id}`)[0]).toEqual([String(clientB), "high"])
    })

    it("replies to any ticket and moves an open ticket into progress", async () => {
      const r = await api<{ id: number }>("support.php?action=reply", { body: { id: ticketB, body: "On it" }, token: tokenOwner })
      expect(r.status).toBe(201)
      expect(one(`SELECT status FROM tickets WHERE id = ${ticketB}`)).toBe("in_progress")
    })

    it("changes status and priority", async () => {
      expect((await api("support.php?action=status", { body: { id: ticketA, status: "resolved" }, token: tokenOwner })).status).toBe(200)
      expect((await api("support.php?action=priority", { body: { id: ticketA, priority: "low" }, token: tokenOwner })).status).toBe(200)
      expect(sql(`SELECT status, priority FROM tickets WHERE id = ${ticketA}`)[0]).toEqual(["resolved", "low"])
    })

    it("still refuses a trainer, who is neither staff for support nor a client", async () => {
      createUser({ email: "trainer@example.test", role: "trainer" })
      const token = await login("trainer@example.test")
      expect((await api("support.php", { token })).status).toBe(403)
    })
  })
})
