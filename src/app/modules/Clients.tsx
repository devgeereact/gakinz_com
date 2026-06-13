import { useEffect, useState } from "react"
import { Loader2, Download, RefreshCw, Plus } from "lucide-react"
import { downloadCsv } from "@/lib/csv"
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
import { clients, type Client, type ClientInput, type ClientTag } from "@/lib/api"
import { cn } from "@/lib/utils"

const TAGS: ClientTag[] = ["retainer", "one-off", "vip", "dormant"]

const tagClass: Record<ClientTag, string> = {
  retainer: "bg-primary/10 text-primary",
  "one-off": "bg-muted text-muted-foreground",
  vip: "bg-accent text-accent-foreground",
  dormant: "bg-secondary text-secondary-foreground",
}

const emptyForm: ClientInput = { company: "", contact_name: "", email: "", phone: "", tag: "one-off", notes: "" }

export default function Clients() {
  const [items, setItems] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<ClientInput>(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await clients.list()
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

  const set = (k: keyof ClientInput, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.company.trim()) {
      toast.error("A company name is required.")
      return
    }
    setSaving(true)
    const res = await clients.create(form)
    setSaving(false)
    if (res.ok) {
      toast.success("Client added.")
      setForm(emptyForm)
      setOpen(false)
      load()
    } else {
      toast.error(res.error || "Could not add the client.")
    }
  }

  const exportCsv = () => {
    const head = ["id", "company", "contact_name", "email", "phone", "tag", "created_at"]
    downloadCsv("gakinz-clients.csv", head, items as unknown as Record<string, unknown>[])
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Every client, their contacts and history in one record.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!items.length}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New client</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" value={form.company} onChange={(e) => set("company", e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="contact">Contact name</Label>
                  <Input id="contact" value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label>Tag</Label>
                  <Select value={form.tag} onValueChange={(v) => set("tag", v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TAGS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} className="mt-1.5" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={save} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save client
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the clients endpoint and DB must be live on the server.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading clients…
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No clients yet. Add one, or convert a won lead from the Leads board.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tag</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.company}</TableCell>
                  <TableCell className="text-muted-foreground">{c.contact_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                  <TableCell>
                    <span className={cn("rounded px-2 py-0.5 text-xs font-medium", tagClass[c.tag])}>{c.tag}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(c.created_at.replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
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
