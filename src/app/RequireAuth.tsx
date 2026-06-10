import { useEffect } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { auth } from "@/lib/api"
import { useAuth } from "@/store/auth.store"

// Gates the /app CMS. No token → redirect to /login (remembering where you were).
// With a token → render, and revalidate against the server; a 401 clears the
// stale session so the next render redirects.
export default function RequireAuth() {
  const location = useLocation()
  const token = useAuth((s) => s.token)
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
  return <Outlet />
}
