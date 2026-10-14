import { useState } from "react"
import { ChevronDown, type LucideIcon } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export type NavItem = {
  key: string
  title: string
  url: string
  icon: LucideIcon
  /** Shown as a count pill when above zero. */
  count?: number
}

// Which groups the user has folded away, remembered per browser. Same shape
// as the prototype's `gkos-groups`: a group is open unless saved as false.
const GROUPS_KEY = "gkos-groups"

function readGroups(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(GROUPS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

function saveGroup(label: string, open: boolean) {
  try {
    const all = readGroups()
    all[label] = open
    localStorage.setItem(GROUPS_KEY, JSON.stringify(all))
  } catch {
    // Storage blocked: the group still toggles for this visit.
  }
}

// Exact match or a deeper segment. The "/app" index (Today) matches only
// itself; a plain prefix test lit it up on every /app/* page.
function isActiveRoute(pathname: string, url: string) {
  const path = pathname.replace(/\/+$/, "")
  if (path === `/${url}`) return true
  return url !== "app" && path.startsWith(`/${url}/`)
}

// One navigation group, the prototype's `.grp`: a mono uppercase header with a
// chevron that folds the group, then 40px rows. On the icon rail the header
// becomes a short rule and every item stays visible.
export function NavMain({ items, label }: { items: NavItem[]; label: string }) {
  const location = useLocation()
  const { state, isMobile } = useSidebar()
  const rail = state === "collapsed" && !isMobile
  const [open, setOpen] = useState(() => readGroups()[label] !== false)
  const showItems = open || rail
  const listId = `nav-grp-${label.toLowerCase().replace(/\W+/g, "-")}`

  return (
    <SidebarGroup className="mt-1.5 p-0">
      {rail ? (
        <div className="flex h-10 items-center justify-center" aria-hidden>
          <span className="h-px w-4 bg-sidebar-border" />
        </div>
      ) : (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            setOpen(!open)
            saveGroup(label, !open)
          }}
          className="gk-os-mono flex min-h-10 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left !text-[10.5px] !tracking-[.09em] text-sidebar-muted hover:text-sidebar-foreground focus-visible:outline-sidebar-ring"
        >
          <span>{label}</span>
          <ChevronDown
            aria-hidden
            className={`ml-auto size-[18px] transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
          />
        </button>
      )}
      {showItems && (
        <SidebarMenu id={listId} className="gap-0">
          {items.map((item) => {
            const active = isActiveRoute(location.pathname, item.url)
            return (
              <SidebarMenuItem key={item.key}>
                <SidebarMenuButton asChild tooltip={item.title} isActive={active}>
                  <Link to={`/${item.url}`} aria-current={active ? "page" : undefined}>
                    <item.icon aria-hidden />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
                {item.count ? (
                  <SidebarMenuBadge aria-label={`${item.count} waiting`}>{item.count}</SidebarMenuBadge>
                ) : null}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      )}
    </SidebarGroup>
  )
}
