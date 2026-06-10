// Central API helper.
// Dev → hit the live API on the domain (api.php enables CORS).
// Production (same domain) → relative path.
export const API_BASE = import.meta.env.DEV ? "https://gakinz.com" : ""

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      ...init,
    })
    const text = await res.text()
    const body = text ? JSON.parse(text) : null
    if (!res.ok) {
      return { ok: false, error: (body && body.error) || `Request failed (${res.status})` }
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
