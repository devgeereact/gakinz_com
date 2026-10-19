import { useEffect, useState } from "react"
import { AlertCircle, Gauge, Loader2, Plus, RefreshCw, Trash2, Plane } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/app/components/page-kit"
import { resourcing, type TeamMember, type LeaveEntry } from "@/lib/api"
import { cn } from "@/lib/utils"

function fmtDate(d: string) {
  return new Date(d.replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

const LEAVE_LABEL: Record<LeaveEntry["type"], string> = {
  holiday: "Holiday",
  sick: "Sick",
  other: "Other",
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

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
    <div>
      <PageHeader
        title="Resourcing"
        subtitle="This week’s capacity and who’s on leave, so start dates aren’t over-promised."
        actions={
          <>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> Add leave
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record leave</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="resourcing-sel1">Team member</Label>
                  <Select value={userId} onValueChange={setUserId}>
                    <SelectTrigger id="resourcing-sel1" className="mt-1.5"><SelectValue placeholder="Who?" /></SelectTrigger>
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
                  <Label htmlFor="resourcing-sel2">Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="resourcing-sel2" className="mt-1.5"><SelectValue /></SelectTrigger>
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
                  {saving && <Loader2 className="animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={load}>
            <RefreshCw /> Refresh
          </Button>
          </>
        }
      />

      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-start gap-3.5 rounded-2xl border border-bad/30 bg-bad-soft p-[18px] text-foreground">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-bad" />
          <div className="min-w-[min(100%,200px)] flex-1">
            <p className="font-semibold">Could not load resourcing.</p>
            <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {error}. The resourcing endpoint and database must be live on the server.
            </p>
          </div>
          <Button variant="outline" onClick={load}>
            <RefreshCw /> Try again
          </Button>
        </div>
      )}

      {loading ? (
        <div role="status" className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <Skeleton className="h-[240px] rounded-2xl" />
          <Skeleton className="h-[240px] rounded-2xl" />
          <span className="sr-only">Loading…</span>
        </div>
      ) : (
        !error && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            {/* Capacity */}
            <section className="min-w-0 rounded-2xl border bg-card">
              <h2 className="px-[18px] pb-3 pt-4 font-display text-[1.05rem] font-semibold tracking-[-0.01em]">This week</h2>
              <div className="px-[18px] pb-[18px]">
                {team.length === 0 ? (
                  <div className="grid place-items-center gap-2.5 rounded-2xl border border-dashed border-line-strong px-5 py-10 text-center">
                    <span aria-hidden className="grid h-12 w-12 place-items-center rounded-[14px] bg-acc-soft text-acc">
                      <Gauge className="h-5 w-5" />
                    </span>
                    <b className="font-display text-[1.1rem] font-semibold">No active team members</b>
                    <p className="max-w-[46ch] text-muted-foreground">Add people in Settings to plan capacity.</p>
                  </div>
                ) : (
                  <div>
                    {team.map((m) => {
                      const pct = m.capacity_minutes ? Math.round((m.logged_minutes / m.capacity_minutes) * 100) : 0
                      const over = pct > 100
                      return (
                        <div
                          key={m.id}
                          className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,10rem)_4rem] items-center gap-3 border-t py-3 first:border-t-0 max-sm:grid-cols-[minmax(0,1fr)_3.5rem] max-sm:gap-y-2"
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-acc-soft text-xs font-bold text-acc">
                              {initials(m.name)}
                            </span>
                            <span className="min-w-0">
                              <b className="block font-semibold [overflow-wrap:anywhere]">{m.name}</b>
                              <small className="block text-[12.5px] leading-snug text-muted-foreground [overflow-wrap:anywhere]">
                                <span className="font-mono tabular-nums">{hrs(m.logged_minutes)}h</span> of{" "}
                                <span className="font-mono tabular-nums">{hrs(m.capacity_minutes)}h</span> logged
                                {m.on_leave && (
                                  <span className="ml-1.5 inline-flex items-center gap-1 text-warn">
                                    <Plane className="h-3 w-3" /> On leave
                                  </span>
                                )}
                              </small>
                            </span>
                          </span>
                          <div
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${m.name} ${pct}% utilised`}
                            className="h-1.5 overflow-hidden rounded-full border bg-secondary max-sm:order-last max-sm:col-span-2"
                          >
                            <i className={cn("block h-full rounded-full", over ? "bg-bad" : "bg-acc")} style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                          <span className={cn("text-right font-mono tabular-nums", over && "text-bad")}>{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Leave */}
            <section className="min-w-0 rounded-2xl border bg-card">
              <h2 className="px-[18px] pb-3 pt-4 font-display text-[1.05rem] font-semibold tracking-[-0.01em]">Upcoming and current leave</h2>
              <div className="px-[18px] pb-[18px]">
                {leave.length === 0 ? (
                  <p className="py-3 text-muted-foreground">No leave booked.</p>
                ) : (
                  <div>
                    {leave.map((l) => (
                      <div key={l.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t py-3 first:border-t-0">
                        <span className="min-w-0">
                          <b className="block font-semibold [overflow-wrap:anywhere]">{l.user_name}</b>
                          <span className="block text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                            {LEAVE_LABEL[l.type]} · {fmtDate(l.start_date)} to {fmtDate(l.end_date)}
                            {l.note ? ` · ${l.note}` : ""}
                          </span>
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => removeLeave(l.id)} aria-label={`Remove leave for ${l.user_name}`}>
                          <Trash2 /> Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )
      )}
    </div>
  )
}
