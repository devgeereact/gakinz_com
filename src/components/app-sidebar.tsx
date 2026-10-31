import { clerkEnabled, clerkSignOut } from "@/lib/clerk"
import { useEffect, useState } from "react"
import { LogOut, UserRound } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"

import { NavMain } from "@/components/nav-main"
import { NAV_GROUPS } from "@/components/nav-groups"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useSidebar } from "@/components/ui/sidebar-context"
import { auth, leads as leadsApi, support as supportApi } from "@/lib/api"
import { canAccess } from "@/lib/access"
import { useAuth, type Role } from "@/store/auth.store"

// Count pills: new enquiries and open support tickets, read once when the
// shell mounts and only for a role that can open the module. Read-only GETs
// on endpoints the modules already call; a failure just shows no pill.
function useNavCounts(role: Role | undefined) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  useEffect(() => {
    if (!role) return
    let alive = true
    const want = {
      leads: canAccess(role, "leads"),
      support: canAccess(role, "support"),
    }
    Promise.allSettled([
      want.leads ? leadsApi.list() : Promise.resolve(null),
      want.support ? supportApi.list() : Promise.resolve(null),
    ]).then(([l, s]) => {
      if (!alive) return
      const next: Record<string, number> = {}
      if (l.status === "fulfilled" && l.value && l.value.ok && Array.isArray(l.value.data)) {
        next.leads = l.value.data.filter((x) => x.status === "new").length
      }
      if (s.status === "fulfilled" && s.value && s.value.ok && Array.isArray(s.value.data)) {
        next.support = s.value.data.filter((t) => t.status !== "resolved").length
      }
      setCounts(next)
    })
    return () => {
      alive = false
    }
  }, [role])
  return counts
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  onHoverChange?: (value: boolean) => void
}

// The prototype's graphite sidebar (D-046): brand tile, collapsible groups,
// and a footer with My account and Sign out. Collapses to a 72px icon rail.
export function AppSidebar({ onHoverChange, ...props }: AppSidebarProps) {
  const user = useAuth((s) => s.user)
  const clear = useAuth((s) => s.clear)
  const navigate = useNavigate()
  const location = useLocation()
  const { setOpenMobile } = useSidebar()
  const counts = useNavCounts(user?.role)

  // Only show modules the signed-in role can open (server enforces the same),
  // and drop a heading once none of its modules are left.
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items
      .filter((item) => canAccess(user?.role, item.key))
      .map((item) => ({ ...item, count: counts[item.key] })),
  })).filter((group) => group.items.length > 0)

  // Close the phone drawer after navigating.
  useEffect(() => {
    setOpenMobile(false)
  }, [location.pathname, setOpenMobile])

  const onLogout = async () => {
    await auth.logout() // best-effort: the server deletes the token
    clear() // drop the local session regardless
    if (clerkEnabled) await clerkSignOut().catch(() => {})
    navigate("/login", { replace: true })
  }

  const accountActive = location.pathname.replace(/\/+$/, "") === "/app/account"

  return (
    <div onMouseEnter={() => onHoverChange?.(true)} onMouseLeave={() => onHoverChange?.(false)}>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader className="min-h-16 justify-center px-4 pb-3 pt-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
          <Link to="/app" className="flex items-center gap-2.5 rounded-[10px]">
            <span className="gk-os-mark" aria-hidden>G</span>
            <span className="whitespace-nowrap font-display text-[1.05rem] font-semibold leading-tight tracking-[-0.02em] group-data-[collapsible=icon]:sr-only">
              GAkinzOS
              <small className="block font-mono text-[10px] font-normal uppercase tracking-[.08em] text-sidebar-muted">
                Studio platform
              </small>
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="gap-0 px-2.5 pb-4 pt-2 group-data-[collapsible=icon]:overflow-y-auto group-data-[collapsible=icon]:px-4">
          <nav aria-label="Main">
            {visibleGroups.map((group) => (
              <NavMain key={group.label} label={group.label} items={group.items} />
            ))}
          </nav>
        </SidebarContent>

        <SidebarFooter className="gap-0 border-t border-sidebar-border px-2.5 pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-3 group-data-[collapsible=icon]:px-4">
          <SidebarMenu className="gap-0">
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="My account" isActive={accountActive}>
                <Link to="/app/account" aria-current={accountActive ? "page" : undefined}>
                  <UserRound aria-hidden />
                  <span>My account</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Sign out" onClick={onLogout}>
                <LogOut aria-hidden />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
    </div>
  )
}
