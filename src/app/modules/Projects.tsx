import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import { AlertCircle, FolderKanban, Loader2, Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
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
import { PageHeader, StatGrid, StatTile, StatusBadge } from "@/app/components/page-kit"
import { ProjectAssetsPanel } from "@/app/components/AssetChecklist"
import { ProjectBriefPanel } from "@/app/components/ProjectBrief"
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard"
import { UnsavedGuardDialog } from "@/components/unsaved-guard-dialog"
import { LINKED_RECORD, linkMark, linkRevision, projectsLink, recordElementId } from "@/lib/deepLink"
import { useApplyLink, useReveal } from "@/hooks/use-reveal"
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
  type ProjectTemplate,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import { CHECKLIST_OPTION, createOutcome, createPayload, parseTemplates, templatePreview } from "@/app/modules/projectTemplateModel"

// The Select needs a value for "no template"; createPayload() never sends it.
const NO_TEMPLATE = "none"
// The client checklist is unticked by default: the client sees it in their portal at once.
const EMPTY_FORM = { name: "", client_id: "", due_date: "", template: NO_TEMPLATE, include_checklist: false }

const PROJECT_STATUS: { key: ProjectStatus; label: string }[] = [
  { key: "planning", label: "Planning" },
  { key: "in_progress", label: "In progress" },
  { key: "on_hold", label: "On hold" },
  { key: "launched", label: "Launched" },
]

// 5-stage delivery pipeline (Discover · Design · Build · Launch · Support).
const PROJECT_STAGES: { key: ProjectStage; label: string }[] = [
  { key: "discover", label: "Discover" },
  { key: "design", label: "Design" },
  { key: "build", label: "Build" },
  { key: "launch", label: "Launch" },
  { key: "support", label: "Support" },
]
const stageLabel = (s: ProjectStage) => PROJECT_STAGES.find((x) => x.key === s)?.label ?? s

// Column names follow the approved prototype (D-046); the stored keys are unchanged.
const TASK_COLS: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "Next" },
  { key: "doing", label: "In progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
]

