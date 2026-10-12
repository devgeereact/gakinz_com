import { useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw, Send, PenLine, FileDown, Trash2, ShieldAlert } from "lucide-react"
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
import {
  contracts,
  clients as clientsApi,
  projects as projectsApi,
  type Contract,
  type ContractDetail,
  type ContractStatus,
  type ContractKind,
  type Client,
  type Project,
} from "@/lib/api"
import { cn } from "@/lib/utils"

const statusClass: Record<ContractStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary",
  signed: "bg-accent text-accent-foreground",
  void: "bg-destructive/10 text-destructive",
}
const triageClass: Record<string, string> = {
  green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  yellow: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  red: "bg-destructive/10 text-destructive",
}

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

  // Apply a template: merge the chosen client/project into the body.
  const applyTemplate = (key: string, cId = clientId, pId = projectId) => {
    const t = TEMPLATES[key]
    if (!t) return
    const company = clientList.find((c) => String(c.id) === cId)?.company ?? "the Client"
    const proj = projectList.find((p) => String(p.id) === pId)?.name ?? "the project"
    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    setTitle(t.title)
    setBody(t.body.replace(/\{\{client\}\}/g, company).replace(/\{\{project\}\}/g, proj).replace(/\{\{date\}\}/g, today))
  }

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Contracts</h1>
          <p className="text-sm text-muted-foreground">Agreements &amp; NDAs with typed e-signature and an audit trail.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> New contract
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>New contract</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Template</Label>
                    <Select value={template} onValueChange={setTemplate}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="service">Service Agreement</SelectItem>
                        <SelectItem value="nda">Mutual NDA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Client</Label>
                    <Select value={clientId} onValueChange={setClientId}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="No client" /></SelectTrigger>
                      <SelectContent>
                        {clientList.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.company}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Project</Label>
                    <Select value={projectId} onValueChange={setProjectId}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="No project" /></SelectTrigger>
                      <SelectContent>
                        {projectList.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {template === "nda" && (
                    <div>
                      <Label>NDA triage</Label>
                      <Select value={triage} onValueChange={setTriage}>
                        <SelectTrigger className="mt-1.5"><SelectValue placeholder="Risk flag" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="green">Green — standard</SelectItem>
                          <SelectItem value="yellow">Yellow — review</SelectItem>
                          <SelectItem value="red">Red — legal review</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="ctitle">Title</Label>
                  <Input id="ctitle" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="cbody">Body</Label>
                  <Textarea id="cbody" rows={8} value={body} onChange={(e) => setBody(e.target.value)} className="mt-1.5 font-mono text-xs" />
                </div>
                <div>
                  <Label htmlFor="csigner">Signer name (expected)</Label>
                  <Input id="csigner" value={signerName} onChange={(e) => setSignerName(e.target.value)} className="mt-1.5" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={create} disabled={saving}>
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
          {error} — the contracts endpoint and DB must be live on the server.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading contracts…
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No contracts yet. Create one from a template to get a signable document.
          </div>
        ) : (
          <Table>
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
                  <TableCell className="font-medium">
                    {c.title}
                    {c.nda_triage && (
                      <span className={cn("ml-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium", triageClass[c.nda_triage])}>
                        <ShieldAlert className="h-3 w-3" /> {c.nda_triage}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.client_company || "—"}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{c.kind}</TableCell>
                  <TableCell>
                    <span className={cn("rounded px-2 py-0.5 text-xs font-medium", statusClass[c.status])}>{c.status}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.signed_at ? `${c.signer_name ?? ""} · ${fmt(c.signed_at)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" disabled={busyId === c.id} onClick={() => downloadPdf(c)} title="Download PDF">
                        <FileDown className="h-3.5 w-3.5" />
                      </Button>
                      {c.status === "draft" && (
                        <Button variant="ghost" size="sm" disabled={busyId === c.id} onClick={() => setStatus(c, "sent")}>
                          <Send className="mr-1 h-3.5 w-3.5" /> Send
                        </Button>
                      )}
                      {c.status !== "signed" && c.status !== "void" && (
                        <Button variant="ghost" size="sm" disabled={busyId === c.id} onClick={() => { setSignFor(c); setSignedName(c.signer_name ?? "") }}>
                          <PenLine className="mr-1 h-3.5 w-3.5" /> Sign
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(c)} aria-label="Delete contract">
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

      <Dialog open={!!signFor} onOpenChange={(o) => !o && setSignFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign “{signFor?.title}”</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Typing your full name below and confirming is your electronic signature. The name, date and
              IP address are recorded as an audit trail.
            </p>
            <div>
              <Label htmlFor="signed">Full name</Label>
              <Input id="signed" value={signedName} onChange={(e) => setSignedName(e.target.value)} className="mt-1.5" placeholder="e.g. Jane Smith" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={sign} disabled={busyId === signFor?.id}>
              {busyId === signFor?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign electronically
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
