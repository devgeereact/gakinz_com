import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { auth } from "@/lib/api"
import { useAuth } from "@/store/auth.store"
import BrandMark from "@/marketing/components/BrandMark"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const setAuth = useAuth((s) => s.setAuth)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || "/app"

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const res = await auth.login(email.trim(), password)
    setBusy(false)
    if (res.ok) {
      setAuth(res.data.token, res.data.user)
      navigate(from, { replace: true })
    } else {
      setError(res.error)
    }
  }

  return (
    <div className="gk-public flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2" aria-label="GAkinz home">
          <BrandMark className="h-9 w-9" />
          <span className="text-xl font-extrabold tracking-tight">
            GAkin<span className="text-primary">z</span>
          </span>
        </Link>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold">Member sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Access the GAkinz platform.</p>

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/auth/basic/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5"
                required
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            ← Back to gakinz.com
          </Link>
        </p>
      </div>
    </div>
  )
}
