import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bell } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { invoices as invoicesApi, support as supportApi } from "@/lib/api"
import { useAuth } from "@/store/auth.store"

type Note = { id: string; label: string; to: string }

// Derived notifications — no dedicated table. Surfaces the things that need
// attention right now (overdue invoices, open tickets) and links to the module.
export default function NotificationBell() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState<Note[]>([])
  const role = useAuth((s) => s.user?.role)

  useEffect(() => {
    if (!role) return
    let alive = true
    const out: Note[] = []
    Promise.allSettled([invoicesApi.list(), supportApi.list()]).then(([inv, sup]) => {
      if (!alive) return
      if (inv.status === "fulfilled" && inv.value.ok) {
        const overdue = inv.value.data.filter((i) => i.overdue).length
        if (overdue > 0) out.push({ id: "overdue", label: `${overdue} overdue invoice${overdue > 1 ? "s" : ""}`, to: "/app/invoicing" })
      }
      if (sup.status === "fulfilled" && sup.value.ok) {
        const open = sup.value.data.filter((t) => t.status !== "resolved").length
        if (open > 0) out.push({ id: "tickets", label: `${open} open ticket${open > 1 ? "s" : ""}`, to: "/app/support" })
      }
      setNotes(out)
    })
    return () => {
      alive = false
    }
  }, [role])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={notes.length ? `Notifications, ${notes.length} need attention` : "Notifications"}
          className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground hover:border-line-strong"
        >
          <Bell aria-hidden className="size-[18px]" />
          {notes.length > 0 && (
            <span aria-hidden className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-card bg-bad" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[300px] p-1.5">
        <div className="flex items-baseline justify-between gap-2.5 px-2.5 pb-1.5 pt-2.5">
          <b className="font-semibold">Notifications</b>
        </div>
        {notes.length === 0 ? (
          <p className="px-2.5 py-5 text-center text-sm text-muted-foreground">You are all caught up.</p>
        ) : (
          <ul>
            {notes.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => navigate(n.to)}
                  className="grid w-full grid-cols-[8px_minmax(0,1fr)_auto] items-start gap-2.5 rounded-[10px] p-2.5 text-left text-sm hover:bg-secondary"
                >
                  <i aria-hidden className="mt-[7px] h-2 w-2 rounded-full bg-acc" />
                  <span className="gk-os-wrap">{n.label}</span>
                  <span className="text-xs font-semibold text-acc">View</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
