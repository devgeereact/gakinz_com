"use client"

import {
  LayoutDashboard,
  Inbox,
  Users,
  FolderKanban,
  FileText,
  Receipt,
  PanelsTopLeft,
  Clock,
  LifeBuoy,
  MessagesSquare,
  Mail,
  BarChart3,
  Settings,
  Palette,
  GitBranch,
  CalendarRange,
  FileSignature,
  BookOpen,
  Newspaper,
  Quote,
  Briefcase,
  Sparkles,
  FolderOpen,
  HeartPulse,
  UserRound,
} from "lucide-react"

import { Link } from "react-router-dom"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar"
import BrandMark from "@/marketing/components/BrandMark"
import { useAuth } from "@/store/auth.store"
import { canAccess } from "@/lib/access"

// GAkinzOS modules (GAkinzOS.html), grouped under the seven main destinations
// in docs/Plans 2026/02-APP-PLAN.md. Each item maps to a /app/* route that is
// unchanged by the grouping; only some labels changed. `key` ties the item to
// its role gate in src/lib/access.ts so the nav only shows modules the
// signed-in role can actually open (server enforces the same lists).
const navGroups = [
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
      { key: "account", title: "My account", url: "app/account", icon: UserRound },
    ],
  },
]

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  onHoverChange?: (value: boolean) => void
}

export function AppSidebar({ onHoverChange, ...props }: AppSidebarProps) {
  const user = useAuth((s) => s.user)
  const navUser = {
    name: user?.name ?? "Member",
    email: user?.email ?? "",
    avatar: "",
    role: user?.role,
  }
  // Only show modules the signed-in role can open (server enforces the same),
  // and drop a heading once none of its modules are left.
  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => canAccess(user?.role, item.key)) }))
    .filter((group) => group.items.length > 0)

  return (
    <div
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader className="border-b h-16">
          <SidebarMenuButton size="lg" asChild className="px-2 py-3">
            <Link to="/app">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                <BrandMark className="size-8" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="gk-app-grad truncate font-bold">GAkinzOS</span>
                <span className="truncate text-xs text-muted-foreground">Studio platform</span>
              </div>
            </Link>
          </SidebarMenuButton>
        </SidebarHeader>

        <SidebarContent>
          {visibleGroups.map((group) => (
            <NavMain key={group.label} label={group.label} items={group.items} />
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t h-16 justify-center">
          <NavUser user={navUser} />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
    </div>
  )
}
