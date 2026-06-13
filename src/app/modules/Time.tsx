import { useEffect, useRef, useState } from "react"
import { Loader2, Play, Square, Plus, Trash2, RefreshCw, Check, X, Download } from "lucide-react"
import { toast } from "sonner"
import { downloadCsv } from "@/lib/csv"
import { useAuth } from "@/store/auth.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import { time, projects as projectsApi, type TimeEntry, type Project } from "@/lib/api"

function hm(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
function fmtDate(d: string) {
  return new Date(d.replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}
function isThisWeek(d: string) {
  const date = new Date(d.replace(" ", "T"))
  const now = new Date()
  const day = (now.getDay() + 6) % 7 // Monday = 0
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(now.getDate() - day)
  return date >= monday
}

const APPROVER_ROLES = ["super_admin", "admin", "manager"]

export default function Time() {
  const role = useAuth((s) => s.user?.role)
  const canApprove = !!role && APPROVER_ROLES.includes(role)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [projectList, setProjectList] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Log form
  const [projectId, setProjectId] = useState("")
  const [desc, setDesc] = useState("")
  const [minutes, setMinutes] = useState("")
  const [billable, setBillable] = useState(true)
  const [saving, setSaving] = useState(false)

  // Timer
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0) // seconds
  const tick = useRef<number | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await time.list()
    if (res.ok) {
      setEntries(res.data)
      setError(null)
    } else {
      setError(res.error)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    projectsApi.list().then((r) => r.ok && setProjectList(r.data))
    return () => {
      if (tick.current) window.clearInterval(tick.current)
    }
  }, [])

  const startTimer = () => {
    setRunning(true)
    tick.current = window.setInterval(() => setElapsed((s) => s + 1), 1000)
  }
  const stopTimer = () => {
    setRunning(false)
    if (tick.current) window.clearInterval(tick.current)
    const mins = Math.max(1, Math.round(elapsed / 60))
    setMinutes(String(mins))
    setElapsed(0)
  }

  const log = async () => {
    if (!projectId) return toast.error("Pick a project.")
    const mins = parseInt(minutes, 10)
    if (!mins || mins <= 0) return toast.error("Enter minutes (or use the timer).")
    setSaving(true)
    const res = await time.create({
      project_id: Number(projectId),
      minutes: mins,
      description: desc || undefined,
      billable,
      entry_date: new Date().toISOString().slice(0, 10),
    })
    setSaving(false)
    if (res.ok) {
      toast.success("Time logged.")
      setDesc("")
      setMinutes("")
      load()
    } else {
      toast.error(res.error || "Could not log the time.")
    }
  }

  const remove = async (id: number) => {
    const res = await time.remove(id)
    if (res.ok) setEntries((xs) => xs.filter((x) => x.id !== id))
    else toast.error(res.error || "Could not delete.")
  }

  const setApproval = async (id: number, approve: boolean) => {
    const res = approve ? await time.approve(id) : await time.reject(id)
    if (res.ok) {
      setEntries((xs) => xs.map((x) => (x.id === id ? { ...x, status: approve ? "approved" : "rejected" } : x)))
    } else {
      toast.error(res.error || "Could not update the entry.")
    }
  }

  const pending = entries.filter((e) => e.status === "draft").length

  // Only APPROVED time counts toward billable totals + utilisation.
  const weekEntries = entries.filter((e) => isThisWeek(e.entry_date) && e.status === "approved")
  const weekBillable = weekEntries.filter((e) => e.billable).reduce((s, e) => s + e.minutes, 0)
  const weekNon = weekEntries.filter((e) => !e.billable).reduce((s, e) => s + e.minutes, 0)
  const weekTotal = weekBillable + weekNon
  const utilisation = weekTotal > 0 ? Math.round((weekBillable / weekTotal) * 100) : 0

  // Export approved entries only (the billable record of truth).
  const exportApprovedCsv = () => {
    const head = ["entry_date", "project_name", "description", "user_name", "billable", "minutes"]
    const approved = entries.filter((e) => e.status === "approved")
    if (approved.length === 0) return toast.error("No approved entries to export.")
    downloadCsv("gakinz-approved-timesheet.csv", head, approved as unknown as Record<string, unknown>[])
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Time</h1>
          <p className="text-sm text-muted-foreground">
            Approved billable hours against projects.
            {pending > 0 && (
              <span className="ml-2 rounded bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                {pending} awaiting approval
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportApprovedCsv} disabled={!entries.length}>
            <Download className="mr-2 h-4 w-4" /> Approved CSV
          </Button>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Weekly summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Billable this week", value: hm(weekBillable) },
          { label: "Non-billable", value: hm(weekNon) },
          { label: "Utilisation", value: `${utilisation}%` },
        ].map((s) => (
          <div key={s.label} className="gk-app-card p-5">
            <div className="text-2xl font-semibold text-primary">{s.value}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Log entry */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Pick a project" />
              </SelectTrigger>
              <SelectContent>
                {projectList.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-48 flex-[2]">
            <Label htmlFor="tdesc">What did you do?</Label>
            <Input id="tdesc" value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1.5" />
          </div>
          <div className="w-28">
            <Label htmlFor="tmin">Minutes</Label>
            <Input id="tmin" type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="mt-1.5" />
          </div>
          <div className="flex items-center gap-2 pb-2.5">
            <Switch id="billable" checked={billable} onCheckedChange={setBillable} />
            <Label htmlFor="billable" className="cursor-pointer">Billable</Label>
          </div>
          <Button onClick={log} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Log
          </Button>
        </div>

        {/* Timer */}
        <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
          <span className="font-mono text-lg tabular-nums">
            {String(Math.floor(elapsed / 3600)).padStart(2, "0")}:
            {String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:
            {String(elapsed % 60).padStart(2, "0")}
          </span>
          {running ? (
            <Button variant="outline" size="sm" onClick={stopTimer}>
              <Square className="mr-2 h-4 w-4" /> Stop &amp; fill minutes
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={startTimer}>
              <Play className="mr-2 h-4 w-4" /> Start timer
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the time endpoint and DB must be live on the server.
        </div>
      )}

      {/* Entries */}
      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading entries…
          </div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No time logged yet. Use the timer or enter minutes above.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Billable</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Time</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(e.entry_date)}</TableCell>
                  <TableCell className="font-medium">{e.project_name}</TableCell>
                  <TableCell className="text-muted-foreground">{e.description || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{e.user_name || "—"}</TableCell>
                  <TableCell>
                    {e.billable ? (
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Billable</span>
                    ) : (
                      <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">Internal</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {e.status === "approved" ? (
                      <span className="rounded bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">Approved</span>
                    ) : e.status === "rejected" ? (
                      <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Rejected</span>
                    ) : (
                      <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">Pending</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">{hm(e.minutes)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canApprove && e.status !== "approved" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => setApproval(e.id, true)} aria-label="Approve entry" title="Approve">
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canApprove && e.status !== "rejected" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setApproval(e.id, false)} aria-label="Reject entry" title="Reject">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(e.id)} aria-label="Delete entry">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
