/**
 * K-120: a client email that carries a line break must never reach the SMTP
 * RCPT TO command, where it would add commands to the authenticated session
 * (security audit 2026-11-01, smtp-rcpt-crlf-injection-via-client-email).
 *  - clients.php refuses an email that is not one valid address, on create and update.
 *  - gk_send_email refuses any recipient that is not a valid address before it connects.
 */
import { execFileSync } from "node:child_process"
import path from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { api, createClient, createUser, login, one, resetDb } from "./helpers"

const INJECTED = "a@example.test>\r\nRCPT TO:<b@example.test"

describe("client email on the way in", () => {
  beforeEach(() => resetDb())

  it("refuses an email with a line break on create, and stores nothing", async () => {
    createUser({ email: "editor@example.test", role: "editor" })
    const editor = await login("editor@example.test")
    const r = await api("clients.php?action=create", { token: editor, body: { company: "Injected Ltd", email: INJECTED } })
    expect(r.status).toBe(400)
    expect(one(`SELECT COUNT(*) FROM clients WHERE company = 'Injected Ltd'`)).toBe("0")
  })

  it("refuses it on update, and leaves the stored address alone", async () => {
    createUser({ email: "editor@example.test", role: "editor" })
    const editor = await login("editor@example.test")
    const id = createClient("Kept Ltd", "kept@example.test")
    const r = await api("clients.php?action=update", { token: editor, body: { id, company: "Kept Ltd", email: INJECTED } })
    expect(r.status).toBe(400)
    expect(one(`SELECT email FROM clients WHERE id = ${id}`)).toBe("kept@example.test")
  })

  it("still accepts a normal address, and no address at all", async () => {
    createUser({ email: "editor@example.test", role: "editor" })
    const editor = await login("editor@example.test")
    expect((await api("clients.php?action=create", { token: editor, body: { company: "Fine Ltd", email: "fine@example.test" } })).status).toBe(201)
    expect((await api("clients.php?action=create", { token: editor, body: { company: "Blank Ltd", email: "" } })).status).toBe(201)
  })
})

describe("gk_send_email recipients", () => {
  // Port 9 on loopback is closed, so a send that gets as far as connecting fails
  // with "Connect failed". A refused recipient must fail before that, without a socket.
  const send = (to: string): { ok: boolean; error: string } => {
    const smtp = path.resolve(__dirname, "../../server/_smtp.php")
    const code = `
      $GLOBALS['SMTP_HOST'] = '127.0.0.1'; $GLOBALS['SMTP_PORT'] = 9; $GLOBALS['SMTP_SECURE'] = 'tcp';
      $GLOBALS['SMTP_FROM'] = 'from@example.test';
      require ${JSON.stringify(smtp)};
      echo json_encode(gk_send_email(['to' => $argv[1], 'subject' => 's', 'body' => 'b']));`
    return JSON.parse(execFileSync("php", ["-r", code, "--", to], { encoding: "utf8" }))
  }

  it("refuses a recipient with a line break before connecting", () => {
    const r = send(INJECTED)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/recipient/i)
    expect(r.error).not.toMatch(/connect/i)
  })

  it("lets a valid recipient through to the transport", () => {
    const r = send("ok@example.test")
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/connect/i)
  })
})