function fmt(d: string | null) {
  if (!d) return null
  return new Date(d.replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

const pct = (p: Project) => (p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0)

export default function Projects() {
  const [list, setList] = useState<Project[]>([])
  const [clientList, setClientList] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Project | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  // null until loaded, and for good when the server has no templates yet: the picker stays hidden.
  const [templates, setTemplates] = useState<ProjectTemplate[] | null>(null)
  const chosenTemplate = templates?.find((t) => t.key === form.template) ?? null
  const preview = useMemo(
    () => (chosenTemplate ? templatePreview(chosenTemplate, new Date(), form.include_checklist) : null),
    [chosenTemplate, form.include_checklist],
  )
  // ?project=<id>[&task=<id>|&asset=<id>] opens that project once the list has
  // loaded, and again whenever the link changes or the search re-sends it
  // (useApplyLink). An id that is not in the list leaves the plain screen.
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const link = projectsLink(searchParams)
  const mark = linkMark(link, location.state)

  // An open Brief edit is lost when another project is chosen, so ask first.
  const [briefDirty, setBriefDirty] = useState(false)
  const guard = useUnsavedGuard(briefDirty)

  const select = (p: Project) => {
    const apply = () => {
      setSelected(p)
      // The prototype brings the selected project's board into view.
      requestAnimationFrame(() => boardRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }))
    }
    // Re-choosing the open project keeps its panel (same key), so nothing is lost.
    if (p.id === selected?.id) apply()
    else guard.requestLeave(apply)
  }

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

  useApplyLink(mark, !loading && error === null, () => {
    const linked = link.project !== null ? list.find((p) => p.id === link.project) : undefined
    if (linked) select(linked)
  })

  useEffect(() => {
    loadProjects()
    clientsApi.list().then((r) => r.ok && setClientList(r.data))
    projects.templates().then((r) => setTemplates(r.ok ? parseTemplates(r.data) : null))
  }, [])

  const createProject = async () => {
    if (!form.name.trim()) {
      toast.error("A project name is required.")
      return
    }
    setSaving(true)
    const res = await projects.create(createPayload(form))
    setSaving(false)
    if (res.ok) {
      const outcome = createOutcome(chosenTemplate, res.data)
      toast.success(outcome.message)
      outcome.warnings.forEach((w) => toast.warning(w))
      setForm(EMPTY_FORM)
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
    <div>
      <PageHeader
        title="Projects"
        subtitle="Every build tracked from kickoff to launch."
        actions={
          <>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus /> New project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                  {templates && (
                    <div>
                      <Label htmlFor="ptemplate">Start from template</Label>
                      <Select value={form.template} onValueChange={(v) => setForm((f) => ({ ...f, template: v }))}>
                        <SelectTrigger id="ptemplate" className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_TEMPLATE}>No template</SelectItem>
                          {templates.map((t) => (
                            <SelectItem key={t.key} value={t.key}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {chosenTemplate && (
                        <label className="mt-3 flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4"
                            checked={form.include_checklist}
                            onChange={(e) => setForm((f) => ({ ...f, include_checklist: e.target.checked }))}
                          />
                          <span>{CHECKLIST_OPTION}</span>
                        </label>
                      )}
                      {chosenTemplate && preview && (
                        <section aria-label={`What ${chosenTemplate.name} creates`} className="mt-3 space-y-3 rounded-md border p-3 text-sm">
                          <p>
                            {chosenTemplate.summary} <span className="text-muted-foreground">Creates {preview.counts}.</span>
                          </p>
                          <div>
                            <p className="font-medium">Tasks</p>
                            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                              {preview.tasks.map((t) => (
                                <li key={t.title}>
                                  {t.title} <span className="whitespace-nowrap">({t.day}, due {fmt(t.due)})</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          {preview.assets.length > 0 && (
                            <div>
                              <p className="font-medium">Client checklist</p>
                              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                                {preview.assets.map((a) => (
                                  <li key={a}>{a}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div>
                            <p className="font-medium">Measurements</p>
                            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                              {preview.measurements.map((m) => (
                                <li key={m}>{m}</li>
                              ))}
                            </ul>
                          </div>
                          <p className="text-xs text-muted-foreground">{preview.note}</p>
                        </section>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={createProject} disabled={saving}>
                    {saving && <Loader2 className="animate-spin" />}
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={loadProjects}>
              <RefreshCw /> Refresh
            </Button>
          </>
        }
      />

      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-start gap-3.5 rounded-2xl border border-bad/30 bg-bad-soft p-[18px] text-foreground">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-bad" />
          <div className="min-w-[min(100%,200px)] flex-1">
            <p className="font-semibold">Could not load projects.</p>
            <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {error}. The projects endpoint and database must be live on the server.
            </p>
          </div>
          <Button variant="outline" onClick={loadProjects}>
            <RefreshCw /> Try again
          </Button>
        </div>
      )}

      {loading ? (
        <div role="status" aria-label="Loading projects" className="grid gap-4">
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
            {PROJECT_STAGES.map((s) => (
              <Skeleton key={s.key} className="h-[76px] rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[170px] rounded-2xl" />
            ))}
          </div>
          <span className="sr-only">Loading projects…</span>
        </div>
      ) : list.length === 0 ? (
        !error && (
          <div className="grid place-items-center gap-2.5 rounded-2xl border border-dashed border-line-strong bg-card px-5 py-14 text-center">
            <span aria-hidden className="grid h-12 w-12 place-items-center rounded-[14px] bg-acc-soft text-acc">
              <FolderKanban className="h-5 w-5" />
            </span>
            <h2 className="font-display text-[1.2rem] font-semibold">No projects yet</h2>
            <p className="max-w-[46ch] text-muted-foreground">Create one to start tracking a build.</p>
            <Button className="mt-1" onClick={() => setOpen(true)}>
              <Plus /> New project
            </Button>
          </div>
        )
      ) : (
        <>
          <StatGrid className="grid-cols-3 sm:grid-cols-5 xl:grid-cols-5">
            {stageTally.map((s) => (
              <StatTile key={s.key} label={s.label} value={s.count} />
            ))}
          </StatGrid>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => select(p)}
                aria-pressed={selected?.id === p.id}
                className={cn(
                  "grid min-w-0 content-start gap-2.5 rounded-2xl border bg-card p-[18px] text-left transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
                  selected?.id === p.id && "border-acc hover:border-acc",
                )}
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <StatusBadge status={p.stage}>{stageLabel(p.stage)}</StatusBadge>
                  <span className="text-[12.5px] text-muted-foreground">
                    {p.due_date ? `Due ${fmt(p.due_date)}` : p.status === "launched" ? "Launched" : "No due date"}
                  </span>
                </span>
                <span className="font-display text-[1.15rem] font-semibold leading-snug [overflow-wrap:anywhere]">{p.name}</span>
                <span className="min-w-0 text-muted-foreground [overflow-wrap:anywhere]">{p.client_company || "Internal"}</span>
                <Progress value={pct(p)} label={`${p.name}: ${pct(p)}% of tasks done`} />
                <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
                  <span>{PROJECT_STATUS.find((s) => s.key === p.status)?.label}</span>
                  <span className="font-mono tabular-nums">
                    {p.done_count}/{p.task_count} tasks · {pct(p)}%
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {selected && (
        <div ref={boardRef} className="mt-4 scroll-mt-4">
          <ProjectBoard
            project={selected}
            statusOptions={PROJECT_STATUS}
            stageOptions={PROJECT_STAGES}
            onStatusChange={(s) => setProjectStatus(selected, s)}
            onStageChange={(s) => setProjectStage(selected, s)}
            onTasksChanged={loadProjects}
            linkedTask={link.project === selected.id ? link.task : null}
            linkRevision={linkRevision(mark)}
          />
          <ProjectAssetsPanel
            key={selected.id}
            projectId={selected.id}
            projectName={selected.name}
            linkedAsset={link.project === selected.id ? link.asset : null}
            linkRevision={linkRevision(mark)}
          />
          <ProjectBriefPanel key={`brief-${selected.id}`} projectId={selected.id} projectName={selected.name} onDirtyChange={setBriefDirty} requestLeave={guard.requestLeave} />
        </div>
      )}
      <UnsavedGuardDialog prompt={guard.prompt} />
    </div>
  )
}

/** The prototype's `.prog`: a 6px track with the accent fill. */
function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-1.5 overflow-hidden rounded-full border bg-secondary"
    >
      <i className="block h-full rounded-full bg-acc" style={{ width: `${Math.min(value, 100)}%` }} />
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
  linkedTask = null,
  linkRevision = "",
}: {
  project: Project
  statusOptions: { key: ProjectStatus; label: string }[]
  stageOptions: { key: ProjectStage; label: string }[]
  onStatusChange: (s: ProjectStatus) => void
  onStageChange: (s: ProjectStage) => void
  onTasksChanged: () => void
  linkedTask?: number | null
  /** Changes when the link is re-applied, so the task is scrolled to again. */
  linkRevision?: string
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
  useReveal(linkedTask !== null && items.some((t) => t.id === linkedTask) ? recordElementId("task", linkedTask) : null, !loading, linkRevision)

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
    <section className="min-w-0 rounded-2xl border bg-card p-[18px]" aria-label={`${project.name} task board`}>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[min(100%,200px)] flex-1">
          <p className="font-mono text-xs uppercase tracking-[.08em] text-muted-foreground [overflow-wrap:anywhere]">
            {project.client_company || "Internal"}
          </p>
          <h2 className="mt-1 font-display text-[1.4rem] font-semibold leading-tight tracking-[-0.02em] [overflow-wrap:anywhere]">
            {project.name}
          </h2>
        </div>
        <div className="grid min-w-[160px] gap-1.5 max-sm:flex-1">
          <Label htmlFor="pst">Delivery stage</Label>
          <Select value={project.stage} onValueChange={(v) => onStageChange(v as ProjectStage)}>
            <SelectTrigger id="pst" aria-label="Delivery stage">
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
        </div>
        <div className="grid min-w-[160px] gap-1.5 max-sm:flex-1">
          <Label htmlFor="pss">Project status</Label>
          <Select value={project.status} onValueChange={(v) => onStatusChange(v as ProjectStatus)}>
            <SelectTrigger id="pss" aria-label="Project status">
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

      {loading ? (
        <div role="status" className="grid auto-cols-[minmax(250px,1fr)] grid-flow-col gap-3.5 overflow-x-auto pb-2">
          {TASK_COLS.map((c) => (
            <Skeleton key={c.key} className="h-[200px] rounded-2xl" />
          ))}
          <span className="sr-only">Loading tasks…</span>
        </div>
      ) : (
        <div
          role="region"
          aria-label="Task board, scrolls sideways"
          tabIndex={0}
          className="grid auto-cols-[minmax(250px,1fr)] grid-flow-col gap-3.5 overflow-x-auto rounded-2xl pb-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
          data-kanban
        >
          {TASK_COLS.map((col) => (
            <div key={col.key} className="flex min-h-[200px] flex-col gap-2 rounded-2xl border bg-secondary p-2.5">
              <div className="flex items-center gap-2 px-1.5 pb-2 pt-1">
                <StatusBadge status={col.label} />
                <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">{byStatus[col.key].length}</span>
              </div>
              {byStatus[col.key].map((task) => (
                <div
                  key={task.id}
                  id={recordElementId("task", task.id)}
                  className={cn(
                    "grid scroll-m-4 gap-1.5 rounded-xl border bg-card p-3 transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-sm",
                    task.id === linkedTask && LINKED_RECORD,
                  )}
                >
                  <b className="min-w-0 font-semibold [overflow-wrap:anywhere]">{task.title}</b>
                  <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
                    <span className="min-w-0 [overflow-wrap:anywhere]">{task.assignee || "Unassigned"}</span>
                    {fmt(task.due_date) && <span className="font-mono tabular-nums">{fmt(task.due_date)}</span>}
                  </span>
                  <Select value={task.status} onValueChange={(v) => moveTask(task, v as TaskStatus)}>
                    <SelectTrigger className="mt-1 h-8 text-xs" aria-label={`Move ${task.title}`}>
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
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex min-h-10 min-w-0 items-center gap-2 rounded-[10px] border bg-card pl-3 pr-1 focus-within:border-acc focus-within:shadow-[0_0_0_3px_hsl(var(--os-acc-soft))]">
        {adding ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" /> : <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />}
        <label htmlFor="ptask" className="sr-only">
          Add a task
        </label>
        <input
          id="ptask"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && addTask()}
          placeholder="Add a task and press Enter"
          className="min-h-[38px] w-full min-w-0 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button variant="ghost" size="sm" onClick={addTask} disabled={adding}>
          Add
        </Button>
      </div>
    </section>
  )
}
