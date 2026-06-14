import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
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
        <Button variant="ghost" size="icon" className="relative rounded-full h-10 w-10 hover:bg-muted/60" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {notes.length > 0 && (
            <span className="absolute right-2 top-2 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="border-b px-4 py-2.5 text-sm font-semibold">Notifications</div>
        {notes.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">You’re all caught up.</p>
        ) : (
          <ul className="divide-y">
            {notes.map((n) => (
              <li key={n.id}>
                <button onClick={() => navigate(n.to)} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-muted/50">
                  {n.label}
                  <span className="text-xs text-primary">View</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
