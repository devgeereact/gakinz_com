import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Loader2, Download, RefreshCw, Mail, UserPlus, Tag, CalendarClock, Inbox } from "lucide-react"
import { downloadCsv, downloadXlsx } from "@/lib/csv"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { leads, clients, type Lead, type LeadPriority, type LeadStage } from "@/lib/api"
import { followUpState, formatYmd, localIsoDate } from "@/lib/format"
import AiAssist from "@/app/components/AiAssist"
import { EmptyState, LoadError } from "@/app/components/EmptyState"
import { PageHeader, StatusBadge } from "@/app/components/page-kit"
import { cn } from "@/lib/utils"

type Tone = "ok" | "warn" | "bad" | "acc" | "secondary"

const SCORE_META: Record<number, { label: string; tone: Tone }> = {
  0: { label: "Unscored", tone: "secondary" },
  1: { label: "Cold", tone: "acc" },
  2: { label: "Warm", tone: "warn" },
  3: { label: "Hot", tone: "bad" },
}
// The owner's own priority, separate from the AI score above.
const PRIORITY_META: Record<number, { label: string; tone: Tone }> = {
  1: { label: "Low", tone: "secondary" },
  2: { label: "Normal", tone: "acc" },
  3: { label: "High", tone: "bad" },
}
const FOLLOW_META = {
  overdue: { label: "Overdue", tone: "bad" },
  today: { label: "Due today", tone: "warn" },
  upcoming: { label: "Next", tone: "secondary" },
} as const satisfies Record<string, { label: string; tone: Tone }>
const isDueOn = (l: Lead, today: string) => {
  const st = followUpState(l, today)
  return st === "overdue" || st === "today"
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
  const [searchParams, setSearchParams] = useSearchParams()
  const dueOnly = searchParams.get("due") === "1"
  const [items, setItems] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [converting, setConverting] = useState<number | null>(null)
  // A view filter only; nothing is saved.
  const [hotOnly, setHotOnly] = useState(false)

  // Lost-reason capture
  const [lostFor, setLostFor] = useState<Lead | null>(null)
  const [lostReason, setLostReason] = useState("")
  // Tags + score editor
  const [editFor, setEditFor] = useState<Lead | null>(null)
  const [editTags, setEditTags] = useState("")
  const [editScore, setEditScore] = useState("0")
  const [editPriority, setEditPriority] = useState("0")
  const [editNextAt, setEditNextAt] = useState("")
  const [editNextNote, setEditNextNote] = useState("")
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

  // The server omits the follow-up fields until the 2026-10-10 schema step runs.
  const followUpsReady = items.length === 0 || items.some((l) => l.priority !== undefined)
  const today = localIsoDate()
  const dueCount = items.filter((l) => isDueOn(l, today)).length
  const setDueOnly = (on: boolean) =>
    setSearchParams(
      (p) => {
        if (on) p.set("due", "1")
        else p.delete("due")
        return p
      },
      { replace: true },
    )

  const byStage = useMemo(() => {
    const map: Record<LeadStage, Lead[]> = { new: [], contacted: [], proposal: [], won: [], lost: [] }
    const shown = dueOnly
      ? items
          .filter((l) => isDueOn(l, today))
          .sort(
            (a, b) =>
              (a.next_action_at ?? "").localeCompare(b.next_action_at ?? "") || (b.priority ?? 0) - (a.priority ?? 0),
          )
      : items
    for (const l of shown) (map[l.status] ?? map.new).push(l)
    return map
  }, [items, dueOnly, today])

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
    setEditPriority(String(lead.priority ?? 0))
    setEditNextAt(lead.next_action_at ?? "")
    setEditNextNote(lead.next_action_note ?? "")
  }
  const saveMeta = async () => {
    if (!editFor) return
    setSavingMeta(true)
    const tags = editTags.trim()
    const score = Number(editScore)
    const follow = followUpsReady
      ? {
          priority: Number(editPriority) as LeadPriority,
          next_action_at: editNextAt || null,
          next_action_note: editNextNote.trim() || null,
        }
      : {}
    const res = await leads.setMeta(editFor.id, { tags, score, ...follow })
    setSavingMeta(false)
    if (res.ok) {
      const saved = res.data.followup !== false
      setItems((xs) => xs.map((x) => (x.id === editFor.id ? { ...x, tags, score, ...(saved ? follow : {}) } : x)))
      setEditFor(null)
      if (!saved) toast.warning("Tags and score saved. Follow-ups need the server database update first.")
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

  // Drawer, drag and drop. The drawer reads the lead from `items`, so a stage
  // change made while it is open shows straight away.
  const [openId, setOpenId] = useState<number | null>(null)
  const openLead = openId != null ? (items.find((l) => l.id === openId) ?? null) : null
  const [dragId, setDragId] = useState<number | null>(null)
  const [overStage, setOverStage] = useState<LeadStage | null>(null)
  const drop = (stage: LeadStage) => {
    const lead = items.find((l) => l.id === dragId)
    setDragId(null)
    setOverStage(null)
    if (lead && lead.status !== stage) move(lead, stage)
  }
  // Leaving the drawer for one of the existing dialogs.
  const fromDrawer = (fn: () => void) => {
    setOpenId(null)
    fn()
  }

  const hotCount = items.filter((l) => l.score === 3).length
  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-[34px] items-center gap-1 whitespace-nowrap rounded-full border px-3 text-[13px] font-medium transition-colors",
      active ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-line-strong",
    )

  return (
    <div>
      <PageHeader
        title="Enquiries"
        subtitle="Every enquiry from the website, captured and chased to won or lost."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={!items.length}>
              <Download /> CSV
            </Button>
            <Button variant="outline" onClick={exportXlsx} disabled={!items.length}>
              <Download /> XLSX
            </Button>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={cn(loading && "animate-spin")} /> Refresh
            </Button>
          </>
        }
      />

      {error && <LoadError what="enquiries" detail={`${error}. The leads endpoint and database must be live on the server.`} onRetry={load} className="mb-4" />}

      {!error && (
        <div className="mb-3.5 flex flex-wrap items-center gap-2" role="group" aria-label="Filter enquiries">
          <button type="button" className={chip(!dueOnly && !hotOnly)} aria-pressed={!dueOnly && !hotOnly} onClick={() => { setDueOnly(false); setHotOnly(false) }}>
            All {!loading && <span className="font-mono text-[11px] opacity-70">{items.length}</span>}
          </button>
          {followUpsReady && (
            <button type="button" className={chip(dueOnly)} aria-pressed={dueOnly} onClick={() => setDueOnly(!dueOnly)}>
              Follow-ups due {!loading && <span className="font-mono text-[11px] opacity-70">{dueCount}</span>}
            </button>
          )}
          <button type="button" className={chip(hotOnly)} aria-pressed={hotOnly} onClick={() => setHotOnly(!hotOnly)}>
            Hot {!loading && <span className="font-mono text-[11px] opacity-70">{hotCount}</span>}
          </button>
        </div>
      )}

      {loading ? (
        <div aria-busy="true" aria-label="Loading enquiries" className="grid auto-cols-[minmax(250px,1fr)] grid-flow-col gap-3.5 overflow-x-auto pb-2">
          {STAGES.map((s) => (
            <div key={s.key} className="flex min-h-[200px] flex-col gap-2 rounded-2xl border bg-secondary p-2.5">
              <Skeleton className="m-1.5 h-5 w-20 rounded-full" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          ))}
        </div>
      ) : !error && items.length === 0 ? (
        <EmptyState icon={Inbox} title="No enquiries yet" description="The public contact form feeds this board." />
      ) : !error ? (
        <>
          <div className="grid auto-cols-[minmax(250px,1fr)] grid-flow-col gap-3.5 overflow-x-auto pb-2">
            {STAGES.map((stage) => {
              const list = byStage[stage.key].filter((l) => !hotOnly || l.score === 3)
              return (
                <section
                  key={stage.key}
                  aria-label={`${stage.label}, ${list.length}`}
                  onDragOver={(e) => {
                    if (dragId == null) return
                    e.preventDefault()
                    setOverStage(stage.key)
                  }}
                  onDragLeave={() => setOverStage((s) => (s === stage.key ? null : s))}
                  onDrop={(e) => {
                    e.preventDefault()
                    drop(stage.key)
                  }}
                  className={cn(
                    "flex min-h-[200px] min-w-0 flex-col gap-2 rounded-2xl border bg-secondary p-2.5 transition-colors",
                    overStage === stage.key && "border-acc bg-acc-soft",
                  )}
                >
                  <div className="flex items-center gap-2 px-1.5 pb-2 pt-1">
                    <StatusBadge status={stage.key}>{stage.label}</StatusBadge>
                    <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">{list.length}</span>
                  </div>
                  {list.length === 0 ? (
                    <p className="px-1 py-4 text-center text-xs text-muted-foreground">No leads</p>
                  ) : (
                    list.map((lead) => {
                      const st = followUpState(lead, today)
                      const foot = [
                        lead.score > 0 ? SCORE_META[lead.score].label : null,
                        st && lead.next_action_at ? `${FOLLOW_META[st].label} ${formatYmd(lead.next_action_at)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                      return (
                        <button
                          key={lead.id}
                          type="button"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move"
                            setDragId(lead.id)
                          }}
                          onDragEnd={() => {
                            setDragId(null)
                            setOverStage(null)
                          }}
                          onClick={() => setOpenId(lead.id)}
                          aria-label={`${lead.company || lead.name}, ${lead.name}. ${stage.label}${foot ? `, ${foot}` : ""}. Open to change the stage.`}
                          className={cn(
                            "grid w-full cursor-grab gap-1.5 rounded-xl border bg-card p-3 text-left transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-os",
                            dragId === lead.id && "opacity-50",
                          )}
                        >
                          <b className="min-w-0 font-semibold [overflow-wrap:anywhere]">{lead.company || lead.name}</b>
                          <span className="min-w-0 text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                            {lead.company ? lead.name : lead.email}
                            {lead.project_type ? ` · ${lead.project_type}` : ""}
                          </span>
                          {(foot || lead.budget) && (
                            <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
                              <span className={cn("min-w-0", st === "overdue" && "text-bad", st === "today" && "text-warn")}>{foot}</span>
                              {lead.budget && <span className="min-w-0 font-mono tabular-nums [overflow-wrap:anywhere]">{lead.budget}</span>}
                            </span>
                          )}
                        </button>
                      )
                    })
                  )}
                </section>
              )
            })}
          </div>
          <p className="mt-3 text-[13px] text-muted-foreground">Drag a card to move it between stages, or open it to change the stage.</p>
        </>
      ) : null}

      {/* Enquiry drawer */}
      <Sheet open={!!openLead} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="flex flex-col gap-0 p-0 sm:p-0">
          {openLead && (
            <>
              <SheetHeader className="border-b p-5 pb-4 text-left">
                <SheetTitle className="[overflow-wrap:anywhere]">{openLead.company || openLead.name}</SheetTitle>
                <SheetDescription>Enquiry · {STAGES.find((s) => s.key === openLead.status)?.label}</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-5">
                <dl className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-x-4 gap-y-2.5 max-sm:grid-cols-1">
                  <dt className="text-[13.5px] text-muted-foreground">Contact</dt>
                  <dd className="m-0 min-w-0 [overflow-wrap:anywhere]">{openLead.name}</dd>
                  <dt className="text-[13.5px] text-muted-foreground">Email</dt>
                  <dd className="m-0 min-w-0 [overflow-wrap:anywhere]">
                    <a href={`mailto:${openLead.email}`} className="inline-flex items-center gap-1 text-acc hover:underline">
                      <Mail aria-hidden className="size-3.5 shrink-0" /> {openLead.email}
                    </a>
                  </dd>
                  <dt className="text-[13.5px] text-muted-foreground">Wants</dt>
                  <dd className="m-0 min-w-0 [overflow-wrap:anywhere]">{openLead.project_type || <span className="text-muted-foreground">Not given</span>}</dd>
                  <dt className="text-[13.5px] text-muted-foreground">Budget</dt>
                  <dd className="m-0 min-w-0 [overflow-wrap:anywhere]">{openLead.budget || <span className="text-muted-foreground">Not given</span>}</dd>
                  <dt className="text-[13.5px] text-muted-foreground">Score</dt>
                  <dd className="m-0">
                    <Badge variant={SCORE_META[openLead.score]?.tone ?? "secondary"}>{SCORE_META[openLead.score]?.label ?? "Unscored"}</Badge>
                  </dd>
                  {(openLead.priority ?? 0) > 0 && (
                    <>
                      <dt className="text-[13.5px] text-muted-foreground">Your priority</dt>
                      <dd className="m-0">
                        <Badge variant={PRIORITY_META[openLead.priority ?? 0].tone}>{PRIORITY_META[openLead.priority ?? 0].label}</Badge>
                      </dd>
                    </>
                  )}
                  {followUpsReady && (
                    <>
                      <dt className="text-[13.5px] text-muted-foreground">Follow-up</dt>
                      <dd className="m-0 min-w-0">
                        <FollowUp lead={openLead} today={today} />
                      </dd>
                    </>
                  )}
                  {parseTags(openLead.tags).length > 0 && (
                    <>
                      <dt className="text-[13.5px] text-muted-foreground">Tags</dt>
                      <dd className="m-0 flex min-w-0 flex-wrap gap-1.5">
                        {parseTags(openLead.tags).map((t) => (
                          <Badge key={t} variant="secondary" className="before:hidden">
                            {t}
                          </Badge>
                        ))}
                      </dd>
                    </>
                  )}
                  <dt className="text-[13.5px] text-muted-foreground">Received</dt>
                  <dd className="m-0 font-mono text-[13px] tabular-nums">{formatDate(openLead.created_at)}</dd>
                  {openLead.status === "lost" && openLead.lost_reason && (
                    <>
                      <dt className="text-[13.5px] text-muted-foreground">Lost because</dt>
                      <dd className="m-0 min-w-0 [overflow-wrap:anywhere]">{openLead.lost_reason}</dd>
                    </>
                  )}
                </dl>

                <p className="mb-1.5 mt-5 font-semibold">Their message</p>
                <p className="whitespace-pre-wrap text-muted-foreground [overflow-wrap:anywhere]">{openLead.message}</p>

                <div className="mt-5 grid gap-1.5">
                  <Label htmlFor="lead-stage">Stage</Label>
                  <Select
                    value={openLead.status}
                    onValueChange={(v) => (v === "lost" ? fromDrawer(() => move(openLead, "lost")) : move(openLead, v as LeadStage))}
                  >
                    <SelectTrigger id="lead-stage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s.key} value={s.key}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <SheetFooter className="m-0 px-5 pb-[calc(14px+env(safe-area-inset-bottom,0px))]">
                {openLead.status !== "lost" && (
                  <Button variant="destructive" onClick={() => fromDrawer(() => move(openLead, "lost"))}>
                    Mark lost
                  </Button>
                )}
                <Button variant="outline" onClick={() => fromDrawer(() => openEdit(openLead))}>
                  <Tag /> Tags, score and follow-up
                </Button>
                <AiAssist
                  task="lead_reply"
                  title={`Reply to ${openLead.name}`}
                  label="AI reply"
                  size="default"
                  input={`New enquiry from ${openLead.name}${openLead.company ? ` at ${openLead.company}` : ""} (${openLead.email}).${openLead.project_type ? `\nProject type: ${openLead.project_type}.` : ""}${openLead.budget ? `\nBudget: ${openLead.budget}.` : ""}\n\nTheir message:\n"${openLead.message}"\n\nDraft GAkinz's first reply email: thank them, show we understood the project, ask one or two sharp scoping questions, and propose a short call. Sign off as the GAkinz studio team.`}
                />
                <Button onClick={() => convert(openLead)} disabled={converting === openLead.id}>
                  {converting === openLead.id ? <Loader2 className="animate-spin" /> : <UserPlus />}
                  Convert to client
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

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
            <DialogTitle>Tags, score and follow-up: {editFor?.name}</DialogTitle>
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
            {followUpsReady ? (
              <>
                <div>
                  <Label htmlFor="lpriority">Priority</Label>
                  <Select value={editPriority} onValueChange={setEditPriority}>
                    <SelectTrigger id="lpriority" className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      <SelectItem value="1">Low</SelectItem>
                      <SelectItem value="2">Normal</SelectItem>
                      <SelectItem value="3">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-1.5 text-xs text-muted-foreground">Your own call, separate from the score.</p>
                </div>
                <div>
                  <Label htmlFor="lnextat">Next action date</Label>
                  <Input id="lnextat" type="date" value={editNextAt} onChange={(e) => setEditNextAt(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="lnextnote">Next action</Label>
                  <Input id="lnextnote" value={editNextNote} maxLength={300} onChange={(e) => setEditNextNote(e.target.value)} className="mt-1.5" placeholder="e.g. send the revised quote" />
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Follow-up dates and priority appear once the server database update has run.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={saveMeta} disabled={savingMeta}>
              {savingMeta && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Due, overdue or upcoming next action on an open enquiry, with its note.
function FollowUp({ lead, today }: { lead: Lead; today: string }) {
  const st = followUpState(lead, today)
  if (!st || !lead.next_action_at) return <span className="text-muted-foreground">None set</span>
  return (
    <div className="grid gap-1">
      <span>
        <Badge variant={FOLLOW_META[st].tone}>
          <CalendarClock aria-hidden className="size-3" />
          {FOLLOW_META[st].label} {formatYmd(lead.next_action_at)}
        </Badge>
      </span>
      {lead.next_action_note && <p className="text-[13px] text-muted-foreground [overflow-wrap:anywhere]">{lead.next_action_note}</p>}
    </div>
  )
}
