import { useEffect, useMemo, useState } from "react"
import { Loader2, Plus, RefreshCw, CalendarDays } from "lucide-react"
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
  projects,
  tasks as tasksApi,
  clients as clientsApi,
  type Project,
  type ProjectStatus,
  type ProjectStage,
  type Task,
  type TaskStatus,
  type Client,
} from "@/lib/api"
import { cn } from "@/lib/utils"

const PROJECT_STATUS: { key: ProjectStatus; label: string }[] = [
  { key: "planning", label: "Planning" },
  { key: "in_progress", label: "In progress" },
  { key: "on_hold", label: "On hold" },
  { key: "launched", label: "Launched" },
]
const projectStatusClass: Record<ProjectStatus, string> = {
  planning: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  on_hold: "bg-secondary text-secondary-foreground",
  launched: "bg-accent text-accent-foreground",
}

// 5-stage delivery pipeline (Discover · Design · Build · Launch · Support).
const PROJECT_STAGES: { key: ProjectStage; label: string }[] = [
  { key: "discover", label: "Discover" },
  { key: "design", label: "Design" },
  { key: "build", label: "Build" },
  { key: "launch", label: "Launch" },
  { key: "support", label: "Support" },
]
const stageLabel = (s: ProjectStage) => PROJECT_STAGES.find((x) => x.key === s)?.label ?? s

const TASK_COLS: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "doing", label: "Doing" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
]

