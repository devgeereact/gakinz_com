import { canAccess } from "@/lib/access"
import type { Role } from "@/store/auth.store"

/**
 * Which of the dashboard's six data sources a role may load. The dashboard used to ask every source for every
 * role; `invoices.php` is manager-only, so an editor's request always failed with 403, was counted as a load
 * error, and showed "Some totals could not be loaded" for ever (K-135). The answer comes from `canAccess`, the
 * same table the sidebar uses, and that table is held equal to the endpoints by access-drift.test.ts.
 */
export type DashboardSource = "leads" | "clients" | "projects" | "invoices" | "support" | "time"

/** Source to the CMS module whose access rule governs it. */
export const DASHBOARD_MODULES: Record<DashboardSource, string> = {
  leads: "leads",
  clients: "clients",
  projects: "projects",
  invoices: "invoicing",
  support: "support",
  time: "time",
}

const ORDER: DashboardSource[] = ["leads", "clients", "projects", "invoices", "support", "time"]

export function dashboardSources(role: Role | undefined): { load: DashboardSource[]; notForRole: DashboardSource[] } {
  // An unknown role loads everything, as before; the server still decides.
  if (role === undefined) return { load: [...ORDER], notForRole: [] }
  const load = ORDER.filter((s) => canAccess(role, DASHBOARD_MODULES[s]))
  return { load, notForRole: ORDER.filter((s) => !load.includes(s)) }
}
