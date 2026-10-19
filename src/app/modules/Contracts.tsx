import { useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw, Send, PenLine, FileDown, Trash2, AlertCircle, FileSignature } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
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
import {
  contracts,
  clients as clientsApi,
  projects as projectsApi,
  type Contract,
  type ContractDetail,
  type ContractKind,
  type Client,
  type Project,
} from "@/lib/api"
import { isDirty } from "@/lib/dirty-model"
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard"
import { UnsavedGuardDialog } from "@/components/unsaved-guard-dialog"
import { PageHeader, StatusBadge } from "@/app/components/page-kit"
import { EmptyState } from "@/app/components/EmptyState"
import { TableSkeleton } from "@/app/components/TableSkeleton"

// NDA triage flag, shown as a pill in the semantic tone for its risk.
const TRIAGE: Record<"green" | "yellow" | "red", { label: string; variant: "ok" | "warn" | "bad" }> = {
  green: { label: "Green", variant: "ok" },
  yellow: { label: "Yellow", variant: "warn" },
  red: { label: "Red", variant: "bad" },
}
const KIND_LABEL: Record<ContractKind, string> = { agreement: "Service Agreement", nda: "Mutual NDA" }

// Client-side template library with merge fields ({{client}}, {{project}}, {{date}}).
const TEMPLATES: Record<string, { kind: ContractKind; title: string; body: string }> = {
  service: {
    kind: "agreement",
    title: "Service Agreement",
    body: `SERVICE AGREEMENT\n\nBetween GAkinz ("the Studio") and {{client}} ("the Client"), dated {{date}}.\n\n1. Scope. The Studio will deliver the work agreed for the project "{{project}}" as set out in the accepted proposal.\n2. Fees. Payable per the agreed 40/30/30 schedule.\n3. Revisions. Two review rounds are included per design stage.\n4. Ownership. On final payment, deliverables transfer to the Client.\n5. Term. This agreement runs until the project is launched and the settling-in period ends.\n\nSigned for the Client:`,
  },
  nda: {
    kind: "nda",
    title: "Mutual NDA",
    body: `MUTUAL NON-DISCLOSURE AGREEMENT\n\nBetween GAkinz and {{client}}, dated {{date}}.\n\n1. Both parties may share confidential information relating to "{{project}}".\n2. Each party will keep the other's confidential information secret and use it only for the purpose of working together.\n3. Obligations survive for three years from disclosure.\n\nSigned for the Client:`,
  },
}

