import { useEffect, useState, type ReactNode } from "react"
import { AlertCircle, FileJson, Loader2, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react"
import { saveAs } from "file-saver"
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
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { users, audit, announcements, integrations, privacy, downloadName, clients as clientsApi, type RetentionReport, type ManagedUser, type AuditEntry, type Client, type Announcement, type IntegrationStatus } from "@/lib/api"
import { useAuth, type Role } from "@/store/auth.store"
import { exportOutcome, PRIVACY_NOT_AVAILABLE, RETENTION_NOT_AVAILABLE, retentionState } from "@/app/modules/privacyToolsModel"
import { TwoFactorPanel, SessionsPanel } from "@/app/components/AccountSecurity"

const ROLES: Role[] = ["super_admin", "admin", "manager", "trainer", "editor", "employee", "client"]
const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  manager: "Manager",
  trainer: "Trainer",
  editor: "Editor",
  employee: "Employee",
  client: "Client",
}

function fmt(d: string) {
  return new Date(d.replace(" ", "T")).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

/** The prototype's `.err` block with a "Try again" action. */
function LoadError({ what, detail, onRetry }: { what: string; detail: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mb-4 flex flex-wrap items-start gap-3.5 rounded-2xl border border-bad/30 bg-bad-soft p-[18px] text-foreground">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-bad" />
      <div className="min-w-[min(100%,200px)] flex-1">
        <p className="font-semibold">Could not load {what}.</p>
        <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">{detail}</p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw /> Try again
      </Button>
    </div>
  )
}

/** A muted one-line description with a Refresh action, above a tab's content. */
function TabBar({ children, onRefresh }: { children?: ReactNode; onRefresh: () => void }) {
  return (
    <div className="mb-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p className="min-w-0 flex-1 basis-[240px] text-muted-foreground">{children}</p>
      <Button variant="outline" onClick={onRefresh}>
        <RefreshCw /> Refresh
      </Button>
    </div>
  )
}

export default function Platform() {
  const [tab, setTab] = useState("team")
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Team, roles and the audit trail."
        actions={
          <Button
            onClick={() => {
              setTab("team")
              setAddOpen(true)
            }}
          >
            <Plus /> Add user
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5 flex w-full">
          <TabsTrigger value="team">Team &amp; roles</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="sessions">My sessions</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>
        <TabsContent value="team" className="mt-0">
          <TeamTab open={addOpen} setOpen={setAddOpen} />
        </TabsContent>
        <TabsContent value="security" className="mt-0">
          <TwoFactorPanel />
        </TabsContent>
        <TabsContent value="announcements" className="mt-0">
          <AnnouncementsTab />
        </TabsContent>
        <TabsContent value="integrations" className="mt-0">
          <IntegrationsTab />
        </TabsContent>
        <TabsContent value="sessions" className="mt-0">
          <SessionsPanel />
        </TabsContent>
        <TabsContent value="audit" className="mt-0">
          <AuditTab />
        </TabsContent>
        <TabsContent value="privacy" className="mt-0">
          <PrivacyTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TeamTab({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const me = useAuth((s) => s.user)
  const [items, setItems] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "employee" as Role, client_id: "" })
  const [clientList, setClientList] = useState<Client[]>([])
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await users.list()
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
    // Needed to bind a `client`-role login to its client record.
    clientsApi.list().then((r) => r.ok && setClientList(r.data))
  }, [])

  const createUser = async () => {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      toast.error("Name, email and an 8+ character password are required.")
      return
    }
    if (form.role === "client" && !form.client_id) {
      toast.error("Pick the client this account belongs to.")
      return
    }
    setSaving(true)
    const res = await users.create({
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
      client_id: form.role === "client" ? Number(form.client_id) : null,
    })
    setSaving(false)
    if (res.ok) {
      toast.success("User created.")
      setForm({ name: "", email: "", password: "", role: "employee", client_id: "" })
      setOpen(false)
      load()
    } else {
      toast.error(res.error || "Could not create the user.")
    }
  }

  const inviteUser = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required to invite.")
      return
    }
    if (form.role === "client") {
      toast.error("Invites are for staff. Create a client account from the client record.")
      return
    }
    setSaving(true)
    const res = await users.invite({ name: form.name, email: form.email, role: form.role })
    setSaving(false)
    if (res.ok) {
      toast.success("Invite sent. They'll get a set-password link by email.")
      setForm({ name: "", email: "", password: "", role: "employee", client_id: "" })
      setOpen(false)
      load()
    } else {
      toast.error(res.error || "Could not send the invite.")
    }
  }

  const changeRole = async (u: ManagedUser, role: Role) => {
    setItems((xs) => xs.map((x) => (x.id === u.id ? { ...x, role } : x)))
    const res = await users.setRole(u.id, role)
    if (!res.ok) {
      load()
      toast.error(res.error || "Could not change the role.")
    }
  }

  const toggleStatus = async (u: ManagedUser) => {
    const status = u.status === "active" ? "suspended" : "active"
    const res = await users.setStatus(u.id, status)
    if (res.ok) {
      setItems((xs) => xs.map((x) => (x.id === u.id ? { ...x, status } : x)))
    } else {
      toast.error(res.error || "Could not change the status.")
    }
  }

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="uname">Name</Label>
              <Input id="uname" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="uemail">Email</Label>
              <Input id="uemail" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="upass">Temporary password</Label>
              <Input id="upass" type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="mt-1.5" placeholder="8+ characters" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as Role }))}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.role === "client" && (
              <div>
                <Label>Client</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Which client?" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientList.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  A client account only ever sees its own client’s portal.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex-wrap gap-2 sm:gap-2">
            <Button variant="outline" onClick={inviteUser} disabled={saving} title="Email a set-password link instead of setting a password">
              Send invite
            </Button>
            <Button onClick={createUser} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Create user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TabBar onRefresh={load}>Everyone who can sign in, their role and their internal cost rate.</TabBar>

      {error && <LoadError what="the team" detail={`${error}. The users endpoint and database must be live, and you must be an admin.`} onRetry={load} />}

      {loading ? (
        <div className="overflow-hidden rounded-[14px] border bg-card">
          <TableSkeleton rows={4} cols={5} />
        </div>
      ) : items.length === 0 ? (
        !error && (
          <div className="grid place-items-center gap-2.5 rounded-2xl border border-dashed border-line-strong bg-card px-5 py-14 text-center">
            <h2 className="font-display text-[1.2rem] font-semibold">No users to show</h2>
            <p className="max-w-[46ch] text-muted-foreground">Add the first team member.</p>
            <Button className="mt-1" onClick={() => setOpen(true)}>
              <Plus /> Add user
            </Button>
          </div>
        )
      ) : (
        <div className="overflow-hidden rounded-[14px] border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Cost £/h</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Action</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((u) => {
                const isSelf = me?.id === u.id
                return (
                  <TableRow key={u.id}>
                    <TableCell className="min-w-[220px]">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-acc-soft text-xs font-bold text-acc">
                          {initials(u.name)}
                        </span>
                        <span className="min-w-0">
                          <b className="block font-semibold [overflow-wrap:anywhere]">
                            {u.name}
                            {isSelf && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                          </b>
                          <small className="block text-[12.5px] leading-snug text-muted-foreground [overflow-wrap:anywhere]">{u.email}</small>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select value={u.role} onValueChange={(v) => changeRole(u, v as Role)} disabled={isSelf}>
                        <SelectTrigger className="h-9 w-36 text-[13px]" aria-label={`Role for ${u.name}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <RateCell
                        user={u}
                        onSaved={(rate) => setItems((xs) => xs.map((x) => (x.id === u.id ? { ...x, cost_rate: rate } : x)))}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.totp_enabled ? "ok" : "warn"}>{u.totp_enabled ? "On" : "Off"}</Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" disabled={isSelf} onClick={() => toggleStatus(u)}>
                        {u.status === "active" ? "Suspend" : "Reactivate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// Inline editable internal cost rate (£/h) for profitability reporting.
// The saved rate goes back to the parent list through onSaved rather than by
// writing to the user prop.
function RateCell({ user, onSaved }: { user: ManagedUser; onSaved: (rate: number) => void }) {
  const [value, setValue] = useState(String(user.cost_rate ?? 0))
  const [saving, setSaving] = useState(false)
  const save = async () => {
    const n = parseFloat(value) || 0
    if (n === user.cost_rate) return
    setSaving(true)
    const res = await users.setRate(user.id, n)
    setSaving(false)
    if (!res.ok) {
      toast.error(res.error || "Could not save the rate.")
      setValue(String(user.cost_rate ?? 0))
    } else {
      onSaved(n)
    }
  }
  return (
    <div className="flex items-center justify-end gap-1">
      {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      <Input
        type="number"
        min="0"
        step="5"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        aria-label={`Cost per hour for ${user.name}`}
        className="h-9 w-[5.5rem] text-right font-mono text-[13px] tabular-nums"
      />
    </div>
  )
}

// Studio-wide announcements (managers+ post; everyone sees them on the dashboard).
function AnnouncementsTab() {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [level, setLevel] = useState("info")
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await announcements.list()
    if (res.ok) setItems(res.data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const post = async () => {
    if (!title.trim()) return toast.error("A title is required.")
    setSaving(true)
    const res = await announcements.create({ title: title.trim(), body, level })
    setSaving(false)
    if (res.ok) {
      setTitle("")
      setBody("")
      setLevel("info")
      load()
    } else toast.error(res.error || "Could not post.")
  }
  const remove = async (id: number) => {
    const res = await announcements.remove(id)
    if (res.ok) setItems((xs) => xs.filter((x) => x.id !== id))
    else toast.error(res.error || "Could not delete.")
  }

  return (
    <div className="grid max-w-3xl gap-4">
      <section className="rounded-2xl border bg-card p-[18px]" aria-label="Post an announcement">
        <div className="grid gap-3.5">
          <div className="grid gap-1.5">
            <Label htmlFor="atitle">Title</Label>
            <Input id="atitle" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="abody">Message</Label>
            <Textarea id="abody" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Optional" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="alevel">Level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger id="alevel" className="h-[42px] sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Button onClick={post} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} Post
            </Button>
          </div>
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border bg-card">
        <h2 className="px-[18px] pb-3 pt-4 font-display text-[1.05rem] font-semibold tracking-[-0.01em]">Posted</h2>
        <div className="px-[18px] pb-[18px]">
          {loading ? (
            <TableSkeleton rows={3} cols={2} className="p-0" />
          ) : items.length === 0 ? (
            <p className="py-2 text-muted-foreground">No announcements.</p>
          ) : (
            <div>
              {items.map((a) => (
                <div key={a.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-t py-3 first:border-t-0">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold [overflow-wrap:anywhere]">
                      {a.level === "warning" && <Badge variant="warn">Warning</Badge>}
                      {a.title}
                    </p>
                    {a.body && <p className="mt-0.5 text-sm text-muted-foreground [overflow-wrap:anywhere]">{a.body}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {a.author || "Unknown"} · {fmt(a.created_at)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-bad" onClick={() => remove(a.id)} aria-label="Delete announcement" title="Delete">
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

// Integrations status — which external services are configured on the server.
const INTEGRATIONS: { key: keyof IntegrationStatus; label: string; note: string }[] = [
  { key: "smtp", label: "Email (SMTP)", note: "Mailbox send, invoice chasing, digests" },
  { key: "imap", label: "Inbox (IMAP)", note: "Mailbox inbox" },
  { key: "stripe", label: "Stripe", note: "Invoice payment links + webhook" },
  { key: "twilio", label: "Twilio (SMS)", note: "SMS sends from Comms" },
  { key: "openrouter", label: "OpenRouter (AI)", note: "AI assists, briefs, drafts" },
  { key: "google", label: "Google SSO", note: "Continue-with-Google sign-in" },
  { key: "openweather", label: "OpenWeather", note: "Dashboard weather pill" },
  { key: "cron", label: "Cron runner", note: "Scheduled chase / billing / uptime / digest" },
  { key: "reports", label: "Scheduled reports", note: "Weekly digest recipients" },
  { key: "paypal", label: "PayPal", note: "Invoice checkout via PayPal" },
  { key: "whatsapp", label: "WhatsApp", note: "Send WhatsApp from Comms (Twilio)" },
  { key: "github", label: "GitHub", note: "Commits / PRs / CI in Dev Pipeline" },
  { key: "figma", label: "Figma", note: "Design file preview + thumbnail" },
  { key: "slack", label: "Slack", note: "Announcements broadcast to a channel" },
  { key: "calendly", label: "Calendly", note: "Discovery-call booking" },
]

function IntegrationsTab() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await integrations.status()
    if (res.ok) {
      setStatus(res.data)
      setError(null)
    } else setError(res.error)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  return (
    <div>
      <TabBar onRefresh={load}>
        Connection status of external services. Keys live only in the server’s <code className="font-mono text-[13px]">config.php</code> and are never shown here.
      </TabBar>

      {error && <LoadError what="integrations" detail={`${error}. The integrations endpoint must be live, and you must be an admin.`} onRetry={load} />}

      {loading ? (
        <div role="status" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[118px] animate-pulse rounded-2xl border bg-card" />
          ))}
          <span className="sr-only">Loading…</span>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {INTEGRATIONS.map((i) => {
            const on = !!status?.[i.key]
            return (
              <div key={i.key} className="grid min-w-0 content-start gap-2.5 rounded-2xl border bg-card p-[18px]">
                <span className="flex flex-wrap items-start justify-between gap-2">
                  <b className="min-w-0 font-semibold [overflow-wrap:anywhere]">{i.label}</b>
                  <Badge variant={on ? "ok" : "secondary"}>{on ? "Connected" : "Not set"}</Badge>
                </span>
                <p className="text-[13px] text-muted-foreground">{i.note}</p>
                <p className="text-[13px] text-muted-foreground">
                  {on ? "Key stored on the server. Never shown here." : "Add the key on the server to switch this on."}
                </p>
                {i.key === "slack" && on && (
                  <div>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const r = await integrations.slackTest()
                        if (r.ok) toast.success("Posted to Slack.")
                        else toast.error(r.error || "Slack test failed.")
                      }}
                    >
                      Test
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AuditTab() {
  const [items, setItems] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await audit.list()
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

  return (
    <div>
      <TabBar onRefresh={load}>
        <span className="inline-flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0" /> The 200 most recent sensitive actions.
        </span>
      </TabBar>

      {error && <LoadError what="the audit log" detail={`${error}. The audit endpoint and database must be live, and you must be an admin.`} onRetry={load} />}

      {loading ? (
        <div className="overflow-hidden rounded-[14px] border bg-card">
          <TableSkeleton rows={5} cols={4} />
        </div>
      ) : items.length === 0 ? (
        !error && <p className="rounded-[14px] border bg-card px-5 py-10 text-center text-muted-foreground">No actions logged yet.</p>
      ) : (
        <div className="overflow-hidden rounded-[14px] border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap">{fmt(a.created_at)}</TableCell>
                  <TableCell className="whitespace-nowrap">{a.user_name || <span className="text-muted-foreground">Unknown</span>}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-[13px]">{a.action}</TableCell>
                  <TableCell className="min-w-[200px] text-muted-foreground [overflow-wrap:anywhere]">{a.detail || "None"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

/**
 * Privacy tools (privacy.php). An export by enquiry email for super_admin and
 * admin (a client's export is on the client record), and the read-only
 * retention report for super_admin. Nothing here deletes or changes a row.
 */
function PrivacyTab() {
  const role = useAuth((s) => s.user?.role)
  const [email, setEmail] = useState("")
  const [exporting, setExporting] = useState(false)
  const [exportMissing, setExportMissing] = useState(false)

  const exportEmail = async () => {
    const e = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      toast.error("Enter the email address the enquiry came from.")
      return
    }
    setExporting(true)
    const out = exportOutcome(await privacy.exportEnquiryEmail(e))
    setExporting(false)
    setExportMissing(out.kind === "not_on_server")
    if (out.kind === "saved") {
      saveAs(out.file, downloadName(out.file, `gakinz-data-export-enquiry-${new Date().toISOString().slice(0, 10)}.json`))
      toast.success("Export downloaded. It holds personal data: store it safely and delete it once sent.")
    } else if (out.kind === "error") toast.error(out.error || "Could not export that enquirer's data.")
  }

  return (
    <div className="grid gap-4">
      <div className="grid min-w-0 content-start gap-3 rounded-2xl border bg-card p-[18px]">
        <b className="font-semibold">Export an enquirer's data</b>
        <p className="text-[13px] text-muted-foreground">
          For an access request from someone who sent an enquiry. It downloads every enquiry from that address, the calls on
          them and the audit entries that name it. For a client, use Export data on the client record instead.
        </p>
        <form
          className="flex flex-wrap items-end gap-2.5"
          onSubmit={(ev) => {
            ev.preventDefault()
            exportEmail()
          }}
        >
          <div className="grid min-w-[min(100%,260px)] flex-1 gap-1.5">
            <Label htmlFor="privacy-email">Email address</Label>
            <Input id="privacy-email" type="email" autoComplete="off" value={email} onChange={(ev) => setEmail(ev.target.value)} />
          </div>
          <Button type="submit" variant="outline" disabled={exporting}>
            {exporting ? <Loader2 className="animate-spin" /> : <FileJson />} Export data
          </Button>
        </form>
        <p role="status" className="text-[13px] text-muted-foreground empty:hidden">
          {exportMissing ? PRIVACY_NOT_AVAILABLE : null}
        </p>
      </div>
      {role === "super_admin" ? (
        <RetentionCard />
      ) : (
        <p className="text-[13px] text-muted-foreground">The retention report is for the super admin.</p>
      )}
    </div>
  )
}

function RetentionCard() {
  const [report, setReport] = useState<RetentionReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)

  const apply = (res: Awaited<ReturnType<typeof privacy.retentionReport>>) => {
    const next = retentionState(res)
    setReport(next.kind === "ready" ? next.report : null)
    setError(next.kind === "error" ? next.error : null)
    setMissing(next.kind === "not_on_server")
    setLoading(false)
  }
  const load = async () => {
    setLoading(true)
    apply(await privacy.retentionReport())
  }
  // The first load starts with `loading` already true, so the effect sets
  // state only once the reply arrives.
  useEffect(() => {
    let live = true
    privacy.retentionReport().then((res) => {
      if (live) apply(res)
    })
    return () => {
      live = false
    }
  }, [])

  return (
    <div className="grid min-w-0 content-start gap-3 rounded-2xl border bg-card p-[18px]">
      <span className="flex flex-wrap items-start justify-between gap-2">
        <b className="font-semibold">Retention report</b>
        <Badge variant="secondary">Read only</Badge>
      </span>
      <p className="text-[13px] text-muted-foreground">
        How many rows each proposed retention rule would affect if its period were set. Periods are decided by the owner with
        legal advice and set in the server's <code className="font-mono text-[13px]">config.php</code>. Nothing is deleted or
        changed, by this report or anything else.
      </p>
      {missing && <p className="text-[13px] text-muted-foreground">{RETENTION_NOT_AVAILABLE}</p>}
      {error && <LoadError what="the retention report" detail={error} onRetry={load} />}
      {loading ? (
        <TableSkeleton rows={4} cols={3} />
      ) : report ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Would affect</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rules.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="min-w-[180px]">
                    {r.label}
                    <small className="block text-[12.5px] text-muted-foreground">From {r.starts_from}</small>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {r.status === "counted" && r.period !== null ? (
                      `${r.period} ${r.unit}${r.period === 1 ? "" : "s"}`
                    ) : (
                      <span className="text-muted-foreground">{r.status === "invalid_period" ? "Invalid period" : "Period not set"}</span>
                    )}
                    <small className="block font-mono text-[12px] text-muted-foreground">{r.config_key}</small>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {r.counts ? (
                      Object.entries(r.counts).map(([table, n]) => (
                        <span key={table} className="block">
                          {n === null ? "Not available" : n} <span className="text-muted-foreground">{table.replace(/_/g, " ")}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground">Nothing happens</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
      <div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw /> Refresh
        </Button>
      </div>
    </div>
  )
}
