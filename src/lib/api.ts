// Central API helper.
// Dev → hit the live API on the domain (api.php enables CORS).
// Production (same domain) → relative path.
import { getStoredToken, type AuthUser, type Role } from "@/store/auth.store"

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

// Leads (§6 Leads). Enquiries captured by the public form, managed in the CMS.
export type LeadStage = "new" | "contacted" | "proposal" | "won" | "lost"
export type Lead = {
  id: number
  name: string
  email: string
  company: string | null
  budget: string | null
  project_type: string | null
  message: string
  status: LeadStage
  source: string
  created_at: string
}
export const leads = {
  list: () => api.get<Lead[]>("/leads.php"),
  setStatus: (id: number, status: LeadStage) =>
    api.post<{ ok: boolean }>("/leads.php?action=status", { id, status }),
}

// Clients / CRM (§6 Clients).
export type ClientTag = "retainer" | "one-off" | "vip" | "dormant"
export type Client = {
  id: number
  company: string
  contact_name: string | null
  email: string | null
  phone: string | null
  tag: ClientTag
  notes: string | null
  source_lead_id: number | null
  created_at: string
}
export type ClientInput = {
  company: string
  contact_name?: string
  email?: string
  phone?: string
  tag?: ClientTag
  notes?: string
}
export const clients = {
  list: () => api.get<Client[]>("/clients.php"),
  create: (payload: ClientInput) => api.post<{ id: number }>("/clients.php?action=create", payload),
  update: (id: number, payload: ClientInput) =>
    api.post<{ ok: boolean }>("/clients.php?action=update", { id, ...payload }),
  convertLead: (leadId: number) =>
    api.post<{ id: number; existing?: boolean }>("/clients.php?action=convert", { lead_id: leadId }),
}

// Projects & Tasks (§6 Projects & Tasks).
export type ProjectStatus = "planning" | "in_progress" | "on_hold" | "launched"
export type Project = {
  id: number
  name: string
  status: ProjectStatus
  due_date: string | null
  client_id: number | null
  client_company: string | null
  task_count: number
  done_count: number
  created_at: string
}
export const projects = {
  list: () => api.get<Project[]>("/projects.php"),
  create: (payload: { name: string; client_id?: number | null; due_date?: string }) =>
    api.post<{ id: number }>("/projects.php?action=create", payload),
  setStatus: (id: number, status: ProjectStatus) =>
    api.post<{ ok: boolean }>("/projects.php?action=status", { id, status }),
}

export type TaskStatus = "todo" | "doing" | "review" | "done"
export type Task = {
  id: number
  project_id: number
  title: string
  status: TaskStatus
  assignee: string | null
  due_date: string | null
  created_at: string
}
export const tasks = {
  list: (projectId: number) => api.get<Task[]>(`/tasks.php?project_id=${projectId}`),
  create: (payload: { project_id: number; title: string; assignee?: string; due_date?: string }) =>
    api.post<{ id: number }>("/tasks.php?action=create", payload),
  setStatus: (id: number, status: TaskStatus) =>
    api.post<{ ok: boolean }>("/tasks.php?action=status", { id, status }),
}

// Proposals & quotes (§6 Proposals).
export type ProposalStatus = "draft" | "sent" | "accepted" | "declined"
export type ProposalItemInput = { description: string; qty: number; unit_price: number }
export type Proposal = {
  id: number
  title: string
  status: ProposalStatus
  currency: string
  valid_until: string | null
  client_id: number | null
  project_id: number | null
  client_company: string | null
  total: number
  created_at: string
}
export const proposals = {
  list: () => api.get<Proposal[]>("/proposals.php"),
  create: (payload: {
    title: string
    client_id?: number | null
    valid_until?: string
    notes?: string
    items: ProposalItemInput[]
  }) => api.post<{ id: number }>("/proposals.php?action=create", payload),
  setStatus: (id: number, status: "draft" | "sent" | "declined") =>
    api.post<{ ok: boolean }>("/proposals.php?action=status", { id, status }),
  accept: (id: number) =>
    api.post<{ ok: boolean; project_id: number; existing?: boolean }>("/proposals.php?action=accept", { id }),
}

// Users & roles (§6.11 Platform). Admin only.
export type UserStatus = "active" | "suspended"
export type ManagedUser = {
  id: number
  name: string
  email: string
  role: Role
  status: UserStatus
  created_at: string
}
export const users = {
  list: () => api.get<ManagedUser[]>("/users.php"),
  create: (payload: { name: string; email: string; password: string; role: Role }) =>
    api.post<{ id: number }>("/users.php?action=create", payload),
  setRole: (id: number, role: Role) => api.post<{ ok: boolean }>("/users.php?action=role", { id, role }),
  setStatus: (id: number, status: UserStatus) =>
    api.post<{ ok: boolean }>("/users.php?action=status", { id, status }),
}

// Audit log (§6.1).
export type AuditEntry = {
  id: number
  action: string
  detail: string | null
  ip: string | null
  created_at: string
  user_name: string | null
  user_email: string | null
}
export const audit = {
  list: () => api.get<AuditEntry[]>("/audit.php"),
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