function fmt(d: string | null) {
  if (!d) return "—"
  return new Date(d.replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export default function Contracts() {
  const [items, setItems] = useState<Contract[]>([])
  const [clientList, setClientList] = useState<Client[]>([])
  const [projectList, setProjectList] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  // Create form
  const [open, setOpen] = useState(false)
  const [template, setTemplate] = useState("service")
  const [title, setTitle] = useState("")
  const [clientId, setClientId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [triage, setTriage] = useState("")
  const [body, setBody] = useState("")
  const [signerName, setSignerName] = useState("")
  const [saving, setSaving] = useState(false)

  // Sign dialog
  const [signFor, setSignFor] = useState<Contract | null>(null)
  const [signedName, setSignedName] = useState("")

  const load = async () => {
    setLoading(true)
    const res = await contracts.list()
    if (res.ok) {
      setItems(res.data)
      setError(null)
    } else setError(res.error)
    setLoading(false)
  }

  useEffect(() => {
    load()
    clientsApi.list().then((r) => r.ok && setClientList(r.data))
    projectsApi.list().then((r) => r.ok && setProjectList(r.data))
  }, [])

  // What a template produces for the chosen client and project, merged into the body.
  const renderTemplate = (key: string, cId = clientId, pId = projectId) => {
    const t = TEMPLATES[key]
    if (!t) return null
    const company = clientList.find((c) => String(c.id) === cId)?.company ?? "the Client"
    const proj = projectList.find((p) => String(p.id) === pId)?.name ?? "the project"
    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    return {
      title: t.title,
      body: t.body.replace(/\{\{client\}\}/g, company).replace(/\{\{project\}\}/g, proj).replace(/\{\{date\}\}/g, today),
    }
  }
  const applyTemplate = (key: string, cId = clientId, pId = projectId) => {
    const r = renderTemplate(key, cId, pId)
    if (!r) return
    setTitle(r.title)
    setBody(r.body)
  }

  // Dirty means the owner changed the text away from the template, or filled the extra fields.
  const generated = renderTemplate(template)
  const contractDirty =
    open && (isDirty({ title, body }, generated ?? { title: "", body: "" }) || triage !== "" || signerName !== "")
  const guard = useUnsavedGuard(contractDirty)
  const closeContract = () =>
    guard.requestLeave(() => {
      setClientId("")
      setProjectId("")
      setTriage("")
      setSignerName("")
      setOpen(false)
    })

  useEffect(() => {
    if (open) applyTemplate(template)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template, clientId, projectId])

  const create = async () => {
    if (!title.trim()) return toast.error("A title is required.")
    setSaving(true)
    const res = await contracts.create({
      title: title.trim(),
      client_id: clientId ? Number(clientId) : null,
      project_id: projectId ? Number(projectId) : null,
      kind: TEMPLATES[template]?.kind ?? "agreement",
      body,
      nda_triage: triage || undefined,
      signer_name: signerName || undefined,
    })
    setSaving(false)
    if (res.ok) {
      toast.success("Contract created.")
      setOpen(false)
      setClientId("")
      setProjectId("")
      setTriage("")
      setSignerName("")
      load()
    } else toast.error(res.error || "Could not create the contract.")
  }

  const setStatus = async (c: Contract, status: "draft" | "sent" | "void") => {
    setBusyId(c.id)
    const res = await contracts.setStatus(c.id, status)
    setBusyId(null)
    if (res.ok) setItems((xs) => xs.map((x) => (x.id === c.id ? { ...x, status } : x)))
    else toast.error(res.error || "Could not update.")
  }

  const sign = async () => {
    if (!signFor) return
    if (!signedName.trim()) return toast.error("Type the full name to sign.")
    setBusyId(signFor.id)
    const res = await contracts.sign(signFor.id, signedName.trim())
    setBusyId(null)
    if (res.ok) {
      setItems((xs) => xs.map((x) => (x.id === signFor.id ? { ...x, status: "signed", signed_at: new Date().toISOString(), signer_name: signedName.trim() } : x)))
      setSignFor(null)
      setSignedName("")
      toast.success("Signed.")
    } else toast.error(res.error || "Could not sign.")
  }

  const remove = async (c: Contract) => {
    const res = await contracts.remove(c.id)
    if (res.ok) setItems((xs) => xs.filter((x) => x.id !== c.id))
    else toast.error(res.error || "Could not delete.")
  }

  const downloadPdf = async (c: Contract) => {
    setBusyId(c.id)
    const res = await contracts.get(c.id)
    setBusyId(null)
    if (res.ok) await renderContractPdf(res.data)
    else toast.error(res.error || "Could not load the contract.")
  }

  const newContractDialog = (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeContract())}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> New contract
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New contract</DialogTitle>
        </DialogHeader>
        <div className="grid gap-[14px]">
          <div className="grid gap-[14px] sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Template</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Service Agreement</SelectItem>
                  <SelectItem value="nda">Mutual NDA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="No client" /></SelectTrigger>
                <SelectContent>
                  {clientList.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
                <SelectContent>
                  {projectList.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {template === "nda" && (
              <div className="grid gap-1.5">
                <Label>NDA triage</Label>
                <Select value={triage} onValueChange={setTriage}>
                  <SelectTrigger><SelectValue placeholder="Risk flag" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="green">Green: standard</SelectItem>
                    <SelectItem value="yellow">Yellow: review</SelectItem>
                    <SelectItem value="red">Red: legal review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ctitle">Title</Label>
            <Input id="ctitle" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cbody">Body</Label>
            <Textarea id="cbody" rows={8} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-xs" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="csigner">Signer name (expected)</Label>
            <Input id="csigner" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeContract}>
            Cancel
          </Button>
          <Button onClick={create} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return (
    <div>
      <PageHeader
        title="Contracts"
        subtitle="Agreements and NDAs with typed e-signature and an audit trail."
        actions={
          <>
            {newContractDialog}
            <Button variant="outline" onClick={load}>
              <RefreshCw /> Refresh
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        {error && (
          <div role="alert" className="flex flex-wrap items-start gap-3.5 rounded-2xl border border-bad/30 bg-bad-soft p-[18px] text-foreground">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-bad" aria-hidden="true" />
            <div className="min-w-[min(100%,200px)] flex-1">
              <p className="font-semibold">Contracts could not be loaded</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}. The contracts endpoint and database must be live on the server.</p>
            </div>
            <Button variant="outline" onClick={load}>
              <RefreshCw /> Try again
            </Button>
          </div>
        )}

        {loading ? (
          <div className="overflow-hidden rounded-[14px] border bg-card">
            <TableSkeleton rows={4} cols={4} />
          </div>
        ) : error ? null : items.length === 0 ? (
          <EmptyState
            icon={FileSignature}
            title="No contracts yet"
            description="Create one from a template to get a signable document."
            className="rounded-2xl border border-dashed border-line-strong bg-card py-14"
          />
        ) : (
          <div className="overflow-hidden rounded-[14px] border bg-card">
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="min-w-[12rem]">
                      <span className="font-semibold [overflow-wrap:anywhere]">{c.title}</span>
                      {c.nda_triage && (
                        <Badge variant={TRIAGE[c.nda_triage].variant} className="ml-2 align-middle">
                          {TRIAGE[c.nda_triage].label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[9rem] [overflow-wrap:anywhere]">{c.client_company || <span className="text-muted-foreground">No client</span>}</TableCell>
                    <TableCell className="whitespace-nowrap">{KIND_LABEL[c.kind] ?? c.kind}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="min-w-[9rem]">
                      {c.signed_at ? (
                        <>
                          <span className="[overflow-wrap:anywhere]">{c.signer_name ?? ""}</span>
                          <span className="block whitespace-nowrap text-[12.5px] text-muted-foreground">{fmt(c.signed_at)}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Not yet</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" disabled={busyId === c.id} onClick={() => downloadPdf(c)} title="Download PDF" aria-label={`Download PDF of ${c.title}`}>
                          <FileDown />
                        </Button>
                        {c.status === "draft" && (
                          <Button variant="ghost" size="sm" disabled={busyId === c.id} onClick={() => setStatus(c, "sent")}>
                            <Send /> Send
                          </Button>
                        )}
                        {c.status !== "signed" && c.status !== "void" && (
                          <Button variant="ghost" size="sm" disabled={busyId === c.id} onClick={() => { setSignFor(c); setSignedName(c.signer_name ?? "") }}>
                            <PenLine /> Sign
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-bad hover:text-bad" onClick={() => remove(c)} aria-label={`Delete ${c.title}`} title="Delete contract">
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

      <Dialog open={!!signFor} onOpenChange={(o) => !o && setSignFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign “{signFor?.title}”</DialogTitle>
          </DialogHeader>
          <div className="grid gap-[14px]">
            <div className="grid gap-1.5">
              <Label htmlFor="signed">Full name</Label>
              <Input id="signed" value={signedName} onChange={(e) => setSignedName(e.target.value)} placeholder="e.g. Jane Smith" autoComplete="name" />
            </div>
            <p className="text-[13px] text-muted-foreground">
              Typing your full name and pressing Sign electronically has the same effect as a handwritten signature. The
              name, date and IP address are recorded as an audit trail.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignFor(null)}>
              Cancel
            </Button>
            <Button onClick={sign} disabled={busyId === signFor?.id}>
              {busyId === signFor?.id && <Loader2 className="animate-spin" />}
              Sign electronically
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UnsavedGuardDialog prompt={guard.prompt} />
    </div>
  )
}

// Branded contract PDF (jsPDF, lazy-imported so it only loads on demand).
async function renderContractPdf(c: ContractDetail) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const W = doc.internal.pageSize.getWidth()
  const M = 48
  doc.setFillColor(110, 86, 207)
  doc.rect(0, 0, W, 70, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text("GAkinz", M, 44)
  doc.setTextColor(42, 42, 74)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text(c.title, M, 110)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  const lines = doc.splitTextToSize(c.body || "", W - M * 2)
  doc.text(lines, M, 140)
  const y = 140 + lines.length * 13 + 30
  if (c.signed_at) {
    doc.setFont("helvetica", "bold")
    doc.text("Electronically signed", M, y)
    doc.setFont("helvetica", "normal")
    doc.text(`Name: ${c.signed_name ?? c.signer_name ?? ""}`, M, y + 16)
    doc.text(`Date: ${c.signed_at}`, M, y + 30)
    if (c.signed_ip) doc.text(`IP: ${c.signed_ip}`, M, y + 44)
  }
  doc.save(`${c.title.replace(/\s+/g, "-").toLowerCase()}.pdf`)
}
