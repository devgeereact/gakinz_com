import { useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw, Trash2, Plane } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { resourcing, type TeamMember, type LeaveEntry } from "@/lib/api"
import { cn } from "@/lib/utils"

function fmtDate(d: string) {
  return new Date(d.replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

const leaveClass: Record<LeaveEntry["type"], string> = {
  holiday: "bg-primary/10 text-primary",
  sick: "bg-destructive/10 text-destructive",
  other: "bg-muted text-muted-foreground",
}

export default function Resourcing() {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [leave, setLeave] = useState<LeaveEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState("")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [type, setType] = useState("holiday")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await resourcing.get()
    if (res.ok) {
      setTeam(res.data.team)
      setLeave(res.data.leave)
      setError(null)
    } else setError(res.error)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const addLeave = async () => {
    if (!userId) return toast.error("Pick a team member.")
    if (!start || !end) return toast.error("Start and end dates are required.")
    setSaving(true)
    const res = await resourcing.addLeave({ user_id: Number(userId), start_date: start, end_date: end, type, note: note || undefined })
    setSaving(false)
    if (res.ok) {
      toast.success("Leave recorded.")
      setUserId("")
      setStart("")
      setEnd("")
      setType("holiday")
      setNote("")
      setOpen(false)
      load()
    } else toast.error(res.error || "Could not record the leave.")
  }

  const removeLeave = async (id: number) => {
    const res = await resourcing.removeLeave(id)
    if (res.ok) setLeave((xs) => xs.filter((x) => x.id !== id))
    else toast.error(res.error || "Could not delete.")
  }

  const hrs = (min: number) => (min / 60).toFixed(1)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Resourcing</h1>
          <p className="text-sm text-muted-foreground">This week’s capacity and who’s on leave — so start dates aren’t over-promised.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add leave
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record leave</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Team member</Label>
                  <Select value={userId} onValueChange={setUserId}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Who?" /></SelectTrigger>
                    <SelectContent>
                      {team.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lstart">From</Label>
                    <Input id="lstart" type="date" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="lend">To</Label>
                    <Input id="lend" type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1.5" />
                  </div>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="holiday">Holiday</SelectItem>
                      <SelectItem value="sick">Sick</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="lnote">Note</Label>
                  <Input id="lnote" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1.5" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addLeave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the resourcing endpoint and DB must be live on the server.
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Capacity */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-3 text-sm font-semibold">Capacity this week</div>
            {team.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No active team members.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Logged</TableHead>
                    <TableHead>Utilisation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.map((m) => {
                    const pct = m.capacity_minutes ? Math.round((m.logged_minutes / m.capacity_minutes) * 100) : 0
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">
                          {m.name}
                          {m.on_leave && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                              <Plane className="h-3 w-3" /> on leave
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{hrs(m.logged_minutes)}h / {hrs(m.capacity_minutes)}h</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                              <div className={cn("h-full rounded-full", pct > 100 ? "bg-destructive" : "bg-primary")} style={{ width: `${Math.min(100, pct)}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{pct}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Leave */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-3 text-sm font-semibold">Upcoming &amp; current leave</div>
            {leave.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No leave booked.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leave.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.user_name}</TableCell>
                      <TableCell className="text-muted-foreground">{fmtDate(l.start_date)} – {fmtDate(l.end_date)}</TableCell>
                      <TableCell>
                        <span className={cn("rounded px-2 py-0.5 text-xs font-medium", leaveClass[l.type])}>{l.type}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLeave(l.id)} aria-label="Delete leave">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
