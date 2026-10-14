import {
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarRange,
  Clock,
  FileSignature,
  FileText,
  FolderKanban,
  FolderOpen,
  GitBranch,
  Globe,
  HeartPulse,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  MessagesSquare,
  Newspaper,
  Palette,
  PanelsTopLeft,
  Quote,
  Receipt,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react"

export type NavEntry = { key: string; title: string; url: string; icon: LucideIcon }
export type NavGroupDef = { label: string; items: NavEntry[] }

// GAkinzOS modules (docs/PRODUCT-SPEC.md), grouped under the seven main
// destinations (D-040). Each item maps to a /app/* route; `key` ties it to its
// role gate in src/lib/access.ts so the nav only shows modules the signed-in
// role can open (the server enforces the same lists). My account lives in the
// sidebar footer, as in the approved prototype (D-046).
export const NAV_GROUPS: NavGroupDef[] = [
  {
    label: "Today",
    items: [{ key: "dashboard", title: "Today", url: "app", icon: LayoutDashboard }],
  },
  {
    label: "Enquiries",
    items: [{ key: "leads", title: "Enquiries", url: "app/leads", icon: Inbox }],
  },
  {
    label: "Clients",
    items: [
      { key: "clients", title: "Clients", url: "app/clients", icon: Users },
      { key: "portal", title: "Client Portal", url: "app/portal", icon: PanelsTopLeft },
      { key: "comms", title: "Comms", url: "app/comms", icon: MessagesSquare },
      { key: "mailbox", title: "Mailbox", url: "app/mailbox", icon: Mail },
    ],
  },
  {
    label: "Projects",
    items: [
      { key: "projects", title: "Projects", url: "app/projects", icon: FolderKanban },
      { key: "design", title: "Design", url: "app/design", icon: Palette },
      { key: "devpipeline", title: "Dev Pipeline", url: "app/devpipeline", icon: GitBranch },
      { key: "time", title: "Time", url: "app/time", icon: Clock },
      { key: "files", title: "Files", url: "app/files", icon: FolderOpen },
      { key: "support", title: "Support", url: "app/support", icon: LifeBuoy },
    ],
  },
  {
    label: "Money",
    items: [
      { key: "proposals", title: "Quotes", url: "app/proposals", icon: FileText },
      { key: "contracts", title: "Contracts", url: "app/contracts", icon: FileSignature },
      { key: "invoicing", title: "Invoicing", url: "app/invoicing", icon: Receipt },
      { key: "careplan", title: "Care Plan", url: "app/careplan", icon: HeartPulse },
      { key: "analytics", title: "Analytics", url: "app/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Website",
    items: [
      { key: "site", title: "Site content", url: "app/site", icon: Globe },
      { key: "blog", title: "Blog", url: "app/blog", icon: Newspaper },
      { key: "work", title: "Work", url: "app/work", icon: Briefcase },
      { key: "testimonials", title: "Testimonials", url: "app/testimonials", icon: Quote },
      { key: "content", title: "Content Hub", url: "app/content", icon: Sparkles },
      { key: "knowledge", title: "Knowledge", url: "app/knowledge", icon: BookOpen },
    ],
  },
  {
    label: "Settings",
    items: [
      { key: "platform", title: "Settings", url: "app/platform", icon: Settings },
      { key: "resourcing", title: "Resourcing", url: "app/resourcing", icon: CalendarRange },
    ],
  },
]

/** The group and title for a CMS path, for the page crumb. */
export function navMetaForPath(pathname: string): { group: string; title: string } | null {
  const path = pathname.replace(/\/+$/, "")
  if (path === "/app/account" || path.startsWith("/app/account/")) return { group: "Account", title: "My account" }
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      const url = `/${item.url}`
      if (path === url || (item.url !== "app" && path.startsWith(`${url}/`))) {
        return { group: group.label, title: item.title }
      }
    }
  }
  return null
}
