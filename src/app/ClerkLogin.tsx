import { useEffect, useState } from "react"
import { SignIn, useAuth as useClerkAuth } from "@clerk/clerk-react"
import { Navigate, useLocation } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import AuthFrame from "@/app/components/AuthFrame"
import ClerkSession from "@/app/ClerkSession"
import { auth } from "@/lib/api"
import { clerkSignOut } from "@/lib/clerk"
import { defaultPathForRole } from "@/lib/access"
import { useAuth } from "@/store/auth.store"

/** Email-code sign-in by Clerk, in the existing sign-in frame. */
function Inner() {
  const { isLoaded, isSignedIn } = useClerkAuth()
  const location = useLocation()
  const user = useAuth((s) => s.user)
  const setUser = useAuth((s) => s.setUser)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let alive = true
    auth.me().then((res) => {
      if (!alive) return
      if (res.ok) setUser(res.data.user)
      else setDenied(true)
    })
    return () => {
      alive = false
    }
  }, [isLoaded, isSignedIn, setUser])

  if (isLoaded && isSignedIn && user && !denied) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from.startsWith("/app") ? from : defaultPathForRole(user.role)} replace />
  }
  if (!isLoaded || (isSignedIn && !denied)) {
    return (
      <div className="grid place-items-center py-10 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }
  if (isSignedIn && denied) {
    return (
      <div className="text-center">
        <h1 className="font-display text-xl font-semibold">No access yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You are signed in, but this email is not set up in GAkinzOS. Ask the owner to add it, then sign in again.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => clerkSignOut().then(() => setDenied(false))}>
          Sign out
        </Button>
      </div>
    )
  }
  return <SignIn routing="hash" />
}

export default function ClerkLogin() {
  return (
    <AuthFrame>
      <ClerkSession>
        <Inner />
      </ClerkSession>
    </AuthFrame>
  )
}
