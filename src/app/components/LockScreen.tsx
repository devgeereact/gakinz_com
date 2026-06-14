import { useEffect, useRef, useState } from "react"
import { Lock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { auth } from "@/lib/api"
import { useAuth } from "@/store/auth.store"
import BrandMark from "@/marketing/components/BrandMark"

const IDLE_MS = 15 * 60 * 1000 // lock after 15 minutes idle
const KEY = "gk-locked"

// Privacy lock: after a spell of inactivity an overlay covers the CMS and the
// signed-in user must re-enter their password (and 2FA code, if enabled) to
// resume. Re-uses the normal login flow so it can't be bypassed client-side.
export default function LockScreen() {
  const user = useAuth((s) => s.user)
  const setAuth = useAuth((s) => s.setAuth)
  const [locked, setLocked] = useState(() => sessionStorage.getItem(KEY) === "1")
  const [pw, setPw] = useState("")
  const [code, setCode] = useState("")
  const [needs2fa, setNeeds2fa] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  const lock = () => {
    sessionStorage.setItem(KEY, "1")
    setLocked(true)
  }

  useEffect(() => {
    if (locked) return
    const reset = () => {
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(lock, IDLE_MS)
    }
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"]
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [locked])

  if (!locked || !user) return null

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const res = await auth.login(user.email, pw, needs2fa ? code.trim() : undefined)
    setBusy(false)
    if (res.ok) {
      setAuth(res.data.token, res.data.user)
      sessionStorage.removeItem(KEY)
      setPw("")
      setCode("")
      setNeeds2fa(false)
      setLocked(false)
    } else if (res.details?.two_factor_required) {
      setNeeds2fa(true)
      setError(needs2fa ? res.error : null)
    } else {
      setError(res.error || "Incorrect password.")
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur">
      <form onSubmit={unlock} className="w-full max-w-xs space-y-4 p-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <BrandMark className="h-9 w-9" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" /> Locked — {user.name}
          </div>
        </div>
        <div className="text-left">
          <Label htmlFor="lockpw">Password</Label>
          <Input id="lockpw" type="password" autoFocus autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1.5" required />
        </div>
        {needs2fa && (
          <div className="text-left">
            <Label htmlFor="lockcode">Authenticator code</Label>
            <Input id="lockcode" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} className="mt-1.5 tracking-[0.3em]" placeholder="123456" />
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Unlock
        </Button>
      </form>
    </div>
  )
}
