"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

import {
  Search,
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
  FolderOpen,
  Sparkles,
  Newspaper,
  Quote,
  Briefcase,
  PanelTop,
  HeartPulse,
  UserRound,
  ChevronRight,
  Loader2,
  type LucideIcon,
} from "lucide-react"
import { useAuth } from "@/store/auth.store"
import { canAccess } from "@/lib/access"
import { recordSearch, type RecordType } from "@/lib/api"
import {
  canSearchRecords,
  createRecordSearcher,
  isSelectionKey,
  recordItemValue,
  type RecordSearchState,
} from "@/lib/recordSearchModel"

const RECORD_ICON: Record<RecordType, LucideIcon> = {
  client: Users,
  project: FolderKanban,
  enquiry: Inbox,
  invoice: Receipt,
  quote: FileText,
}

// The real GAkinzOS modules (same set + role keys as the sidebar). Cmd/Ctrl+K
// jumps to any module the signed-in role can open — no dead or demo links.
type Cmd = { key: string; label: string; path: string; icon: LucideIcon; keywords?: string[] }
const COMMANDS: Cmd[] = [
  { key: "dashboard", label: "Today", path: "/app", icon: LayoutDashboard },
  { key: "leads", label: "Enquiries", path: "/app/leads", icon: Inbox },
  { key: "clients", label: "Clients", path: "/app/clients", icon: Users },
  { key: "projects", label: "Projects", path: "/app/projects", icon: FolderKanban },
  { key: "design", label: "Design", path: "/app/design", icon: Palette },
  { key: "devpipeline", label: "Dev Pipeline", path: "/app/devpipeline", icon: GitBranch },
  { key: "proposals", label: "Quotes", path: "/app/proposals", icon: FileText },
  { key: "contracts", label: "Contracts", path: "/app/contracts", icon: FileSignature },
  { key: "invoicing", label: "Invoicing", path: "/app/invoicing", icon: Receipt },
  { key: "portal", label: "Client Portal", path: "/app/portal", icon: PanelsTopLeft },
  { key: "time", label: "Time", path: "/app/time", icon: Clock },
  { key: "resourcing", label: "Resourcing", path: "/app/resourcing", icon: CalendarRange },
  { key: "careplan", label: "Care Plan", path: "/app/careplan", icon: HeartPulse },
  { key: "support", label: "Support", path: "/app/support", icon: LifeBuoy },
  { key: "comms", label: "Comms", path: "/app/comms", icon: MessagesSquare },
  { key: "mailbox", label: "Mailbox", path: "/app/mailbox", icon: Mail },
  { key: "knowledge", label: "Knowledge", path: "/app/knowledge", icon: BookOpen },
  { key: "content", label: "Content Hub", path: "/app/content", icon: Sparkles },
  { key: "blog", label: "Blog", path: "/app/blog", icon: Newspaper },
  { key: "testimonials", label: "Testimonials", path: "/app/testimonials", icon: Quote },
  { key: "work", label: "Work", path: "/app/work", icon: Briefcase },
  {
    key: "site",
    label: "Site content",
    path: "/app/site",
    icon: PanelTop,
    keywords: ["hero", "homepage", "pricing", "faqs", "services"],
  },
  { key: "files", label: "Files", path: "/app/files", icon: FolderOpen },
  { key: "analytics", label: "Analytics", path: "/app/analytics", icon: BarChart3 },
  { key: "platform", label: "Settings", path: "/app/platform", icon: Settings },
  { key: "account", label: "My account", path: "/app/account", icon: UserRound },
]

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()
  const role = useAuth((s) => s.user?.role)

  const items = React.useMemo(() => COMMANDS.filter((c) => canAccess(role, c.key)), [role])

  // Records: clients, projects, enquiries, invoices and quotes from
  // server/search.php, debounced, with a stale request aborted. Screens above
  // are still filtered by the menu itself.
  const [query, setQuery] = React.useState("")
  const [records, setRecords] = React.useState<RecordSearchState>({ status: "idle" })
  // The menu's selected item, controlled so that arriving records can take the
  // selection from Modules, unless the user has moved it since typing.
  const [selected, setSelected] = React.useState("")
  const searcher = React.useMemo(
    () => createRecordSearcher({ role, find: recordSearch.find, onState: setRecords, onSelect: setSelected }),
    [role],
  )
  React.useEffect(() => () => searcher.dispose(), [searcher])
  const showRecords = canSearchRecords(role) && records.status !== "idle" && records.status !== "hidden"

  const onQuery = React.useCallback(
    (value: string) => {
      setQuery(value)
      searcher.update(value)
    },
    [searcher],
  )
  // Every open and close goes through here (button, Escape, Cmd/Ctrl+K, a
  // selection), so closing always clears the query, the timer and the request.
  const onOpenChange = React.useCallback(
    (next: boolean) => {
      setOpen(next)
      if (!next) onQuery("")
    },
    [onQuery],
  )

  // Keyboard shortcut (Ctrl + K / Cmd + K)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  const go = (path: string) => {
    onOpenChange(false)
    navigate(path)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="rounded-full [&_svg]:size-5 h-10 w-10 p-0"
        aria-label="Search"
      >
        <Search />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        commandProps={{
          value: selected,
          onValueChange: setSelected,
          onKeyDown: (e) => {
            if (isSelectionKey(e)) searcher.markMoved()
          },
          onPointerMove: () => searcher.markMoved(),
        }}
      >
        <div className="border-b">
          <CommandInput
            placeholder={canSearchRecords(role) ? "Jump to a module or find a record…" : "Jump to a module…"}
            className="h-12"
            value={query}
            onValueChange={onQuery}
          />
        </div>

        <CommandList className="max-h-[420px] overflow-y-auto">
          {!showRecords && (
            <CommandEmpty>
              <div className="py-10 text-center text-sm text-muted-foreground">No results found.</div>
            </CommandEmpty>
          )}

          {showRecords && (
            <CommandGroup heading="Records" forceMount>
              {records.status === "loading" && (
                <div role="status" className="flex items-center px-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="mr-3 h-4 w-4 animate-spin" aria-hidden="true" />
                  Searching records…
                </div>
              )}
              {records.status === "failed" && (
                <div role="alert" className="px-2 py-3 text-sm text-destructive">
                  Record search failed. {records.error}
                </div>
              )}
              {records.status === "ok" && records.groups.length === 0 && (
                <div role="status" className="px-2 py-3 text-sm text-muted-foreground">
                  No matching records.
                </div>
              )}
              {records.status === "ok" &&
                records.groups.flatMap((g) =>
                  g.items.map((r) => {
                    const Icon = RECORD_ICON[r.type]
                    return (
                      <CommandItem
                        key={`${r.type}-${r.id}`}
                        value={recordItemValue(r)}
                        forceMount
                        onSelect={() => go(r.route)}
                        className="group cursor-pointer"
                      >
                        <Icon className="mr-3 h-4 w-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{r.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {g.label}
                            {r.secondary ? `, ${r.secondary}` : ""}
                          </span>
                        </span>
                        <ChevronRight className="ml-auto h-4 w-4 shrink-0 opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
                      </CommandItem>
                    )
                  }),
                )}
              {records.status === "ok" && records.partial && (
                <div className="px-2 py-2 text-xs text-muted-foreground">
                  Some record types could not be searched just now, so this list may be incomplete.
                </div>
              )}
            </CommandGroup>
          )}

          <CommandGroup heading="Modules">
            {items.map((c) => {
              const Icon = c.icon
              return (
                <CommandItem
                  key={c.key}
                  value={c.label}
                  keywords={c.keywords}
                  onSelect={() => go(c.path)}
                  className="group cursor-pointer"
                >
                  <Icon className="mr-3 h-4 w-4 text-primary" />
                  <span>{c.label}</span>
                  <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
                </CommandItem>
              )
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
