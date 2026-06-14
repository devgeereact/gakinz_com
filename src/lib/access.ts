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
  // server/api: dashboard is staff-only overview
  dashboard: ALL_STAFF,
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
  // files.php — all staff
  files: ALL_STAFF,
  // careplan.php — management view
  careplan: ["super_admin", "admin", "manager"],
  // users.php / audit.php ADMINS
  platform: ["super_admin", "admin"],
  // client portal — the external client's home, plus staff who manage it
  portal: [...ALL_STAFF, "client"],
}

// Map a /app/* pathname to its module key. Returns null for paths with no
// module gate (e.g. account settings, which any authenticated user may open).
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
    files: "files",
    careplan: "careplan",
    platform: "platform",
  }
  return map[seg] ?? null
}

export function canAccess(role: Role | undefined, moduleKey: string): boolean {
  if (!role) return false
  const allowed = MODULE_ROLES[moduleKey]
  if (!allowed) return true // ungated module → any authenticated user
  return allowed.includes(role)
}

// Where a role lands when it has no business on the page it tried to open.
export function defaultPathForRole(role: Role | undefined): string {
  if (role === "client") return "/app/portal"
  // "/app" index → "dashboard" module, allowed for every staff role, so this
  // never re-triggers the gate. (Must be a real route — there is no
  // "/app/dashboard/analytics".)
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
