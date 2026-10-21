import { useEffect, useRef, useState } from "react"
import { useLoad } from "@/hooks/use-load"
import { Link } from "react-router-dom"
import { AlertCircle, Clock, Loader2, Play, Square, Plus, Trash2, RefreshCw, Check, X, Download } from "lucide-react"
import { PageHeader, StatGrid, StatTile, StatusBadge } from "@/app/components/page-kit"
import { TableSkeleton } from "@/app/components/TableSkeleton"
import { toast } from "sonner"
import { downloadCsv, downloadXlsx } from "@/lib/csv"
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
import { hoursMinutes } from "@/lib/format"
import { canAccess } from "@/lib/access"

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
  // A trainer may log time but has no Support screen, so sees the ticket number without a link.
  const canOpenTickets = canAccess(role, "support")
  const { data: entries, error, loading, reload: load, setData: setEntries } = useLoad<TimeEntry[]>(() => time.list(), [])
  const [projectList, setProjectList] = useState<Project[]>([])

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

  useEffect(() => {
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
  const timeHead = ["entry_date", "project_name", "description", "user_name", "billable", "minutes"]
  const approvedRows = () => entries.filter((e) => e.status === "approved") as unknown as Record<string, unknown>[]
  const exportApprovedCsv = () => {
    const rows = approvedRows()
    if (rows.length === 0) return toast.error("No approved entries to export.")
    downloadCsv("gakinz-approved-timesheet.csv", timeHead, rows)
  }
  const exportApprovedXlsx = () => {
    const rows = approvedRows()
    if (rows.length === 0) return toast.error("No approved entries to export.")
    downloadXlsx("gakinz-approved-timesheet.xlsx", timeHead, rows, "Timesheet")
  }

  const clock = `${String(Math.floor(elapsed / 3600)).padStart(2, "0")}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`

  return (
    <div>
      <PageHeader
        title="Time"
        subtitle="Approved billable hours against projects."
        actions={
          <>
            <Button onClick={exportApprovedCsv} disabled={!entries.length}>
              <Download /> Approved CSV
            </Button>
            <Button variant="outline" onClick={exportApprovedXlsx} disabled={!entries.length}>
              <Download /> XLSX
            </Button>
            <Button variant="outline" onClick={load}>
              <RefreshCw /> Refresh
            </Button>
          </>
        }
      />

      {/* Weekly summary: approved time only */}
      <StatGrid>
        <StatTile label="Billable this week" value={hoursMinutes(weekBillable)} note="Approved entries" />
        <StatTile label="Non-billable" value={hoursMinutes(weekNon)} note="Internal work" />
        <StatTile label="Utilisation" value={`${utilisation}%`} note="Billable share of approved time" tone={utilisation > 0 ? "up" : undefined} />
        <StatTile label="Awaiting approval" value={pending} note={pending === 1 ? "Entry" : "Entries"} />
      </StatGrid>

      {/* Log entry */}
      <section className="mb-4 rounded-2xl border bg-card p-[18px]" aria-label="Log time">
        <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_8rem_auto_auto]">
          <div className="grid min-w-0 gap-1.5">
            <Label htmlFor="tproj">Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="tproj" className="h-[42px]">
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
          <div className="grid min-w-0 gap-1.5">
            <Label htmlFor="tdesc">What did you do?</Label>
            <Input id="tdesc" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div className="grid min-w-0 gap-1.5">
            <Label htmlFor="tmin">Minutes</Label>
            <Input id="tmin" type="number" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </div>
          <div className="flex min-h-[42px] items-center gap-2">
            <Switch id="billable" checked={billable} onCheckedChange={setBillable} />
            <Label htmlFor="billable" className="cursor-pointer">Billable</Label>
          </div>
          <div className="flex flex-wrap gap-2">
            {running ? (
              <Button variant="outline" onClick={stopTimer}>
                <Square />
                <span className="font-mono tabular-nums">{clock}</span> Stop and fill minutes
              </Button>
            ) : (
              <Button variant="outline" onClick={startTimer}>
                <Play /> Start timer
              </Button>
            )}
            <Button onClick={log} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Plus />}
              Log
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-start gap-3.5 rounded-2xl border border-bad/30 bg-bad-soft p-[18px] text-foreground">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-bad" />
          <div className="min-w-[min(100%,200px)] flex-1">
            <p className="font-semibold">Could not load time entries.</p>
            <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {error}. The time endpoint and database must be live on the server.
            </p>
          </div>
          <Button variant="outline" onClick={load}>
            <RefreshCw /> Try again
          </Button>
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <div className="overflow-hidden rounded-[14px] border bg-card">
          <TableSkeleton rows={5} cols={6} />
        </div>
      ) : entries.length === 0 ? (
        !error && (
          <div className="grid place-items-center gap-2.5 rounded-2xl border border-dashed border-line-strong bg-card px-5 py-14 text-center">
            <span aria-hidden className="grid h-12 w-12 place-items-center rounded-[14px] bg-acc-soft text-acc">
              <Clock className="h-5 w-5" />
            </span>
            <h2 className="font-display text-[1.2rem] font-semibold">No time logged yet</h2>
            <p className="max-w-[46ch] text-muted-foreground">Use the timer or enter minutes above.</p>
          </div>
        )
      ) : (
        <div className="overflow-hidden rounded-[14px] border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Who</TableHead>
                <TableHead className="text-right">Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">{fmtDate(e.entry_date)}</TableCell>
                  <TableCell className="min-w-[140px]">
                    {e.project_name}
                    {e.ticket_id ? (
                      <span className="block text-[13px] text-muted-foreground">
                        {canOpenTickets ? (
                          <Link to={`/app/support?ticket=${e.ticket_id}`} className="underline underline-offset-2 hover:text-foreground">
                            Ticket #{e.ticket_id}
                          </Link>
                        ) : (
                          <>Ticket #{e.ticket_id}</>
                        )}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="min-w-[180px]">{e.description || <span className="text-muted-foreground">None</span>}</TableCell>
                  <TableCell className="whitespace-nowrap">{e.user_name || <span className="text-muted-foreground">Unknown</span>}</TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono">{hoursMinutes(e.minutes)}</TableCell>
                  <TableCell>{e.billable ? "Billable" : <span className="text-muted-foreground">Internal</span>}</TableCell>
                  <TableCell>
                    <StatusBadge status={e.status === "approved" ? "approved" : e.status === "rejected" ? "rejected" : "pending"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canApprove && e.status !== "approved" && (
                        <Button variant="ghost" size="sm" onClick={() => setApproval(e.id, true)} aria-label="Approve entry">
                          <Check /> Approve
                        </Button>
                      )}
                      {canApprove && e.status !== "rejected" && (
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-bad" onClick={() => setApproval(e.id, false)} aria-label="Reject entry" title="Reject">
                          <X />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => remove(e.id)} aria-label="Delete entry" title="Delete">
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
