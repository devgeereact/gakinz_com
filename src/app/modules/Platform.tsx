import { useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw, ShieldCheck, Monitor, LogOut, Trash2 } from "lucide-react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { users, audit, auth, announcements, integrations, clients as clientsApi, type ManagedUser, type AuditEntry, type Client, type Session, type Announcement, type IntegrationStatus } from "@/lib/api"
import { useAuth, type Role } from "@/store/auth.store"
import { cn } from "@/lib/utils"

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

export default function Platform() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Platform</h1>
        <p className="text-sm text-muted-foreground">Team, roles and the audit trail.</p>
      </div>
      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team">Team &amp; roles</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="sessions">My sessions</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>
        <TabsContent value="team" className="mt-4">
          <TeamTab />
        </TabsContent>
        <TabsContent value="security" className="mt-4">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="announcements" className="mt-4">
          <AnnouncementsTab />
        </TabsContent>
        <TabsContent value="integrations" className="mt-4">
          <IntegrationsTab />
        </TabsContent>
        <TabsContent value="sessions" className="mt-4">
          <SessionsTab />
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <AuditTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TeamTab() {
  const me = useAuth((s) => s.user)
  const [items, setItems] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
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
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add user
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New user</DialogTitle>
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
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    This account will only see this client’s portal.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={createUser} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create user
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the users endpoint and DB must be live, and you must be an admin.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading team…
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No users to show.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Cost £/h</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((u) => {
                const isSelf = me?.id === u.id
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.name}
                      {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Select value={u.role} onValueChange={(v) => changeRole(u, v as Role)} disabled={isSelf}>
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r} className="text-xs">
                              {ROLE_LABEL[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <RateCell user={u} />
                    </TableCell>
                    <TableCell>
                      {u.totp_enabled ? (
                        <span className="rounded bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">On</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Off</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-xs font-medium",
                          u.status === "active" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
                        )}
                      >
                        {u.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isSelf}
                        onClick={() => toggleStatus(u)}
                      >
                        {u.status === "active" ? "Suspend" : "Reactivate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

// Inline editable internal cost rate (£/h) for profitability reporting.
function RateCell({ user }: { user: ManagedUser }) {
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
      user.cost_rate = n
    }
  }
  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min="0"
        step="5"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="h-8 w-20 text-xs"
      />
      {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
    </div>
  )
}

// Self-service two-factor (TOTP). Any signed-in user can enable/disable their own.
function SecurityTab() {
  const me = useAuth((s) => s.user)
  const [enabled, setEnabled] = useState(false)
  const [secret, setSecret] = useState("")
  const [otpauth, setOtpauth] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // Read current 2FA state from the team list (admins) or assume off otherwise.
    users.list().then((r) => {
      if (r.ok && me) {
        const self = r.data.find((u) => u.id === me.id)
        if (self) setEnabled(self.totp_enabled)
      }
    })
  }, [me])

  const startSetup = async () => {
    setBusy(true)
    const res = await auth.twofaSetup()
    setBusy(false)
    if (res.ok) {
      setSecret(res.data.secret)
      setOtpauth(res.data.otpauth)
    } else toast.error(res.error || "Could not start setup.")
  }
  const enable = async () => {
    setBusy(true)
    const res = await auth.twofaEnable(code.trim())
    setBusy(false)
    if (res.ok) {
      setEnabled(true)
      setSecret("")
      setOtpauth("")
      setCode("")
      toast.success("Two-factor enabled.")
    } else toast.error(res.error || "Could not enable 2FA.")
  }
  const disable = async () => {
    setBusy(true)
    const res = await auth.twofaDisable(code.trim())
    setBusy(false)
    if (res.ok) {
      setEnabled(false)
      setCode("")
      toast.success("Two-factor disabled.")
    } else toast.error(res.error || "Could not disable 2FA.")
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Two-factor authentication</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a time-based code (Google Authenticator, 1Password, Authy…) to your sign-in.
        </p>

        {enabled ? (
          <div className="mt-4 space-y-3">
            <span className="inline-flex items-center gap-1 rounded bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              <ShieldCheck className="h-3 w-3" /> Enabled
            </span>
            <div className="flex items-end gap-2">
              <div>
                <Label htmlFor="dcode">Current code to disable</Label>
                <Input id="dcode" value={code} onChange={(e) => setCode(e.target.value)} className="mt-1.5 w-40" placeholder="123456" />
              </div>
              <Button variant="outline" onClick={disable} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Disable
              </Button>
            </div>
          </div>
        ) : !secret ? (
          <Button className="mt-4" onClick={startSetup} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Set up two-factor
          </Button>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm">Add this secret to your authenticator app, then enter the 6-digit code to confirm:</p>
            <code className="block break-all rounded bg-muted px-3 py-2 text-sm">{secret}</code>
            <a href={otpauth} className="text-xs text-primary hover:underline">Open in authenticator app →</a>
            <div className="flex items-end gap-2">
              <div>
                <Label htmlFor="ecode">Code</Label>
                <Input id="ecode" value={code} onChange={(e) => setCode(e.target.value)} className="mt-1.5 w-40" placeholder="123456" />
              </div>
              <Button onClick={enable} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enable
              </Button>
            </div>
          </div>
        )}
      </div>
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
    <div className="max-w-2xl space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Post an announcement</h3>
        <div className="mt-3 space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message (optional)" />
          <div className="flex items-center gap-2">
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={post} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No announcements.</div>
        ) : (
          <ul className="divide-y">
            {items.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {a.level === "warning" && <span className="mr-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-700 dark:text-amber-300">warning</span>}
                    {a.title}
                  </p>
                  {a.body && <p className="mt-0.5 text-sm text-muted-foreground">{a.body}</p>}
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.author || "—"} · {fmt(a.created_at)}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(a.id)} aria-label="Delete announcement">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Connection status of external services. Keys live only in server <code>config.php</code> — never shown here.
        </p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the integrations endpoint must be live, and you must be an admin.
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {INTEGRATIONS.map((i) => {
            const on = !!status?.[i.key]
            return (
              <div key={i.key} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div>
                  <p className="text-sm font-medium">{i.label}</p>
                  <p className="text-xs text-muted-foreground">{i.note}</p>
                </div>
                <span className={cn(
                  "rounded px-2 py-0.5 text-xs font-medium",
                  on ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground",
                )}>
                  {on ? "Connected" : "Not set"}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Best-effort, dependency-free user-agent → friendly device label.
function deviceLabel(ua: string | null): string {
  if (!ua) return "Unknown device"
  const browser = /Edg/.test(ua) ? "Edge" : /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "Browser"
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /iPhone|iPad|iOS/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Linux/.test(ua) ? "Linux" : ""
  return os ? `${browser} · ${os}` : browser
}

function SessionsTab() {
  const [items, setItems] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await auth.sessions()
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

  const revoke = async (s: Session) => {
    setBusyId(s.id)
    const res = await auth.revokeSession(s.id)
    setBusyId(null)
    if (res.ok) {
      setItems((xs) => xs.filter((x) => x.id !== s.id))
      toast.success("Session signed out.")
    } else {
      toast.error(res.error || "Could not revoke the session.")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Monitor className="h-4 w-4" /> Devices currently signed in to your account.
        </p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the auth endpoint must be live and migrated for session tracking.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions…
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No active sessions.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {deviceLabel(s.user_agent)}
                    {s.current && <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">This device</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.ip || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.last_seen_at ? fmt(s.last_seen_at) : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" disabled={busyId === s.id || s.current} onClick={() => revoke(s)}>
                      <LogOut className="mr-1 h-3.5 w-3.5" /> {s.current ? "Current" : "Sign out"}
                    </Button>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> The 200 most recent sensitive actions.
        </p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the audit endpoint and DB must be live, and you must be an admin.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading audit log…
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No actions logged yet.</div>
        ) : (
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
                  <TableCell className="whitespace-nowrap text-muted-foreground">{fmt(a.created_at)}</TableCell>
                  <TableCell>{a.user_name || "—"}</TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{a.action}</code>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.detail || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
