// Client-side role access map for the GAkinzOS CMS.
//
// This MIRRORS the server's per-endpoint role lists (the `STAFF`/`ADMINS`
// constants in server/*.php). It is a UX convenience only — it hides nav items
// and redirects disallowed routes so a user never sees tools they can't use.
// It is NOT a security boundary: every endpoint independently calls
// require_auth($conn, STAFF) and rejects the request server-side. Never rely on
// this file to keep data safe; rely on it to keep the UI honest.

import type { Role } from "@/store/auth.store"

// Every staff role (i.e. everyone except an external `client`).
const ALL_STAFF: Role[] = ["super_admin", "admin", "manager", "trainer", "editor", "employee"]

// Module key → roles allowed to open that module. Kept in sync with server.
export const MODULE_ROLES: Record<string, Role[]> = {
  // The dashboard aggregates leads.php, clients.php, projects.php, invoices.php,
  // support.php, time.php and announcements.php. `trainer` and `employee` could
  // reach almost none of those, so they landed on a page of 403s and empty KPIs.
  // Narrowed to the roles that can actually load the overview; both of those
  // roles now land on a module they own (see defaultPathForRole).
  dashboard: ["super_admin", "admin", "manager", "editor"],
  // leads.php / clients.php / proposals.php STAFF
  leads: ["super_admin", "admin", "manager", "editor"],
  clients: ["super_admin", "admin", "manager", "editor"],
  proposals: ["super_admin", "admin", "manager", "editor"],
  // projects.php / tasks.php STAFF
  projects: ["super_admin", "admin", "manager", "editor", "employee"],
  // invoices.php STAFF
  invoicing: ["super_admin", "admin", "manager"],
  // support.php STAFF (+ client gets their own ticket view)
  support: ["super_admin", "admin", "manager", "editor", "employee"],
  comms: ["super_admin", "admin", "manager", "editor", "employee"],
  // mail.php MAIL_ROLES — real correspondence, senior staff only
  mailbox: ["super_admin", "admin", "manager"],
  // time.php STAFF (includes trainer)
  time: ["super_admin", "admin", "manager", "editor", "employee", "trainer"],
  // analytics/reporting — management view
  analytics: ["super_admin", "admin", "manager"],
  // design.php STAFF
  design: ["super_admin", "admin", "manager", "editor"],
  // dev.php STAFF (build team)
  devpipeline: ["super_admin", "admin", "manager", "editor", "employee"],
  // resourcing.php — management view
  resourcing: ["super_admin", "admin", "manager"],
  // contracts.php — management view
  contracts: ["super_admin", "admin", "manager"],
  // knowledge.php — all staff
  knowledge: ALL_STAFF,
  // content.php (Content Hub) / blog.php / testimonials.php — content editors
  content: ["super_admin", "admin", "manager", "editor"],
  blog: ["super_admin", "admin", "manager", "editor"],
  testimonials: ["super_admin", "admin", "manager", "editor"],
  // work.php EDITORS — the portfolio record type behind the public /work pages
  work: ["super_admin", "admin", "manager", "editor"],
  // site.php EDITORS — "Site content": the public site's editable copy
  site: ["super_admin", "admin", "manager", "editor"],
  // files.php STAFF — no `trainer`; the server list omits it, so showing the
  // nav item only walked a trainer into a 403.
  files: ["super_admin", "admin", "manager", "editor", "employee"],
  // careplan.php — management view
  careplan: ["super_admin", "admin", "manager"],
  // users.php / audit.php ADMINS
  platform: ["super_admin", "admin"],
  // Client portal — the external client's own home, plus the staff who manage
  // it. Narrowed from ALL_STAFF on 2026-09-22 to match the server:
  // server/portal.php previously called require_auth($conn) with no role list,
  // so employee, editor and trainer could pass an arbitrary ?client_id and read
  // any client's invoice data, which server/invoices.php restricts to these
  // three roles. The server branch is now gated on PORTAL_PREVIEW_ROLES, and
  // this list mirrors it so those roles no longer see a nav item that 403s.
  // The client branch is unchanged and remains the security boundary: it
  // derives the client id from the token and ignores any supplied parameter.
  portal: ["super_admin", "admin", "manager", "client"],
  // My account: every signed-in role, client included. auth.php's sessions,
  // revoke and twofa_* actions call require_auth($conn) with no role list and
  // act only on the caller's own user id, so this mirrors the server.
  account: [...ALL_STAFF, "client"],
}

// Map a /app/* pathname to its module key. Returns null for paths with no
// module gate.
export function moduleKeyForPath(pathname: string): string | null {
  const p = pathname.replace(/^\/+/, "") // strip leading slash(es)
  // "/app" index → dashboard
  if (p === "app" || p === "app/") return "dashboard"
  const seg = p.replace(/^app\//, "").split("/")[0]
  const map: Record<string, string> = {
    dashboard: "dashboard",
    leads: "leads",
    clients: "clients",
    projects: "projects",
    proposals: "proposals",
    invoicing: "invoicing",
    portal: "portal",
    time: "time",
    support: "support",
    comms: "comms",
    mailbox: "mailbox",
    analytics: "analytics",
    design: "design",
    devpipeline: "devpipeline",
    resourcing: "resourcing",
    contracts: "contracts",
    knowledge: "knowledge",
    content: "content",
    blog: "blog",
    testimonials: "testimonials",
    work: "work",
    site: "site",
    files: "files",
    careplan: "careplan",
    platform: "platform",
    account: "account",
  }
  return map[seg] ?? null
}

export function canAccess(role: Role | undefined, moduleKey: string): boolean {
  if (!role) return false
  const allowed = MODULE_ROLES[moduleKey]
  // Fail CLOSED. An unmapped key used to return true, so a route added without
  // a MODULE_ROLES entry was reachable by every signed-in user, `client`
  // included. Now a missing entry hides the module until someone maps it.
  // (moduleKeyForPath returns null — never an unmapped key — for a genuinely
  // ungated path, and RequireAuth skips the gate on null, so ungated pages are
  // unaffected.)
  if (!allowed) return false
  return allowed.includes(role)
}

// Where a role lands when it has no business on the page it tried to open.
export function defaultPathForRole(role: Role | undefined): string {
  if (role === "client") return "/app/portal"
  // Every landing here must be a real route the role can actually open, or
  // RequireAuth bounces a user to a page it then bounces them off again.
  // `trainer` and `employee` no longer hold `dashboard` (the "/app" index), so
  // they land on a module that is theirs. Everyone else keeps "/app".
  if (role === "trainer") return "/app/time"
  if (role === "employee") return "/app/projects"
  return "/app"
}

// Human-readable role label for the UI.
export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  manager: "Manager",
  trainer: "Trainer",
  editor: "Editor",
  employee: "Employee",
  client: "Client",
}
