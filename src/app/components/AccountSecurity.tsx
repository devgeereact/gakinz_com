import { useEffect, useState } from "react"
import { Loader2, RefreshCw, ShieldCheck, Monitor, LogOut } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { users, auth, type Session } from "@/lib/api"
import { useAuth } from "@/store/auth.store"
import { canAccess } from "@/lib/access"

// Self-service security panels shared by My account (every role) and Settings
// (Platform). Both call auth.php actions that act only on the caller's own
// account; the server derives the user from the bearer token, never from input.

function fmt(d: string) {
  return new Date(d.replace(" ", "T")).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Self-service two-factor (TOTP). Any signed-in user can enable/disable their own.
export function TwoFactorPanel() {
  const me = useAuth((s) => s.user)
  const [enabled, setEnabled] = useState(false)
  const [secret, setSecret] = useState("")
  const [otpauth, setOtpauth] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [codes, setCodes] = useState<string[]>([]) // recovery codes shown once

  useEffect(() => {
    if (!me) return
    let alive = true
    // auth.php's `me` reports the caller's own state. A server that predates
    // that field leaves it out, so fall back to the team list, which only
    // admins can read; anyone else is assumed off, as before.
    auth.me().then((r) => {
      if (!alive) return
      if (r.ok && typeof r.data.totp_enabled === "boolean") {
        setEnabled(r.data.totp_enabled)
      } else if (canAccess(me.role, "platform")) {
        users.list().then((l) => {
          if (!alive || !l.ok) return
          const self = l.data.find((u) => u.id === me.id)
          if (self) setEnabled(self.totp_enabled)
        })
      }
    })
    return () => {
      alive = false
    }
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
      setCodes(res.data.recovery_codes || [])
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
      setCodes([])
      toast.success("Two-factor disabled.")
    } else toast.error(res.error || "Could not disable 2FA.")
  }
  const regen = async () => {
    setBusy(true)
    const res = await auth.twofaRecodes(code.trim())
    setBusy(false)
    if (res.ok) {
      setCodes(res.data.recovery_codes || [])
      setCode("")
      toast.success("New recovery codes generated. Old ones no longer work.")
    } else toast.error(res.error || "Could not regenerate codes.")
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
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label htmlFor="dcode">Current code</Label>
                <Input id="dcode" value={code} onChange={(e) => setCode(e.target.value)} className="mt-1.5 w-40" placeholder="123456" inputMode="numeric" autoComplete="one-time-code" />
              </div>
              <Button variant="outline" onClick={regen} disabled={busy}>Regenerate codes</Button>
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
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label htmlFor="ecode">Code</Label>
                <Input id="ecode" value={code} onChange={(e) => setCode(e.target.value)} className="mt-1.5 w-40" placeholder="123456" inputMode="numeric" autoComplete="one-time-code" />
              </div>
              <Button onClick={enable} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enable
              </Button>
            </div>
          </div>
        )}
      </div>

      {codes.length > 0 && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-950/30">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">Save your recovery codes</h3>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            Each works once if you lose your authenticator. Stored hashed, so they won't be shown again.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
            {codes.map((c) => (
              <code key={c} className="rounded bg-background px-2 py-1 text-center">{c}</code>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => navigator.clipboard?.writeText(codes.join("\n"))}>
            Copy all
          </Button>
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

// The caller's own live sessions, with sign-out for any device but this one.
export function SessionsPanel() {
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Monitor className="h-4 w-4" /> Devices currently signed in to your account.
        </p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} Your sessions could not be loaded. Please try again later.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
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
                  <TableCell className="text-muted-foreground">{s.ip || "Unknown"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.last_seen_at ? fmt(s.last_seen_at) : "Unknown"}</TableCell>
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
