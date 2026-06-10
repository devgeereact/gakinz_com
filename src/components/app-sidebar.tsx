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

// GAkinzOS modules (GAkinzOS.html). Each maps to a /app/* route. Leads is live;
// the rest render a module stub until their phase is built.
const navMain = [
  { title: "Dashboard", url: "app/dashboard/analytics", icon: LayoutDashboard },
  { title: "Leads", url: "app/leads", icon: Inbox },
  { title: "Clients", url: "app/clients", icon: Users },
  { title: "Projects", url: "app/projects", icon: FolderKanban },
  { title: "Proposals", url: "app/proposals", icon: FileText },
  { title: "Invoicing", url: "app/invoicing", icon: Receipt },
  { title: "Client Portal", url: "app/portal", icon: PanelsTopLeft },
  { title: "Time", url: "app/time", icon: Clock },
  { title: "Support", url: "app/support", icon: LifeBuoy },
  { title: "Comms", url: "app/comms", icon: MessagesSquare },
  { title: "Analytics", url: "app/analytics", icon: BarChart3 },
  { title: "Platform", url: "app/platform", icon: Settings },
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
  }

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
          <NavMain items={navMain} />
        </SidebarContent>

        <SidebarFooter className="border-t h-16 justify-center">
          <NavUser user={navUser} />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
    </div>
  )
}
