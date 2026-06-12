import { useEffect } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { auth } from "@/lib/api"
import { useAuth } from "@/store/auth.store"
import { canAccess, defaultPathForRole, moduleKeyForPath } from "@/lib/access"

// Gates the /app CMS.
//   • No token → redirect to /login (remembering where you were).
//   • With a token → revalidate against the server; a 401 clears the stale
//     session so the next render redirects.
//   • Role gate → if the signed-in role can't open this module, bounce it to
//     the role's default landing. This is UX only; every endpoint also enforces
//     the role server-side (see src/lib/access.ts).
export default function RequireAuth() {
  const location = useLocation()
  const token = useAuth((s) => s.token)
  const user = useAuth((s) => s.user)
  const setUser = useAuth((s) => s.setUser)
  const clear = useAuth((s) => s.clear)

  useEffect(() => {
    if (!token) return
    let alive = true
    auth.me().then((res) => {
      if (!alive) return
      if (res.ok) setUser(res.data.user)
      else if (res.status === 401) clear()
    })
    return () => {
      alive = false
    }
  }, [token, setUser, clear])

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  // Role gate. `user` comes from the persisted store, so it's available on the
  // first render after login/refresh. Skip until we have it (me() may still be
  // in flight on a cold load).
  if (user) {
    const moduleKey = moduleKeyForPath(location.pathname)
    if (moduleKey && !canAccess(user.role, moduleKey)) {
      const fallback = defaultPathForRole(user.role)
      if (location.pathname !== fallback) {
        return <Navigate to={fallback} replace />
      }
    }
  }

  return <Outlet />
}
