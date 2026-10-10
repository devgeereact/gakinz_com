import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, Download, RefreshCw, Mail, Building2, UserPlus, Tag, Flame } from "lucide-react"
import { downloadCsv, downloadXlsx } from "@/lib/csv"
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
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { leads, clients, type Lead, type LeadStage } from "@/lib/api"
import AiAssist from "@/app/components/AiAssist"
import { cn } from "@/lib/utils"

const SCORE_META: Record<number, { label: string; cls: string }> = {
  0: { label: "Unscored", cls: "bg-muted text-muted-foreground" },
  1: { label: "Cold", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  2: { label: "Warm", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  3: { label: "Hot", cls: "bg-destructive/10 text-destructive" },
}
const parseTags = (t: string | null) => (t ? t.split(",").map((x) => x.trim()).filter(Boolean) : [])

const STAGES: { key: LeadStage; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "proposal", label: "Proposal" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
]

function formatDate(iso: string) {
  return new Date(iso.replace(" ", "T")).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
}

export default function Leads() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [converting, setConverting] = useState<number | null>(null)

  // Lost-reason capture
  const [lostFor, setLostFor] = useState<Lead | null>(null)
  const [lostReason, setLostReason] = useState("")
  // Tags + score editor
  const [editFor, setEditFor] = useState<Lead | null>(null)
  const [editTags, setEditTags] = useState("")
  const [editScore, setEditScore] = useState("0")
  const [savingMeta, setSavingMeta] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await leads.list()
    if (res.ok) {
      setItems(res.data)
      setError(null)
    } else {
      setError(res.error)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const byStage = useMemo(() => {
    const map: Record<LeadStage, Lead[]> = { new: [], contacted: [], proposal: [], won: [], lost: [] }
    for (const l of items) (map[l.status] ?? map.new).push(l)
    return map
  }, [items])

  const move = async (lead: Lead, status: LeadStage) => {
    // Moving to "lost" → capture a reason first.
    if (status === "lost") {
      setLostFor(lead)
      setLostReason(lead.lost_reason ?? "")
      return
    }
    const prev = lead.status
    setItems((xs) => xs.map((x) => (x.id === lead.id ? { ...x, status, lost_reason: null } : x)))
    const res = await leads.setStatus(lead.id, status)
    if (!res.ok) {
      setItems((xs) => xs.map((x) => (x.id === lead.id ? { ...x, status: prev } : x)))
      toast.error(res.error || "Could not update the lead.")
    }
  }

  const confirmLost = async () => {
    if (!lostFor) return
    const id = lostFor.id
    const reason = lostReason.trim()
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status: "lost", lost_reason: reason } : x)))
    setLostFor(null)
    const res = await leads.setStatus(id, "lost", reason || undefined)
    if (!res.ok) {
      toast.error(res.error || "Could not update the lead.")
      load()
    }
  }

  const openEdit = (lead: Lead) => {
    setEditFor(lead)
    setEditTags(lead.tags ?? "")
    setEditScore(String(lead.score ?? 0))
  }
  const saveMeta = async () => {
    if (!editFor) return
    setSavingMeta(true)
    const tags = editTags.trim()
    const score = Number(editScore)
    const res = await leads.setMeta(editFor.id, { tags, score })
    setSavingMeta(false)
    if (res.ok) {
      setItems((xs) => xs.map((x) => (x.id === editFor.id ? { ...x, tags, score } : x)))
      setEditFor(null)
    } else toast.error(res.error || "Could not save.")
  }

  const convert = async (lead: Lead) => {
    setConverting(lead.id)
    const res = await clients.convertLead(lead.id)
    setConverting(null)
    if (res.ok) {
      toast.success(res.data.existing ? "Already a client — opening Clients." : `${lead.name} is now a client.`)
      navigate("/app/clients")
    } else {
      toast.error(res.error || "Could not convert the lead.")
    }
  }

  const leadHead = ["id", "name", "email", "company", "budget", "project_type", "status", "created_at"]
  const exportCsv = () =>
    downloadCsv("gakinz-leads.csv", leadHead, items as unknown as Record<string, unknown>[])
  const exportXlsx = () =>
    downloadXlsx("gakinz-leads.xlsx", leadHead, items as unknown as Record<string, unknown>[], "Leads")

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Enquiries</h1>
          <p className="text-sm text-muted-foreground">
            Every enquiry from the website, captured and chased to won or lost.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!items.length}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportXlsx} disabled={!items.length}>
            <Download className="mr-2 h-4 w-4" /> XLSX
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the leads endpoint and DB must be live on the server.
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading leads…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {STAGES.map((stage) => (
            <div key={stage.key} className="rounded-xl border border-border bg-muted/30">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-sm font-semibold">{stage.label}</span>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                  {byStage[stage.key].length}
                </span>
              </div>
              <div className="space-y-2 p-2">
                {byStage[stage.key].length === 0 ? (
                  <p className="px-1 py-4 text-center text-xs text-muted-foreground">No leads</p>
                ) : (
                  byStage[stage.key].map((lead) => (
                    <div key={lead.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{lead.name}</span>
                        <div className="flex items-center gap-1">
                          {lead.score > 0 && (
                            <span className={cn("inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium", SCORE_META[lead.score].cls)}>
                              <Flame className="h-2.5 w-2.5" /> {SCORE_META[lead.score].label}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">{formatDate(lead.created_at)}</span>
                        </div>
                      </div>
                      {parseTags(lead.tags).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {parseTags(lead.tags).map((t) => (
                            <span key={t} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{t}</span>
                          ))}
                        </div>
                      )}
                      {lead.status === "lost" && lead.lost_reason && (
                        <p className="mt-1 text-[11px] italic text-muted-foreground">Lost: {lead.lost_reason}</p>
                      )}
                      {lead.company && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" /> {lead.company}
                        </div>
                      )}
                      <a
                        href={`mailto:${lead.email}`}
                        className="mt-0.5 flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Mail className="h-3 w-3" /> {lead.email}
                      </a>
                      {(lead.project_type || lead.budget) && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {lead.project_type && (
                            <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground">
                              {lead.project_type}
                            </span>
                          )}
                          {lead.budget && (
                            <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] text-accent-foreground">
                              {lead.budget}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{lead.message}</p>
                      <div className="mt-2">
                        <AiAssist
                          task="lead_reply"
                          title={`Reply to ${lead.name}`}
                          label="AI reply"
                          variant="ghost"
                          input={`New enquiry from ${lead.name}${lead.company ? ` at ${lead.company}` : ""} (${lead.email}).${lead.project_type ? `\nProject type: ${lead.project_type}.` : ""}${lead.budget ? `\nBudget: ${lead.budget}.` : ""}\n\nTheir message:\n"${lead.message}"\n\nDraft GAkinz's first reply email: thank them, show we understood the project, ask one or two sharp scoping questions, and propose a short call. Sign off as the GAkinz studio team.`}
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <Select value={lead.status} onValueChange={(v) => move(lead, v as LeadStage)}>
                          <SelectTrigger className="h-8 flex-1 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STAGES.map((s) => (
                              <SelectItem key={s.key} value={s.key} className="text-xs">
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          title="Tags & score"
                          onClick={() => openEdit(lead)}
                        >
                          <Tag className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          title="Convert to client"
                          onClick={() => convert(lead)}
                          disabled={converting === lead.id}
                        >
                          {converting === lead.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lost-reason capture */}
      <Dialog open={!!lostFor} onOpenChange={(o) => !o && setLostFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark “{lostFor?.name}” as lost</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="lostreason">Why was it lost?</Label>
            <Textarea id="lostreason" rows={3} value={lostReason} onChange={(e) => setLostReason(e.target.value)} className="mt-1.5" placeholder="e.g. budget, timing, went with a competitor…" />
            <p className="mt-1.5 text-xs text-muted-foreground">Captured for win/loss reporting.</p>
          </div>
          <DialogFooter>
            <Button onClick={confirmLost}>Mark lost</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tags & score */}
      <Dialog open={!!editFor} onOpenChange={(o) => !o && setEditFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tags &amp; score — {editFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Score</Label>
              <Select value={editScore} onValueChange={setEditScore}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Unscored</SelectItem>
                  <SelectItem value="1">Cold</SelectItem>
                  <SelectItem value="2">Warm</SelectItem>
                  <SelectItem value="3">Hot</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ltags">Tags</Label>
              <Input id="ltags" value={editTags} onChange={(e) => setEditTags(e.target.value)} className="mt-1.5" placeholder="comma, separated, labels" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveMeta} disabled={savingMeta}>
              {savingMeta && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