function fmt(d: string | null) {
  if (!d) return null
  return new Date(d.replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

export default function Projects() {
  const [list, setList] = useState<Project[]>([])
  const [clientList, setClientList] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Project | null>(null)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: "", client_id: "", due_date: "" })
  const [saving, setSaving] = useState(false)

  const loadProjects = async () => {
    setLoading(true)
    const res = await projects.list()
    if (res.ok) {
      setList(res.data)
      setError(null)
    } else {
      setError(res.error)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadProjects()
    clientsApi.list().then((r) => r.ok && setClientList(r.data))
  }, [])

  const createProject = async () => {
    if (!form.name.trim()) {
      toast.error("A project name is required.")
      return
    }
    setSaving(true)
    const res = await projects.create({
      name: form.name,
      client_id: form.client_id ? Number(form.client_id) : null,
      due_date: form.due_date || undefined,
    })
    setSaving(false)
    if (res.ok) {
      toast.success("Project created.")
      setForm({ name: "", client_id: "", due_date: "" })
      setOpen(false)
      loadProjects()
    } else {
      toast.error(res.error || "Could not create the project.")
    }
  }

  const setProjectStatus = async (p: Project, status: ProjectStatus) => {
    setList((xs) => xs.map((x) => (x.id === p.id ? { ...x, status } : x)))
    const res = await projects.setStatus(p.id, status)
    if (!res.ok) {
      loadProjects()
      toast.error(res.error || "Could not update the project.")
    }
  }

  const setProjectStage = async (p: Project, stage: ProjectStage) => {
    setList((xs) => xs.map((x) => (x.id === p.id ? { ...x, stage } : x)))
    if (selected?.id === p.id) setSelected({ ...selected, stage })
    const res = await projects.setStage(p.id, stage)
    if (!res.ok) {
      loadProjects()
      toast.error(res.error || "Could not update the stage.")
    }
  }

  // Count projects sitting in each delivery stage (the dashboard tally).
  const stageTally = PROJECT_STAGES.map((s) => ({
    ...s,
    count: list.filter((p) => p.stage === s.key).length,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Every build tracked from kickoff to launch.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadProjects}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> New project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pname">Name</Label>
                  <Input id="pname" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1.5" />
                </div>
                <div>
                  <Label>Client</Label>
                  <Select value={form.client_id} onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="No client / internal" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientList.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pdue">Due date</Label>
                  <Input id="pdue" type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} className="mt-1.5" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createProject} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the projects endpoint and DB must be live on the server.
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stageTally.map((s) => (
            <div key={s.key} className="rounded-xl border border-border bg-card p-4">
              <div className="text-2xl font-semibold text-primary">{s.count}</div>
              <div className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading projects…
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No projects yet. Create one to start tracking a build.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className={cn(
                "rounded-xl border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-sm",
                selected?.id === p.id ? "border-primary ring-1 ring-primary" : "border-border",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{p.name}</h3>
                <span className={cn("rounded px-2 py-0.5 text-xs font-medium", projectStatusClass[p.status])}>
                  {PROJECT_STATUS.find((s) => s.key === p.status)?.label}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.client_company || "Internal"}</p>
              <div className="mt-2">
                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">
                  {stageLabel(p.stage)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {p.done_count}/{p.task_count} tasks done
                </span>
                {p.due_date && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> {fmt(p.due_date)}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <ProjectBoard
          project={selected}
          statusOptions={PROJECT_STATUS}
          stageOptions={PROJECT_STAGES}
          onStatusChange={(s) => setProjectStatus(selected, s)}
          onStageChange={(s) => setProjectStage(selected, s)}
          onTasksChanged={loadProjects}
        />
      )}
    </div>
  )
}

function ProjectBoard({
  project,
  statusOptions,
  stageOptions,
  onStatusChange,
  onStageChange,
  onTasksChanged,
}: {
  project: Project
  statusOptions: { key: ProjectStatus; label: string }[]
  stageOptions: { key: ProjectStage; label: string }[]
  onStatusChange: (s: ProjectStatus) => void
  onStageChange: (s: ProjectStage) => void
  onTasksChanged: () => void
}) {
  const [items, setItems] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState("")
  const [adding, setAdding] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await tasksApi.list(project.id)
    if (res.ok) setItems(res.data)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], doing: [], review: [], done: [] }
    for (const t of items) (map[t.status] ?? map.todo).push(t)
    return map
  }, [items])

  const addTask = async () => {
    if (!newTitle.trim()) return
    setAdding(true)
    const res = await tasksApi.create({ project_id: project.id, title: newTitle.trim() })
    setAdding(false)
    if (res.ok) {
      setNewTitle("")
      load()
    } else {
      toast.error(res.error || "Could not add the task.")
    }
  }

  const moveTask = async (task: Task, status: TaskStatus) => {
    const prev = task.status
    setItems((xs) => xs.map((x) => (x.id === task.id ? { ...x, status } : x)))
    const res = await tasksApi.setStatus(task.id, status)
    if (!res.ok) {
      setItems((xs) => xs.map((x) => (x.id === task.id ? { ...x, status: prev } : x)))
      toast.error(res.error || "Could not move the task.")
    } else {
      onTasksChanged()
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-semibold">{project.name}</h2>
          <p className="text-sm text-muted-foreground">{project.client_company || "Internal"} · task board</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={project.stage} onValueChange={(v) => onStageChange(v as ProjectStage)}>
            <SelectTrigger className="h-9 w-36" aria-label="Delivery stage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {stageOptions.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={project.status} onValueChange={(v) => onStatusChange(v as ProjectStatus)}>
            <SelectTrigger className="h-9 w-40" aria-label="Project status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 py-4">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && addTask()}
          placeholder="Add a task and press Enter"
          className="max-w-md"
        />
        <Button onClick={addTask} disabled={adding}>
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading tasks…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {TASK_COLS.map((col) => (
            <div key={col.key} className="rounded-lg border border-border bg-muted/30">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-sm font-semibold">{col.label}</span>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                  {byStatus[col.key].length}
                </span>
              </div>
              <div className="space-y-2 p-2">
                {byStatus[col.key].length === 0 ? (
                  <p className="px-1 py-3 text-center text-xs text-muted-foreground">—</p>
                ) : (
                  byStatus[col.key].map((task) => (
                    <div key={task.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                      <p className="text-sm">{task.title}</p>
                      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{task.assignee || "Unassigned"}</span>
                        {fmt(task.due_date) && <span>{fmt(task.due_date)}</span>}
                      </div>
                      <Select value={task.status} onValueChange={(v) => moveTask(task, v as TaskStatus)}>
                        <SelectTrigger className="mt-2 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_COLS.map((c) => (
                            <SelectItem key={c.key} value={c.key} className="text-xs">
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
