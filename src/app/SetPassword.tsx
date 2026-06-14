import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { auth } from "@/lib/api"
import BrandMark from "@/marketing/components/BrandMark"

// Used by the invite email + the forgot-password flow. The token rides in the
// URL hash (#token=…) so it never hits the server logs as a query string.
export default function SetPassword() {
  const [token, setToken] = useState("")
  const [pw, setPw] = useState("")
  const [pw2, setPw2] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    document.documentElement.classList.add("gk-force-light")
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""))
    setToken(params.get("token") ?? "")
    return () => document.documentElement.classList.remove("gk-force-light")
  }, [])

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
    <div className="gk-public relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="gk-aurora" aria-hidden />
      <div className="relative w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2" aria-label="GAkinz home">
          <BrandMark className="h-9 w-9" />
          <span className="text-xl font-extrabold tracking-tight">GAkin<span className="text-primary">z</span></span>
        </Link>
        <div className="gk-ring p-6 shadow-xl shadow-primary/10 sm:p-8">
          <h1 className="font-serif text-2xl font-bold tracking-tight">Set your password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Choose a password to access the GAkinz platform.</p>
          {done ? (
            <p className="mt-6 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              Password set — taking you to sign in…
            </p>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="pw">New password</Label>
                <Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1.5" required />
              </div>
              <div>
                <Label htmlFor="pw2">Confirm password</Label>
                <Input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className="mt-1.5" required />
              </div>
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>
              )}
              <Button type="submit" className="gk-shine w-full" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Set password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
