import { ChevronDown, LogOut, Monitor, Moon, ShieldCheck, Sun, UserRound } from "lucide-react"
import { useTheme } from "next-themes"
import { Link, useNavigate } from "react-router-dom"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { auth as authApi } from "@/lib/api"
import { ROLE_LABEL } from "@/lib/access"
import { useAuth } from "@/store/auth.store"

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

// The prototype's user pill (D-046): initials, name and role, opening a menu
// with My account, sign-in security, the theme and Sign out.
export function UserDropdown() {
  const user = useAuth((s) => s.user)
  const clear = useAuth((s) => s.clear)
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  const name = user?.name ?? "Member"
  const role = user ? ROLE_LABEL[user.role] ?? user.role : ""

  const logout = async () => {
    await authApi.logout()
    clear()
    navigate("/login", { replace: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={role ? `${name}, ${role}` : name}
          className="flex h-10 max-w-[240px] shrink-0 items-center gap-2.5 rounded-full border border-border bg-card pl-1 pr-1.5 text-left hover:border-line-strong max-md:pr-1"
        >
          <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-acc-soft text-xs font-bold text-acc">
            {initials(name)}
          </span>
          <span className="min-w-0 max-md:hidden">
            <b className="block truncate text-[13px] font-semibold leading-tight">{name}</b>
            {role && <small className="block truncate text-[11px] leading-none text-muted-foreground">{role}</small>}
          </span>
          <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground max-md:hidden" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-[280px]">
        <DropdownMenuLabel className="px-2.5 pb-1.5 pt-2.5 font-normal">
          <b className="gk-os-wrap block font-semibold">{name}</b>
          {user?.email && <span className="gk-os-wrap block text-[13px] text-muted-foreground">{user.email}</span>}
          {role && <span className="block text-[13px] text-muted-foreground">{role}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/app/account">
            <UserRound aria-hidden />
            My account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/app/account#security">
            <ShieldCheck aria-hidden />
            Sign-in security
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="gk-os-mono px-2.5 py-1.5 font-normal text-muted-foreground">Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun aria-hidden className="mr-2 size-4" />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon aria-hidden className="mr-2 size-4" />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor aria-hidden className="mr-2 size-4" />
            Match my device
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout}>
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
