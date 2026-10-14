import { useEffect, useState } from "react"
import { AlertCircle, Loader2, Plus, RefreshCw, ExternalLink, Check, MessageSquare, Trash2, Eye, PenTool } from "lucide-react"
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
import { PageHeader, StatusBadge } from "@/app/components/page-kit"
import { TableSkeleton } from "@/app/components/TableSkeleton"
import { design, figma as figmaApi, projects as projectsApi, type DesignReview, type DesignStatus, type Project, type FigmaFile } from "@/lib/api"

const STATUS_LABEL: Record<DesignStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  changes: "Changes requested",
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

  // Figma preview dialog
  const [figmaOpen, setFigmaOpen] = useState(false)
  const [figmaData, setFigmaData] = useState<FigmaFile | null>(null)
  const [figmaLoading, setFigmaLoading] = useState(false)
  const [figmaErr, setFigmaErr] = useState<string | null>(null)

  const preview = async (r: DesignReview) => {
    if (!r.figma_url) return
    setFigmaOpen(true)
    setFigmaData(null)
    setFigmaErr(null)
    setFigmaLoading(true)
    const res = await figmaApi.file(r.figma_url)
    setFigmaLoading(false)
    if (res.ok) setFigmaData(res.data)
    else setFigmaErr(res.error)
  }

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
    <div>
      <PageHeader
        title="Design"
        subtitle="Figma review rounds with client sign-off. Two rounds per project, by design."
        actions={
          <>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> New review
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
                  {saving && <Loader2 className="animate-spin" />}
                  Create review
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
            <p className="font-semibold">Could not load design reviews.</p>
            <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {error}. The design endpoint and database must be live on the server.
            </p>
          </div>
          <Button variant="outline" onClick={load}>
            <RefreshCw /> Try again
          </Button>
        </div>
      )}

      {loading ? (
        <div className="overflow-hidden rounded-[14px] border bg-card">
          <TableSkeleton rows={4} cols={5} />
        </div>
      ) : items.length === 0 ? (
        !error && (
          <div className="grid place-items-center gap-2.5 rounded-2xl border border-dashed border-line-strong bg-card px-5 py-14 text-center">
            <span aria-hidden className="grid h-12 w-12 place-items-center rounded-[14px] bg-acc-soft text-acc">
              <PenTool className="h-5 w-5" />
            </span>
            <h2 className="font-display text-[1.2rem] font-semibold">No design reviews yet</h2>
            <p className="max-w-[46ch] text-muted-foreground">Create one against a project to start a review round.</p>
            <Button className="mt-1" onClick={() => setOpen(true)}>
              <Plus /> New review
            </Button>
          </div>
        )
      ) : (
        <>
          <div className="overflow-hidden rounded-[14px] border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Round</TableHead>
                  <TableHead>Figma</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="min-w-[180px]">
                      <b className="font-semibold">{r.title}</b>
                      {r.client_comment && (
                        <p className="mt-0.5 max-w-[40ch] text-xs text-muted-foreground">“{r.client_comment}”</p>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[140px]">{r.project_name}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono">{r.round} of 2</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {r.figma_url ? (
                        <a href={r.figma_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[12.5px] text-muted-foreground hover:text-acc hover:underline">
                          Open in Figma <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status}>{STATUS_LABEL[r.status]}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {r.figma_url && (
                          <Button variant="ghost" size="sm" onClick={() => preview(r)} title="Preview Figma file">
                            <Eye /> Preview
                          </Button>
                        )}
                        {r.status !== "approved" && (
                          <Button variant="ghost" size="sm" disabled={busyId === r.id} onClick={() => approve(r)}>
                            <Check /> Approve
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" disabled={busyId === r.id} onClick={() => { setChangeFor(r); setComment(r.client_comment ?? "") }}>
                          <MessageSquare /> Changes
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-bad" onClick={() => remove(r)} aria-label="Delete review">
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 text-[13px] text-muted-foreground">A third round can’t be created here. It needs a change to the quote first.</p>
        </>
      )}

      <Dialog open={figmaOpen} onOpenChange={setFigmaOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{figmaData?.name ?? "Figma preview"}</DialogTitle>
          </DialogHeader>
          {figmaLoading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading from Figma…
            </div>
          ) : figmaErr ? (
            <p className="py-6 text-sm text-muted-foreground">{figmaErr}</p>
          ) : figmaData ? (
            <div className="space-y-3">
              {figmaData.thumbnail ? (
                <img src={figmaData.thumbnail} alt={figmaData.name} className="w-full rounded-lg border border-border" />
              ) : (
                <p className="text-sm text-muted-foreground">No thumbnail available.</p>
              )}
              {figmaData.last_modified && (
                <p className="text-xs text-muted-foreground">
                  Last modified {new Date(figmaData.last_modified).toLocaleString("en-GB")}
                </p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

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
