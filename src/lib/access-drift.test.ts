import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { MODULE_ROLES } from "./access"

/**
 * Drift guard (K-135). `access.ts` copies each module's allowed roles by hand from the PHP endpoints that serve
 * it, and it only hides navigation: the endpoint is the real gate. If the two ever disagree, a person is shown
 * a screen that answers 403, or is hidden one they may use. This test reads the PHP role lists and fails when a
 * module and its endpoints differ, or when a module is added without saying which endpoint it follows.
 */

const root = join(import.meta.dirname, "..", "..")

function phpRoles(file: string, constant: string): string[] {
  const src = readFileSync(join(root, "server", file), "utf8")
  const m = new RegExp(`^const ${constant}\\s*=\\s*\\[([^\\]]*)\\]`, "m").exec(src)
  if (!m) throw new Error(`server/${file} has no const ${constant}`)
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort()
}

type Gate = readonly [file: string, constant: string]

/** Module key to the endpoint role lists it must equal. A screen that calls several endpoints lists each one. */
const FOLLOWS: Record<string, Gate[]> = {
  leads: [["leads.php", "STAFF"]],
  clients: [["clients.php", "STAFF"]],
  proposals: [["proposals.php", "STAFF"]],
  projects: [["projects.php", "STAFF"], ["tasks.php", "STAFF"], ["briefs.php", "STAFF"], ["assets.php", "STAFF"]],
  invoicing: [["invoices.php", "STAFF"], ["payments.php", "PAY_STAFF"]],
  support: [["support.php", "STAFF"]],
  comms: [["comms.php", "STAFF"]],
  mailbox: [["mail.php", "MAIL_ROLES"]],
  time: [["time.php", "STAFF"]],
  analytics: [["reports.php", "STAFF"]],
  design: [["design.php", "STAFF"]],
  devpipeline: [["dev.php", "STAFF"]],
  resourcing: [["resourcing.php", "STAFF"]],
  contracts: [["contracts.php", "STAFF"]],
  knowledge: [["knowledge.php", "STAFF"]],
  content: [["content.php", "EDITORS"]],
  blog: [["blog.php", "EDITORS"]],
  testimonials: [["testimonials.php", "EDITORS"]],
  certificates: [["certificates.php", "CERT_ROLES"]],
  work: [["work.php", "EDITORS"]],
  site: [["site.php", "EDITORS"]],
  files: [["files.php", "STAFF"]],
  careplan: [["careplan.php", "STAFF"]],
  platform: [["users.php", "ADMINS"], ["integrations.php", "ADMINS"], ["slack.php", "ADMINS"]],
}

/** Screens with no single endpoint list to follow, and why. */
const EXEMPT: Record<string, string> = {
  dashboard: "an overview that reads several endpoints and shows 'unavailable' for the ones a role cannot call",
  portal: "the client's own portal, plus staff preview (portal.php PORTAL_PREVIEW_ROLES)",
  account: "every signed-in role, client included",
}

describe("access.ts follows the endpoints it hides navigation for (K-135)", () => {
  for (const [module, gates] of Object.entries(FOLLOWS)) {
    for (const [file, constant] of gates) {
      it(`${module} allows exactly ${file} ${constant}`, () => {
        expect([...(MODULE_ROLES[module] ?? [])].sort()).toEqual(phpRoles(file, constant))
      })
    }
  }

  it("has no module that nobody decided how to check", () => {
    const decided = new Set([...Object.keys(FOLLOWS), ...Object.keys(EXEMPT)])
    const undecided = Object.keys(MODULE_ROLES).filter((k) => !decided.has(k))
    expect(undecided, "add each new module to FOLLOWS (with its endpoint) or EXEMPT (with the reason)").toEqual([])
  })

  it("lets the client role open only My account and the portal", () => {
    const withClient = Object.entries(MODULE_ROLES).filter(([, roles]) => roles.includes("client")).map(([k]) => k).sort()
    expect(withClient).toEqual(["account", "portal"])
  })
})
