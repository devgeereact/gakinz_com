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
  // Set only for the `client` role — the client record this login portals into.
  client_id?: number | null
}

type AuthState = {
  user: AuthUser | null
  setUser: (user: AuthUser) => void
  clear: () => void
}

// Persisted to localStorage under "gk-auth": only the user (name, email, role), for a fast first paint. The
// session itself is Clerk's, and lib/api.ts asks Clerk for a fresh token on each request (D-057). Nothing
// here is a credential.
export const AUTH_STORAGE_KEY = "gk-auth"

/**
 * What survives from an older stored sign-in. Before Phase 5 the store also held a session token; a browser
 * that still has one drops it here and keeps only the user. Anything unusable means signed out.
 */
export function migrateAuthState(persisted: unknown): { user: AuthUser | null } {
  const user = persisted && typeof persisted === "object" && !Array.isArray(persisted) ? (persisted as { user?: unknown }).user : null
  return { user: user && typeof user === "object" && !Array.isArray(user) ? (user as AuthUser) : null }
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clear: () => set({ user: null }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      version: 2,
      partialize: (state) => ({ user: state.user }),
      migrate: (persisted) => migrateAuthState(persisted) as unknown as AuthState,
    },
  ),
)
