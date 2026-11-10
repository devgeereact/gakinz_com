/**
 * A fake SMTP server on 127.0.0.1 for server tests, so a test can see exactly what PHP would have mailed and
 * nothing leaves the machine. Point `SMTP_HOST` / `SMTP_PORT` at it through overrides.json (see `smtpOverrides`).
 */
import fs from "node:fs"
import net from "node:net"
import path from "node:path"
import { WORK_DIR } from "./env"

export type Mail = { rcpt: string[]; data: string }

export const OVERRIDES = path.join(WORK_DIR, "overrides.json")

export class FakeSmtp {
  mails: Mail[] = []
  /** When true the server answers 550 to every RCPT TO, as a mail host that refuses the recipient would. */
  rejectRcpt = false
  port = 0
  private server!: net.Server

  start(): Promise<void> {
    this.server = net.createServer((sock) => {
      let buf = ""
      let inData = false
      let cur: Mail = { rcpt: [], data: "" }
      const send = (s: string) => sock.write(s + "\r\n")
      send("220 fake")
      sock.on("data", (chunk) => {
        buf += chunk.toString("utf8")
        for (;;) {
          if (inData) {
            const end = buf.indexOf("\r\n.\r\n")
            if (end < 0) return
            cur.data = buf.slice(0, end)
            buf = buf.slice(end + 5)
            inData = false
            this.mails.push(cur)
            cur = { rcpt: [], data: "" }
            send("250 queued")
            continue
          }
          const nl = buf.indexOf("\r\n")
          if (nl < 0) return
          const line = buf.slice(0, nl)
          buf = buf.slice(nl + 2)
          if (/^EHLO/i.test(line)) send("250 fake")
          else if (/^AUTH LOGIN/i.test(line)) send("334 VXNlcm5hbWU6")
          else if (/^MAIL FROM/i.test(line)) send("250 ok")
          else if (/^RCPT TO:<(.+)>/i.test(line)) {
            if (this.rejectRcpt) send("550 no")
            else {
              cur.rcpt.push(/^RCPT TO:<(.+)>/i.exec(line)![1])
              send("250 ok")
            }
          } else if (/^DATA/i.test(line)) {
            inData = true
            send("354 go")
          } else if (/^QUIT/i.test(line)) {
            send("221 bye")
            sock.end()
          } else if (/^[A-Za-z0-9+/=]+$/.test(line)) send(line.length < 12 ? "334 UGFzc3dvcmQ6" : "235 ok") // user, then password
          else send("250 ok")
        }
      })
      sock.on("error", () => {})
    })
    return new Promise((resolve) =>
      this.server.listen(0, "127.0.0.1", () => {
        this.port = (this.server.address() as net.AddressInfo).port
        resolve()
      }),
    )
  }

  stop(): void {
    this.server.close()
  }

  reset(): void {
    this.mails = []
    this.rejectRcpt = false
  }

  /** Writes overrides.json so the PHP under test mails through this server. Remove it with `clearOverrides`. */
  configure(extra: Record<string, unknown> = {}): void {
    fs.writeFileSync(
      OVERRIDES,
      JSON.stringify({ SMTP_HOST: "127.0.0.1", SMTP_PORT: this.port, SMTP_SECURE: "", SMTP_USER: "user", SMTP_PASS: "pass-longer-than-twelve", ...extra }),
    )
  }
}

export const clearOverrides = () => fs.rmSync(OVERRIDES, { force: true })

/** The decoded text of one mail's subject (the server sends it base64-wrapped). */
export function subjectOf(m: Mail): string {
  const hit = /^Subject: =\?UTF-8\?B\?(.+?)\?=\s*$/m.exec(m.data)
  return hit ? Buffer.from(hit[1], "base64").toString("utf8") : (/^Subject: (.*)$/m.exec(m.data)?.[1] ?? "")
}
