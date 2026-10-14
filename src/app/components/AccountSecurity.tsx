import { useEffect, useState } from "react"
import { Copy, Loader2, RefreshCw, Monitor, LogOut } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { users, auth, type Session } from "@/lib/api"
import { useAuth } from "@/store/auth.store"
import { canAccess } from "@/lib/access"

// Self-service security panels shared by My account (every role) and Settings
// (Platform). Both call auth.php actions that act only on the caller's own
// account; the server derives the user from the bearer token, never from input.
// Styled to the approved CMS prototype (D-046): a `.switch`-style status row,
// `.rows` lists and semantic badges, all from the shared tokens.

function fmt(d: string) {
  return new Date(d.replace(" ", "T")).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Self-service two-factor (TOTP). Any signed-in user can enable/disable their own.
// `bare` drops the panel's own frame for a host that already draws a card.
export function TwoFactorPanel({ bare = false }: { bare?: boolean }) {
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
    <div className={cn("min-w-0 space-y-4", !bare && "max-w-2xl")}>
      <div className={cn(!bare && "rounded-2xl border bg-card px-[18px] py-2")}>
        {/* Status row, the prototype's `.switch`. Turning 2FA on or off needs a
            code, so the state shows as a badge and the actions sit below. */}
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <h3 className="font-semibold">Two-factor authentication</h3>
            <p className="text-[13.5px] text-muted-foreground">
              Add a time-based code (Google Authenticator, 1Password, Authy…) to your sign-in.
            </p>
          </div>
          <Badge variant={enabled ? "ok" : "warn"} className="shrink-0">
            {enabled ? "On" : "Off"}
          </Badge>
        </div>

        {enabled ? (
          <div className="border-t py-3">
            <p className="text-[13.5px] text-muted-foreground">
              Enter a current code from your app to make new recovery codes or to turn two-factor off.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="dcode">Current code</Label>
                <Input id="dcode" value={code} onChange={(e) => setCode(e.target.value)} className="w-36" placeholder="123456" inputMode="numeric" autoComplete="one-time-code" />
              </div>
              <Button variant="outline" onClick={regen} disabled={busy}>Regenerate codes</Button>
              <Button variant="destructive" onClick={disable} disabled={busy}>
                {busy && <Loader2 className="animate-spin" />} Disable
              </Button>
            </div>
          </div>
        ) : !secret ? (
          <div className="border-t py-3">
            <Button onClick={startSetup} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Set up two-factor
            </Button>
          </div>
        ) : (
          <div className="space-y-3 border-t py-3">
            <p className="text-sm">Add this secret to your authenticator app, then enter the 6-digit code to confirm:</p>
            <code className="block break-all rounded-[10px] border bg-secondary px-3 py-2 font-mono text-[13.5px]">{secret}</code>
            <a href={otpauth} className="inline-block text-[13px] font-semibold text-acc hover:underline">Open in authenticator app →</a>
            <div className="flex flex-wrap items-end gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="ecode">Code</Label>
                <Input id="ecode" value={code} onChange={(e) => setCode(e.target.value)} className="w-36" placeholder="123456" inputMode="numeric" autoComplete="one-time-code" />
              </div>
              <Button onClick={enable} disabled={busy}>
                {busy && <Loader2 className="animate-spin" />} Enable
              </Button>
            </div>
          </div>
        )}
      </div>

      {codes.length > 0 && (
        <div className="rounded-2xl border border-warn/30 bg-warn-soft p-[18px]">
          <h3 className="font-semibold text-warn">Save your recovery codes</h3>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Each works once if you lose your authenticator. Stored hashed, so they won't be shown again.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[13.5px]">
            {codes.map((c) => (
              <code key={c} className="rounded-lg border bg-card px-2 py-1 text-center">{c}</code>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => navigator.clipboard?.writeText(codes.join("\n"))}>
            <Copy /> Copy all
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
  // iPhone and iPad user agents also contain "Mac OS X", so they are checked first.
  const os = /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /Linux/.test(ua) ? "Linux" : ""
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
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Monitor className="size-4 shrink-0" aria-hidden /> Devices currently signed in to your account.
        </p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw /> Refresh
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-bad/30 bg-bad-soft p-4 text-sm text-bad">
          {error} Your sessions could not be loaded. Please try again later.
        </div>
      )}

      <div className="rounded-2xl border bg-card px-[18px] py-1.5">
        {loading ? (
          <div className="flex items-center gap-2 py-5 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading sessions…
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No active sessions.</div>
        ) : (
          <ul className="m-0 list-none p-0">
            {items.map((s) => (
              <li key={s.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t py-3 first:border-t-0">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <b className="font-semibold">{deviceLabel(s.user_agent)}</b>
                    {s.current && <Badge variant="ok">This device</Badge>}
                  </p>
                  <p className="text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                    {s.ip ? <span className="font-mono">{s.ip}</span> : "Unknown IP"} · Last seen {s.last_seen_at ? fmt(s.last_seen_at) : "unknown"}
                  </p>
                </div>
                {s.current ? (
                  <span className="text-[13px] text-muted-foreground">Current</span>
                ) : (
                  <Button variant="ghost" size="sm" disabled={busyId === s.id} onClick={() => revoke(s)}>
                    {busyId === s.id ? <Loader2 className="animate-spin" /> : <LogOut />} Sign out
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
