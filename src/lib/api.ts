// Central API helper.
// Dev → hit the live API on the domain (api.php enables CORS).
// Production (same domain) → relative path.
import { getStoredToken, type AuthUser } from "@/store/auth.store"

export const API_BASE = import.meta.env.DEV ? "https://gakinz.com" : ""

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number }

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const token = getStoredToken()
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {}),
      },
      ...init,
    })
    const text = await res.text()
    const body = text ? JSON.parse(text) : null
    if (!res.ok) {
      return { ok: false, error: (body && body.error) || `Request failed (${res.status})`, status: res.status }
    }
    return { ok: true, data: body as T }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" }
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, payload: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(payload) }),
}

// Smoke-test endpoint (build order step 1): GET returns rows, POST inserts one.
export type Item = { id: number; name: string; created_at: string }
export const smoke = {
  list: () => api.get<Item[]>("/api.php"),
  add: (name: string) => api.post<Item>("/api.php", { name }),
}

// Public contact enquiry (corporate site → leads pipeline).
export type EnquiryPayload = {
  name: string
  email: string
  company?: string
  budget?: string
  projectType?: string
  message: string
}
export const contact = {
  send: (payload: EnquiryPayload) => api.post<{ id: number }>("/contact.php", payload),
}

// Auth (§6.1). Token + user persisted in the auth store; api attaches the bearer.
export type LoginResponse = { token: string; expires: string; user: AuthUser }
export const auth = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>("/auth.php?action=login", { email, password }),
  me: () => api.get<{ user: AuthUser }>("/auth.php?action=me"),
  logout: () => api.post<{ ok: boolean }>("/auth.php?action=logout", {}),
  forgot: (email: string) => api.post<{ ok: boolean }>("/auth.php?action=forgot", { email }),
  reset: (token: string, password: string) =>
    api.post<{ ok: boolean }>("/auth.php?action=reset", { token, password }),
}
