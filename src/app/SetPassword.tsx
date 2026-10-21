import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { auth } from "@/lib/api"
import AuthFrame from "@/app/components/AuthFrame"

// Used by the invite email + the forgot-password flow. The token rides in the
// URL hash (#token=…) so it never hits the server logs as a query string.
export default function SetPassword() {
  // Read once on mount. This route is never server-rendered (only public paths
  // are prerendered), so window is always defined here.
  const [token] = useState(() => new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token") ?? "")
  const [pw, setPw] = useState("")
  const [pw2, setPw2] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (pw.length < 8) return setError("Use at least 8 characters.")
    if (pw !== pw2) return setError("The passwords don't match.")
    if (!token) return setError("This link is missing its token.")
    setBusy(true)
    const res = await auth.reset(token, pw)
    setBusy(false)
    if (res.ok) {
      setDone(true)
      setTimeout(() => navigate("/login", { replace: true }), 1500)
    } else {
      setError(res.error || "This link is invalid or has expired.")
    }
  }

  return (
    <AuthFrame>
      <h2 className="font-display text-[1.8rem] font-semibold tracking-[-0.025em]">Set your password</h2>
      <p className="mb-6 mt-2 text-muted-foreground">Choose a password to access the GAkinz platform.</p>
      {done ? (
        <p role="status" className="rounded-[10px] border border-ok/30 bg-ok-soft px-3 py-2 text-sm text-foreground">
          Password set. Taking you to sign in…
        </p>
      ) : (
        <form onSubmit={submit} className="grid gap-3.5">
          <div className="grid gap-1.5">
            <Label htmlFor="pw">New password</Label>
            <Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pw2">Confirm password</Label>
            <Input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
          </div>
          {error && (
            <div role="alert" className="gk-os-wrap rounded-[10px] border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-foreground">{error}</div>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Set password
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="rounded-[6px] hover:text-foreground">Back to sign in</Link>
      </p>
    </AuthFrame>
  )
}
