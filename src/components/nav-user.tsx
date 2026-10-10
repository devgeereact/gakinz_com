"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChevronsUpDownIcon, BadgeCheckIcon, ShieldCheckIcon, LogOutIcon } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { auth } from "@/lib/api"
import { useAuth, type Role } from "@/store/auth.store"
import { ROLE_LABEL } from "@/lib/access"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
    role?: Role
  }
}) {
 const { isMobile, state } = useSidebar()
 const navigate = useNavigate()
 const clear = useAuth((s) => s.clear)

 const onLogout = async () => {
   await auth.logout() // best-effort: server deletes the token
   clear() // drop the local session regardless
   navigate("/login", { replace: true })
 }

const collapsed = state === "collapsed"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
  {collapsed ? (
    <button
      className="
        flex h-12 w-12 items-center justify-center
        rounded-xl bg-muted mx-auto
      "
    >
      <Avatar className="h-9 w-9 rounded-xl">
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
    </button>
  ) : (
    <SidebarMenuButton
      size="lg"
      className="
        bg-muted px-2
        data-[state=open]:bg-sidebar-accent
        data-[state=open]:text-sidebar-accent-foreground
      "
    >
      <Avatar className="h-9 w-9 rounded-xl shrink-0">
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>

      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">
          {user.name}
        </span>

        <span className="truncate text-xs">
          {user.email}
        </span>
      </div>

      <ChevronsUpDownIcon className="ml-auto size-4" />
    </SidebarMenuButton>
  )}
</DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 p-3 rounded-xl shadow-xl"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal rounded-xl border-1 mb-3 bg-muted/50 border">
              <div className="flex items-center gap-2 text-left text-sm p-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                {user.role && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {ROLE_LABEL[user.role]}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-2"/>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="gap-2 h-9">
                <Link to="/app/account">
                  <BadgeCheckIcon className="!size-5" />
                  My account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="gap-2 h-9">
                <Link to="/app/account#security">
                  <ShieldCheckIcon className="!size-5" />
                  Sign-in security
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="my-2"/>
            <DropdownMenuItem className="gap-2 h-9" onSelect={onLogout}>
              <LogOutIcon className="!size-5" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
