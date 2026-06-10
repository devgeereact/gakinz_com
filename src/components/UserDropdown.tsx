"use client"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import {
  User,
  Settings,
  LayoutDashboard,
  Download,
  DollarSign,
  LogOut,
} from "lucide-react"

import { useNavigate } from "react-router-dom"
import { useAuth } from "@/store/auth.store"
import { auth as authApi } from "@/lib/api"

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  manager: "Manager",
  trainer: "Trainer",
  editor: "Editor",
  employee: "Employee",
  client: "Client",
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function UserDropdown() {
  const user = useAuth((s) => s.user)
  const clear = useAuth((s) => s.clear)
  const navigate = useNavigate()

  const name = user?.name ?? "Member"
  const role = user ? ROLE_LABELS[user.role] ?? user.role : ""

  const logout = async () => {
    await authApi.logout()
    clear()
    navigate("/login", { replace: true })
  }

  return (
    <DropdownMenu>
      {/* Trigger */}
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="rounded-full h-10 w-10 p-0 overflow-hidden ml-2"
        >
          <Avatar className="h-10 w-10 border-border rounded-full">
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      {/* Content */}
      <DropdownMenuContent align="end" className="w-56 p-3 rounded-xl shadow-xl">
        
        {/* Header */}
        <DropdownMenuLabel className="rounded-xl mb-3 bg-muted/50 border border-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{initials(name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">{role}</p>
            </div>
          </div>
        </DropdownMenuLabel>

        {/* Items */}
        <DropdownMenuItem className="gap-2 h-9">
          <User className="!size-5" />
          Profile
        </DropdownMenuItem>

        <DropdownMenuItem className="gap-2 h-9">
          <Settings className="!size-5" />
          Settings
        </DropdownMenuItem>

        <DropdownMenuItem className="gap-2 h-9">
          <LayoutDashboard className="!size-5" />
          Dashboard
        </DropdownMenuItem>

        <DropdownMenuSeparator className="border-1 my-2"/>

        <DropdownMenuItem className="gap-2 h-9">
          <Download className="!size-5" />
          Downloads
        </DropdownMenuItem>

        <DropdownMenuItem className="gap-2 h-9">
          <DollarSign className="!size-5" />
          Earnings
        </DropdownMenuItem>

        <DropdownMenuSeparator className="border-1 my-2" />

        {/* Logout */}
        <div className="mt-3">
          <Button
           onClick={logout}
           variant={"default"}
           className="w-full h-8 justify-center gap-2">
            <LogOut className="size-4" />
            Logout
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}