import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Role =
  | "super_admin"
  | "admin"
  | "manager"
  | "trainer"
  | "editor"
  | "employee"
  | "client"

export type AuthUser = {
  id: number
  name: string
  email: string
  role: Role
}

type AuthState = {
  token: string | null
  user: AuthUser | null
  setAuth: (token: string, user: AuthUser) => void
  setUser: (user: AuthUser) => void
  clear: () => void
}

// Persisted to localStorage under "gk-auth". lib/api.ts reads the token from the
// same key to attach the Authorization header (avoids an import cycle).
export const AUTH_STORAGE_KEY = "gk-auth"

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      clear: () => set({ token: null, user: null }),
    }),
    { name: AUTH_STORAGE_KEY },
  ),
)

// Plain accessor for non-React code (api layer).
export function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)?.state?.token ?? null
  } catch {
    return null
  }
}
