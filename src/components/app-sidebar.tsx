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
  BarChart3,
  Settings,
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

// GAkinzOS modules (GAkinzOS.html). Each maps to a /app/* route. `key` ties the
// item to its role gate in src/lib/access.ts so the nav only shows modules the
// signed-in role can actually open (server enforces the same lists).
const navMain = [
  { key: "dashboard", title: "Dashboard", url: "app/dashboard/analytics", icon: LayoutDashboard },
  { key: "leads", title: "Leads", url: "app/leads", icon: Inbox },
  { key: "clients", title: "Clients", url: "app/clients", icon: Users },
  { key: "projects", title: "Projects", url: "app/projects", icon: FolderKanban },
  { key: "proposals", title: "Proposals", url: "app/proposals", icon: FileText },
  { key: "invoicing", title: "Invoicing", url: "app/invoicing", icon: Receipt },
  { key: "portal", title: "Client Portal", url: "app/portal", icon: PanelsTopLeft },
  { key: "time", title: "Time", url: "app/time", icon: Clock },
  { key: "support", title: "Support", url: "app/support", icon: LifeBuoy },
  { key: "comms", title: "Comms", url: "app/comms", icon: MessagesSquare },
  { key: "analytics", title: "Analytics", url: "app/analytics", icon: BarChart3 },
  { key: "platform", title: "Platform", url: "app/platform", icon: Settings },
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
  // Only show modules the signed-in role can open (server enforces the same).
  const visibleNav = navMain.filter((item) => canAccess(user?.role, item.key))

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
                <span className="truncate font-semibold">GAkinzOS</span>
                <span className="truncate text-xs text-muted-foreground">Studio platform</span>
              </div>
            </Link>
          </SidebarMenuButton>
        </SidebarHeader>

        <SidebarContent>
          <NavMain items={visibleNav} />
        </SidebarContent>

        <SidebarFooter className="border-t h-16 justify-center">
          <NavUser user={navUser} />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
    </div>
  )
}
