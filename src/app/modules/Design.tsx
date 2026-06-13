import { useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw, ExternalLink, Check, MessageSquare, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { design, projects as projectsApi, type DesignReview, type DesignStatus, type Project } from "@/lib/api"
import { cn } from "@/lib/utils"

const statusClass: Record<DesignStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  approved: "bg-accent text-accent-foreground",
  changes: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
}

export default function Design() {
  const [items, setItems] = useState<DesignReview[]>([])
  const [projectList, setProjectList] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState("")
  const [title, setTitle] = useState("")
  const [figma, setFigma] = useState("")
  const [saving, setSaving] = useState(false)

  // Request-changes dialog
  const [changeFor, setChangeFor] = useState<DesignReview | null>(null)
  const [comment, setComment] = useState("")

  const load = async () => {
    setLoading(true)
    const res = await design.list()
    if (res.ok) {
      setItems(res.data)
      setError(null)
    } else setError(res.error)
    setLoading(false)
  }

  useEffect(() => {
    load()
    projectsApi.list().then((r) => r.ok && setProjectList(r.data))
  }, [])

  const create = async () => {
    if (!projectId) return toast.error("Pick a project.")
    if (!title.trim()) return toast.error("A title is required.")
    setSaving(true)
    const res = await design.create({ project_id: Number(projectId), title: title.trim(), figma_url: figma || undefined })
    setSaving(false)
    if (res.ok) {
      toast.success(`Review round ${res.data.round} created.`)
      setProjectId("")
      setTitle("")
      setFigma("")
      setOpen(false)
      load()
    } else {
      toast.error(res.error || "Could not create the review.")
    }
  }

  const approve = async (r: DesignReview) => {
    setBusyId(r.id)
    const res = await design.setStatus(r.id, "approved")
    setBusyId(null)
    if (res.ok) setItems((xs) => xs.map((x) => (x.id === r.id ? { ...x, status: "approved" } : x)))
    else toast.error(res.error || "Could not approve.")
  }

  const submitChanges = async () => {
    if (!changeFor) return
    setBusyId(changeFor.id)
    const res = await design.setStatus(changeFor.id, "changes", comment)
    setBusyId(null)
    if (res.ok) {
      setItems((xs) => xs.map((x) => (x.id === changeFor.id ? { ...x, status: "changes", client_comment: comment } : x)))
      setChangeFor(null)
      setComment("")
    } else toast.error(res.error || "Could not save.")
  }

  const remove = async (r: DesignReview) => {
    const res = await design.remove(r.id)
    if (res.ok) setItems((xs) => xs.filter((x) => x.id !== r.id))
    else toast.error(res.error || "Could not delete.")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Design</h1>
          <p className="text-sm text-muted-foreground">
            Figma review rounds with client sign-off. Two rounds per project, by design.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> New review
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New design review</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
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
                <div>
                  <Label htmlFor="dtitle">Title</Label>
                  <Input id="dtitle" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" placeholder="e.g. Homepage — round 1" />
                </div>
                <div>
                  <Label htmlFor="dfigma">Figma link</Label>
                  <Input id="dfigma" value={figma} onChange={(e) => setFigma(e.target.value)} className="mt-1.5" placeholder="https://figma.com/…" />
                </div>
                <p className="text-xs text-muted-foreground">
                  The studio includes two review rounds per project. A third can’t be created here.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={create} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create review
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the design endpoint and DB must be live on the server.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading reviews…
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No design reviews yet. Create one against a project to start a review round.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Round</TableHead>
                <TableHead>Figma</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.project_name}</TableCell>
                  <TableCell>
                    {r.title}
                    {r.client_comment && (
                      <p className="mt-0.5 text-xs text-muted-foreground">“{r.client_comment}”</p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">R{r.round}</TableCell>
                  <TableCell>
                    {r.figma_url ? (
                      <a href={r.figma_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn("rounded px-2 py-0.5 text-xs font-medium", statusClass[r.status])}>{r.status}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {r.status !== "approved" && (
                        <Button variant="ghost" size="sm" disabled={busyId === r.id} onClick={() => approve(r)}>
                          <Check className="mr-1 h-3.5 w-3.5" /> Approve
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" disabled={busyId === r.id} onClick={() => { setChangeFor(r); setComment(r.client_comment ?? "") }}>
                        <MessageSquare className="mr-1 h-3.5 w-3.5" /> Changes
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(r)} aria-label="Delete review">
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

      <Dialog open={!!changeFor} onOpenChange={(o) => !o && setChangeFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="dcomment">Client comment</Label>
            <Textarea id="dcomment" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} className="mt-1.5" placeholder="What needs to change?" />
          </div>
          <DialogFooter>
            <Button onClick={submitChanges} disabled={busyId === changeFor?.id}>
              {busyId === changeFor?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
