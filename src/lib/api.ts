// Central API helper.
// Dev → hit the live API on the domain (api.php enables CORS).
// Production (same domain) → relative path.
import { getStoredToken, useAuth, type AuthUser, type Role } from "@/store/auth.store"

export const API_BASE = import.meta.env.DEV ? "https://gakinz.com" : ""

export type ApiResult<T> =
  | { ok: true; data: T }
  // `details` carries the full parsed error body (e.g. { two_factor_required }).
  | { ok: false; error: string; status?: number; details?: Record<string, unknown> }

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
      // Self-healing session expiry: a 401 means the token is gone/expired, so
      // purge auth — RequireAuth then redirects to /login instead of leaving the
      // user stuck on a module that keeps erroring. (No-op pre-login.) Exception:
      // a 2FA-required 401 during login must NOT clear (there's nothing to clear).
      // Also exception: a 401 from the login call itself means wrong credentials,
      // not an expired session. On the lock screen that must show an error, not
      // sign the user out of the session they are unlocking.
      if (res.status === 401 && body?.two_factor_required !== true && !path.startsWith("/auth.php?action=login")) {
        useAuth.getState().clear()
      }
      return { ok: false, error: (body && body.error) || `Request failed (${res.status})`, status: res.status, details: body || undefined }
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
  // Multipart upload (FormData). No Content-Type header — the browser sets the
  // multipart boundary itself.
  upload: async <T>(path: string, form: FormData): Promise<ApiResult<T>> => {
    try {
      const token = getStoredToken()
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      const text = await res.text()
      const body = text ? JSON.parse(text) : null
      if (!res.ok) {
        if (res.status === 401) useAuth.getState().clear()
        return { ok: false, error: (body && body.error) || `Upload failed (${res.status})`, status: res.status }
      }
      return { ok: true, data: body as T }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Network error" }
    }
  },
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
  tags: string | null
  score: number // 0 unscored | 1 cold | 2 warm | 3 hot
  lost_reason: string | null
  created_at: string
  // Owner's follow-up (2026-10-10 schema step). Absent until that ALTER has run.
  next_action_at?: string | null // YYYY-MM-DD
  next_action_note?: string | null
  priority?: LeadPriority
}
export type LeadPriority = 0 | 1 | 2 | 3 // 0 none | 1 low | 2 normal | 3 high
export const leads = {
  list: () => api.get<Lead[]>("/leads.php"),
  setStatus: (id: number, status: LeadStage, lost_reason?: string) =>
    api.post<{ ok: boolean }>("/leads.php?action=status", { id, status, ...(lost_reason ? { lost_reason } : {}) }),
  setMeta: (
    id: number,
    payload: {
      tags?: string
      score?: number
      next_action_at?: string | null
      next_action_note?: string | null
      priority?: LeadPriority
    },
  ) =>
    // `followup` is false when the server has not had the follow-up columns added yet.
    api.post<{ ok: boolean; followup?: boolean }>("/leads.php?action=meta", { id, ...payload }),
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
  retainer_amount: number
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
  retainer_amount?: number
  notes?: string
}
// Client detail: lifetime value + a merged, newest-first history.
export type ClientTimelineItem = {
  type: "proposal" | "project" | "invoice" | "ticket"
  id: number
  label: string
  status: string
  amount: number | null
  date: string
}
export type ClientDetail = {
  client: Client
  stats: { ltv: number; outstanding: number; projects: number; proposals: number; open_tickets: number }
  timeline: ClientTimelineItem[]
}
export const clients = {
  list: () => api.get<Client[]>("/clients.php"),
  get: (id: number) => api.get<ClientDetail>(`/clients.php?id=${id}`),
  create: (payload: ClientInput) => api.post<{ id: number }>("/clients.php?action=create", payload),
  update: (id: number, payload: ClientInput) =>
    api.post<{ ok: boolean }>("/clients.php?action=update", { id, ...payload }),
  convertLead: (leadId: number) =>
    api.post<{ id: number; existing?: boolean }>("/clients.php?action=convert", { lead_id: leadId }),
}

// Projects & Tasks (§6 Projects & Tasks).
export type ProjectStatus = "planning" | "in_progress" | "on_hold" | "launched"
// 5-stage delivery pipeline (Discover · Design · Build · Launch · Support).
export type ProjectStage = "discover" | "design" | "build" | "launch" | "support"
export type Project = {
  id: number
  name: string
  status: ProjectStatus
  stage: ProjectStage
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
  setStage: (id: number, stage: ProjectStage) =>
    api.post<{ ok: boolean }>("/projects.php?action=stage", { id, stage }),
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
  vat_rate: number
  share_token: string | null
  views: number
  last_viewed_at: string | null
  valid_until: string | null
  client_id: number | null
  project_id: number | null
  client_company: string | null
  total: number // ex VAT (line-item sum)
  created_at: string
}
// Public read-only proposal (by share token) — no auth.
export type PublicProposal = {
  id: number
  title: string
  status: ProposalStatus
  currency: string
  vat_rate: number
  notes: string | null
  valid_until: string | null
  client_company: string | null
  items: { description: string; qty: number; unit_price: number }[]
}
// One leg of the 40/30/30 schedule auto-created when a proposal is accepted.
export type ScheduledInvoice = { id: number; number: string; label: string; amount: number; due_at: string }
export const proposals = {
  list: () => api.get<Proposal[]>("/proposals.php"),
  create: (payload: {
    title: string
    client_id?: number | null
    valid_until?: string
    notes?: string
    vat_rate?: number
    items: ProposalItemInput[]
  }) => api.post<{ id: number }>("/proposals.php?action=create", payload),
  setStatus: (id: number, status: "draft" | "sent" | "declined") =>
    api.post<{ ok: boolean }>("/proposals.php?action=status", { id, status }),
  accept: (id: number) =>
    api.post<{ ok: boolean; project_id: number; existing?: boolean; invoices?: ScheduledInvoice[] }>(
      "/proposals.php?action=accept",
      { id },
    ),
  share: (id: number) => api.post<{ token: string }>("/proposals.php?action=share", { id }),
  // Public, no-auth read-only fetch by share token (records a view server-side).
  publicView: (token: string) => api.get<PublicProposal>(`/proposals.php?token=${encodeURIComponent(token)}`),
}

// Invoicing (§6 Invoicing & Payments). Manual mark-as-paid.
export type InvoiceStatus = "draft" | "sent" | "paid"
export type Invoice = {
  id: number
  number: string | null
  status: InvoiceStatus
  currency: string
  vat_rate: number
  issued_at: string
  due_at: string | null
  paid_at: string | null
  client_id: number | null
  client_company: string | null
  subtotal: number // ex VAT (line-item sum)
  vat_amount: number
  total: number // payable, inc VAT (= subtotal when vat_rate is 0)
  overdue: boolean
}
export type InvoiceLine = { id: number; description: string; qty: number; unit_price: number }
export type InvoiceDetail = Invoice & {
  notes: string | null
  client_email: string | null
  project_id: number | null
  items: InvoiceLine[]
}
export const invoices = {
  list: () => api.get<Invoice[]>("/invoices.php"),
  get: (id: number) => api.get<InvoiceDetail>(`/invoices.php?id=${id}`),
  create: (payload: {
    client_id?: number | null
    project_id?: number | null
    due_at?: string
    notes?: string
    vat_rate?: number
    items: ProposalItemInput[]
  }) => api.post<{ id: number; number: string }>("/invoices.php?action=create", payload),
  setStatus: (id: number, status: InvoiceStatus) =>
    api.post<{ ok: boolean }>("/invoices.php?action=status", { id, status }),
  // Stripe: create a hosted Checkout payment link for an invoice. The webhook
  // (payments.php?action=webhook) marks it paid once Stripe confirms.
  payLink: (invoice_id: number) =>
    api.post<{ url: string; session_id: string }>("/payments.php?action=link", { invoice_id }),
  // PayPal: create an order and return the approve URL (capture happens on return).
  paypalLink: (invoice_id: number) =>
    api.post<{ url: string; order_id: string }>("/payments.php?action=paypal_link", { invoice_id }),
  // Email the client a payment reminder for an unpaid invoice (needs SMTP).
  chase: (id: number) => api.post<{ ok: boolean; sent_to: string }>("/invoices.php?action=chase", { id }),
}

// Profitability report (management). Per-project revenue vs cost vs margin.
export type ProfitabilityRow = {
  project_id: number
  project: string
  client: string | null
  revenue: number
  cost: number
  margin: number
}
export const reports = {
  profitability: () => api.get<ProfitabilityRow[]>("/reports.php?report=profitability"),
}

// Time tracking (§6 Time).
export type TimeStatus = "draft" | "approved" | "rejected"
export type TimeEntry = {
  id: number
  project_id: number
  project_name: string
  description: string | null
  minutes: number
  billable: boolean
  status: TimeStatus
  entry_date: string
  user_name: string | null
  user_id: number | null
}
export const time = {
  list: () => api.get<TimeEntry[]>("/time.php"),
  create: (payload: {
    project_id: number
    minutes: number
    description?: string
    billable?: boolean
    entry_date?: string
  }) => api.post<{ id: number }>("/time.php?action=create", payload),
  remove: (id: number) => api.post<{ ok: boolean }>("/time.php?action=delete", { id }),
  // Timesheet approval (manager+). Only approved entries count as billable.
  approve: (id: number) => api.post<{ ok: boolean }>("/time.php?action=approve", { id }),
  reject: (id: number) => api.post<{ ok: boolean }>("/time.php?action=reject", { id }),
}

// Support tickets (§6 Support).
export type TicketStatus = "open" | "in_progress" | "resolved"
export type TicketPriority = "urgent" | "high" | "normal" | "low"
export type Ticket = {
  id: number
  subject: string
  status: TicketStatus
  priority: TicketPriority
  client_id: number | null
  assignee_id: number | null
  client_company: string | null
  assignee_name: string | null
  created_at: string
}
export type TicketReply = { id: number; body: string; created_at: string; author: string | null }
export type TicketDetail = Ticket & { body: string | null; replies: TicketReply[] }
export const support = {
  list: () => api.get<Ticket[]>("/support.php"),
  get: (id: number) => api.get<TicketDetail>(`/support.php?id=${id}`),
  create: (payload: { subject: string; body?: string; client_id?: number | null; priority?: TicketPriority }) =>
    api.post<{ id: number }>("/support.php?action=create", payload),
  setStatus: (id: number, status: TicketStatus) =>
    api.post<{ ok: boolean }>("/support.php?action=status", { id, status }),
  setPriority: (id: number, priority: TicketPriority) =>
    api.post<{ ok: boolean }>("/support.php?action=priority", { id, priority }),
  reply: (id: number, body: string) => api.post<{ id: number }>("/support.php?action=reply", { id, body }),
}

// A `client`-role user's own messages: the client branch of support.php. The
// server derives the client from the token, so none of these take a client id,
// and it refuses status, priority and assignment for this role.
export const MESSAGE_SUBJECT_MAX = 200
export const MESSAGE_BODY_MAX = 5000
export type ClientMessageReply = {
  id: number
  body: string
  created_at: string
  author: string | null
  from_client: boolean
}
export type ClientThread = {
  id: number
  subject: string
  body: string | null
  status: TicketStatus
  created_at: string
  last_activity: string
  replies: ClientMessageReply[]
}
export const clientMessages = {
  list: () => api.get<ClientThread[]>("/support.php"),
  get: (id: number) => api.get<ClientThread>(`/support.php?id=${id}`),
  start: (subject: string, body: string) =>
    api.post<{ id: number }>("/support.php?action=create", { subject, body }),
  reply: (id: number, body: string) => api.post<{ id: number }>("/support.php?action=reply", { id, body }),
}

// Client portal (§6 Client Portal). Aggregated client-facing view.
export type PortalData = {
  client: { id: number; company: string; contact_name: string | null; email: string | null }
  projects: { id: number; name: string; status: string; due_date: string | null; task_count: number; done_count: number }[]
  invoices: { id: number; number: string | null; status: string; issued_at: string; due_at: string | null; subtotal: number; vat_rate: number; vat_amount: number; total: number }[]
  tickets: { id: number; subject: string; status: string; priority: string; created_at: string }[]
}
export const portal = {
  get: (clientId: number) => api.get<PortalData>(`/portal.php?client_id=${clientId}`),
}

// Communication Hub (§6 Comms). Threads tie every conversation to a client /
// project. No external provider yet — messages are recorded, not delivered.
export type CommChannel = "email" | "sms" | "whatsapp" | "call" | "meeting" | "client" | "internal"
export type CommDirection = "out" | "in" | "note"
export type CommThread = {
  id: number
  subject: string
  channel: CommChannel
  status: "open" | "archived"
  client_id: number | null
  project_id: number | null
  client_company: string | null
  project_name: string | null
  created_at: string
  last_message_at: string | null
  message_count: number
  preview: string | null
}
export type CommMessage = {
  id: number
  direction: CommDirection
  body: string
  created_at: string
  author: string | null
}
export type CommThreadDetail = Omit<CommThread, "message_count" | "preview"> & {
  messages: CommMessage[]
}
export const comms = {
  list: () => api.get<CommThread[]>("/comms.php"),
  get: (id: number) => api.get<CommThreadDetail>(`/comms.php?id=${id}`),
  create: (payload: {
    subject: string
    client_id?: number | null
    project_id?: number | null
    channel?: CommChannel
    body?: string
  }) => api.post<{ id: number }>("/comms.php?action=create", payload),
  post: (thread_id: number, body: string, direction: CommDirection = "note") =>
    api.post<{ id: number }>("/comms.php?action=post", { thread_id, body, direction }),
  // Email/SMS threads: delivers a real email or text to the linked client AND
  // records it as an outbound message.
  send: (thread_id: number, body: string) =>
    api.post<{ id: number; sent_to: string; channel: CommChannel }>("/comms.php?action=send", {
      thread_id,
      body,
    }),
  setStatus: (id: number, status: "open" | "archived") =>
    api.post<{ ok: boolean }>("/comms.php?action=status", { id, status }),
}

// AI (§6.7). Every call routes server-side through ai.php; the key never
// reaches the browser. Returns generated text for the given task/input.
export const ai = {
  run: (task: string, input: string, system?: string) =>
    api.post<{ text: string }>("/ai.php", { task, input, system }),
}

// Users & roles (§6.11 Platform). Admin only.
export type UserStatus = "active" | "suspended"
export type ManagedUser = {
  id: number
  name: string
  email: string
  role: Role
  client_id: number | null
  client_company: string | null
  cost_rate: number
  totp_enabled: boolean
  status: UserStatus
  created_at: string
}
export const users = {
  list: () => api.get<ManagedUser[]>("/users.php"),
  create: (payload: {
    name: string
    email: string
    password: string
    role: Role
    client_id?: number | null
  }) => api.post<{ id: number }>("/users.php?action=create", payload),
  setRole: (id: number, role: Role) => api.post<{ ok: boolean }>("/users.php?action=role", { id, role }),
  setStatus: (id: number, status: UserStatus) =>
    api.post<{ ok: boolean }>("/users.php?action=status", { id, status }),
  setRate: (id: number, cost_rate: number) =>
    api.post<{ ok: boolean }>("/users.php?action=rate", { id, cost_rate }),
  // Invite a staff member (emails a set-password link instead of a temp password).
  invite: (payload: { name: string; email: string; role: Role }) =>
    api.post<{ id: number }>("/users.php?action=invite", payload),
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
  // `code` is the 6-digit TOTP, sent only when the account has 2FA enabled. A
  // first attempt without it returns 401 + details.two_factor_required.
  login: (email: string, password: string, code?: string) =>
    api.post<LoginResponse>("/auth.php?action=login", { email, password, ...(code ? { code } : {}) }),
  twofaSetup: () => api.post<{ secret: string; otpauth: string }>("/auth.php?action=twofa_setup", {}),
  twofaEnable: (code: string) => api.post<{ ok: boolean; recovery_codes: string[] }>("/auth.php?action=twofa_enable", { code }),
  twofaDisable: (code: string) => api.post<{ ok: boolean }>("/auth.php?action=twofa_disable", { code }),
  twofaRecodes: (code: string) => api.post<{ ok: boolean; recovery_codes: string[] }>("/auth.php?action=twofa_recodes", { code }),
  // Passwordless magic-link login.
  magicRequest: (email: string) => api.post<{ ok: boolean }>("/auth.php?action=magic_request", { email }),
  magicConsume: (token: string) => api.post<LoginResponse>("/auth.php?action=magic_consume", { token }),
  ssoStatus: () => api.get<{ google: boolean }>("/oauth.php?action=status"),
  // totp_enabled is the caller's own two-factor state; absent on a server that
  // predates it, null on a DB without the totp columns.
  me: () => api.get<{ user: AuthUser; totp_enabled?: boolean | null }>("/auth.php?action=me"),
  logout: () => api.post<{ ok: boolean }>("/auth.php?action=logout", {}),
  // Revokes a token other than the stored one (K-033: the token held before the
  // lock screen was unlocked). Sends that token explicitly and, unlike
  // `request`, never clears the stored session, which belongs to the new token.
  revokeToken: async (token: string): Promise<ApiResult<{ ok: boolean }>> => {
    try {
      const res = await fetch(`${API_BASE}/auth.php?action=logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: "{}",
      })
      const text = await res.text()
      const body = text ? JSON.parse(text) : null
      if (!res.ok) return { ok: false, error: (body && body.error) || `Request failed (${res.status})`, status: res.status }
      return { ok: true, data: body as { ok: boolean } }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Network error" }
    }
  },
  forgot: (email: string) => api.post<{ ok: boolean }>("/auth.php?action=forgot", { email }),
  reset: (token: string, password: string) =>
    api.post<{ ok: boolean }>("/auth.php?action=reset", { token, password }),
  sessions: () => api.get<Session[]>("/auth.php?action=sessions"),
  revokeSession: (id: number) => api.post<{ ok: boolean }>("/auth.php?action=revoke", { id }),
}

// Active login sessions (device tracking) for the signed-in user.
export type Session = {
  id: number
  user_agent: string | null
  ip: string | null
  last_seen_at: string | null
  created_at: string
  expires_at: string
  current: boolean
}

// Design Workspace — Figma review rounds per project (2-round limit) + sign-off.
export type DesignStatus = "pending" | "approved" | "changes"
export type DesignReview = {
  id: number
  project_id: number
  title: string
  figma_url: string | null
  round: number
  status: DesignStatus
  client_comment: string | null
  created_at: string
  project_name: string
  client_company: string | null
}
export const design = {
  list: (projectId?: number) =>
    api.get<DesignReview[]>(`/design.php${projectId ? `?project_id=${projectId}` : ""}`),
  create: (payload: { project_id: number; title: string; figma_url?: string }) =>
    api.post<{ id: number; round: number }>("/design.php?action=create", payload),
  setStatus: (id: number, status: DesignStatus, client_comment?: string) =>
    api.post<{ ok: boolean }>("/design.php?action=status", { id, status, client_comment }),
  remove: (id: number) => api.post<{ ok: boolean }>("/design.php?action=delete", { id }),
}

// Development Pipeline — repo/env URLs + JSON checklist + deploy log per project.
export type DevProjectRow = {
  id: number
  name: string
  status: string
  client_company: string | null
  repo_url: string | null
  staging_url: string | null
  prod_url: string | null
  deploy_count: number
}
export type DevMeta = {
  project_id: number
  repo_url: string | null
  staging_url: string | null
  prod_url: string | null
  checklist: string | null // JSON string {key:bool}
}
export type Deploy = {
  id: number
  environment: "staging" | "production"
  status: "success" | "failed" | "rolled_back"
  url: string | null
  notes: string | null
  created_at: string
  by_name: string | null
}
export const dev = {
  list: () => api.get<DevProjectRow[]>("/dev.php"),
  get: (projectId: number) => api.get<{ meta: DevMeta | null; deploys: Deploy[] }>(`/dev.php?project_id=${projectId}`),
  saveMeta: (payload: {
    project_id: number
    repo_url?: string
    staging_url?: string
    prod_url?: string
    checklist?: Record<string, boolean>
  }) => api.post<{ ok: boolean }>("/dev.php?action=meta", payload),
  deploy: (payload: { project_id: number; environment: "staging" | "production"; status?: string; url?: string; notes?: string }) =>
    api.post<{ id: number }>("/dev.php?action=deploy", payload),
}

// Resourcing & Capacity — live capacity from time + leave tracking.
export type TeamMember = {
  id: number
  name: string
  role: Role
  logged_minutes: number
  capacity_minutes: number
  on_leave: boolean
}
export type LeaveEntry = {
  id: number
  user_id: number
  user_name: string
  start_date: string
  end_date: string
  type: "holiday" | "sick" | "other"
  note: string | null
}
export const resourcing = {
  get: () => api.get<{ team: TeamMember[]; leave: LeaveEntry[] }>("/resourcing.php"),
  addLeave: (payload: { user_id: number; start_date: string; end_date: string; type?: string; note?: string }) =>
    api.post<{ id: number }>("/resourcing.php?action=leave", payload),
  removeLeave: (id: number) => api.post<{ ok: boolean }>("/resourcing.php?action=delete", { id }),
}

// Contracts & e-Signature — typed-name e-sign with audit trail.
export type ContractStatus = "draft" | "sent" | "signed" | "void"
export type ContractKind = "agreement" | "nda"
export type Contract = {
  id: number
  client_id: number | null
  project_id: number | null
  kind: ContractKind
  title: string
  status: ContractStatus
  nda_triage: "green" | "yellow" | "red" | null
  signer_name: string | null
  signed_at: string | null
  created_at: string
  client_company: string | null
  project_name: string | null
}
export type ContractDetail = Contract & {
  body: string | null
  signer_email: string | null
  signed_name: string | null
  signed_ip: string | null
}
export const contracts = {
  list: () => api.get<Contract[]>("/contracts.php"),
  get: (id: number) => api.get<ContractDetail>(`/contracts.php?id=${id}`),
  create: (payload: {
    title: string
    client_id?: number | null
    project_id?: number | null
    kind?: ContractKind
    body?: string
    nda_triage?: string
    signer_name?: string
    signer_email?: string
  }) => api.post<{ id: number }>("/contracts.php?action=create", payload),
  setStatus: (id: number, status: "draft" | "sent" | "void") =>
    api.post<{ ok: boolean }>("/contracts.php?action=status", { id, status }),
  sign: (id: number, signed_name: string) =>
    api.post<{ ok: boolean }>("/contracts.php?action=sign", { id, signed_name }),
  remove: (id: number) => api.post<{ ok: boolean }>("/contracts.php?action=delete", { id }),
}

// Knowledge Base & SOPs — internal wiki / runbooks / client help.
export type KbSummary = {
  id: number
  title: string
  category: string
  audience: "internal" | "client"
  updated_at: string
  author: string | null
}
export type KbArticle = KbSummary & { body: string | null; created_at: string }
export const knowledge = {
  list: (q = "", category = "") =>
    api.get<KbSummary[]>(`/knowledge.php?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}`),
  get: (id: number) => api.get<KbArticle>(`/knowledge.php?id=${id}`),
  create: (payload: { title: string; category?: string; audience?: string; body?: string }) =>
    api.post<{ id: number }>("/knowledge.php?action=create", payload),
  update: (id: number, payload: { title: string; category?: string; audience?: string; body?: string }) =>
    api.post<{ ok: boolean }>("/knowledge.php?action=update", { id, ...payload }),
  remove: (id: number) => api.post<{ ok: boolean }>("/knowledge.php?action=delete", { id }),
}

// Files & Documents — per-project/client storage with expiring share links.
export type FileRow = {
  id: number
  client_id: number | null
  project_id: number | null
  name: string
  mime: string | null
  size: number
  share_token: string | null
  expires_at: string | null
  created_at: string
  client_company: string | null
  project_name: string | null
  uploaded_by_name: string | null
}
export const files = {
  list: (params?: { project_id?: number; client_id?: number }) => {
    const q = new URLSearchParams()
    if (params?.project_id) q.set("project_id", String(params.project_id))
    if (params?.client_id) q.set("client_id", String(params.client_id))
    const s = q.toString()
    return api.get<FileRow[]>(`/files.php${s ? `?${s}` : ""}`)
  },
  upload: (file: File, params?: { project_id?: number; client_id?: number }) => {
    const form = new FormData()
    form.append("file", file)
    if (params?.project_id) form.append("project_id", String(params.project_id))
    if (params?.client_id) form.append("client_id", String(params.client_id))
    return api.upload<{ id: number }>("/files.php?action=upload", form)
  },
  share: (id: number, days = 7) => api.post<{ token: string; expires_at: string }>("/files.php?action=share", { id, days }),
  remove: (id: number) => api.post<{ ok: boolean }>("/files.php?action=delete", { id }),
  // Authenticated download URL (token is attached by the browser via the page,
  // so for direct links prefer a share link). Returns the absolute API path.
  downloadUrl: (id: number) => `${API_BASE}/files.php?download=${id}`,
  shareUrl: (token: string) => `${API_BASE}/files.php?token=${token}`,
}

// Announcements / broadcasts.
export type Announcement = {
  id: number
  title: string
  body: string | null
  level: "info" | "warning"
  created_at: string
  author: string | null
}
export const announcements = {
  list: () => api.get<Announcement[]>("/announcements.php"),
  create: (payload: { title: string; body?: string; level?: string }) =>
    api.post<{ id: number }>("/announcements.php?action=create", payload),
  remove: (id: number) => api.post<{ ok: boolean }>("/announcements.php?action=delete", { id }),
}

// Launch & Care-Plan — sites under management (projects with a prod URL),
// with the latest uptime + SSL-expiry from the monitor.
export type CarePlanSite = {
  project_id: number
  project_name: string
  status: string
  client_company: string | null
  retainer_amount: number
  prod_url: string
  last_http_status: number | null
  ssl_days_left: number | null
  last_checked_at: string | null
}
export const careplan = {
  list: () => api.get<CarePlanSite[]>("/careplan.php"),
  check: (project_id: number) =>
    api.post<{ project_id: number; last_http_status: number | null; ssl_days_left: number | null; ok: boolean }>(
      "/careplan.php?action=check",
      { project_id },
    ),
}

// Integrations status (admins) — booleans only, never the keys.
export type IntegrationStatus = {
  smtp: boolean
  imap: boolean
  openrouter: boolean
  stripe: boolean
  twilio: boolean
  google: boolean
  openweather: boolean
  cron: boolean
  reports: boolean
  github: boolean
  figma: boolean
  slack: boolean
  calendly: boolean
  paypal: boolean
  whatsapp: boolean
}
export const integrations = {
  status: () => api.get<IntegrationStatus>("/integrations.php"),
  slackTest: () => api.post<{ ok: boolean }>("/slack.php?action=test", {}),
}

// GitHub connector — recent commits / open PRs / latest CI run for a repo URL.
export type GithubCommit = { sha: string; message: string; author: string; date: string; url: string }
export type GithubPull = { number: number; title: string; author: string; url: string }
export type GithubRun = { name: string; status: string; conclusion: string; url: string; date: string }
export type GithubRepo = {
  repo: string
  url: string
  default_branch: string
  open_issues: number
  commits: GithubCommit[]
  pulls: GithubPull[]
  run: GithubRun | null
}
export const github = {
  repo: (url: string) => api.get<GithubRepo>(`/github.php?url=${encodeURIComponent(url)}`),
}

// Figma connector — file name / thumbnail / last-modified for a Figma URL.
export type FigmaFile = { key: string; name: string; last_modified: string | null; thumbnail: string | null; version: string | null }
export const figma = {
  file: (url: string) => api.get<FigmaFile>(`/figma.php?url=${encodeURIComponent(url)}`),
}

// Discovery-call booking (Calendly). Public — returns "" when not configured.
export const booking = {
  url: () => api.get<{ url: string }>("/book.php"),
}

// Weather (CMS dashboard widget). Server proxies OpenWeather; key stays server-side.
export type Weather = {
  city: string
  country: string
  temp: number | null
  feels_like: number | null
  description: string
  icon: string
  humidity: number | null
  wind: number | null
  units: string
  updated: string
}
export const weather = {
  current: (city = "London") => api.get<Weather>(`/weather.php?city=${encodeURIComponent(city)}`),
}

// Mailbox (GAkinzOS). SMTP send + IMAP inbox via mail.php. Senior staff only.
export type MailStatus = { smtp: boolean; imap: boolean; imap_ext: boolean }
export type MailSummary = {
  uid: number
  subject: string
  from_name: string
  from_email: string
  date: string | null
  seen: boolean
  answered: boolean
  message_id: string
  size: number
}
export type MailMessage = {
  uid: number
  subject: string
  from_name: string
  from_email: string
  to: string
  date: string | null
  message_id: string
  text: string
  html: string
}
export type SendMailPayload = {
  to: string
  subject: string
  body: string
  cc?: string
  in_reply_to?: string
  references?: string
}
export const mail = {
  status: () => api.get<MailStatus>("/mail.php?action=status"),
  inbox: (limit = 30, search = "") =>
    api.get<MailSummary[]>(
      `/mail.php?action=inbox&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
    ),
  message: (uid: number) => api.get<MailMessage>(`/mail.php?action=message&uid=${uid}`),
  send: (payload: SendMailPayload) => api.post<{ ok: boolean; message_id: string }>("/mail.php?action=send", payload),
  setSeen: (uid: number, seen = true) => api.post<{ ok: boolean }>("/mail.php?action=seen", { uid, seen }),
}

// ── Blog (public site) ───────────────────────────────────────────────────────
export type BlogSummary = {
  id: number
  slug: string
  title: string
  excerpt: string | null
  category: string
  cover: string
  read_mins: number
  published_at: string | null
  author?: string | null
}
export type BlogPost = BlogSummary & { body: string | null }
export type BlogAdminRow = {
  id: number
  slug: string
  title: string
  category: string
  cover: string
  read_mins: number
  status: string
  published_at: string | null
  updated_at: string
}
export type BlogInput = {
  title: string
  slug?: string
  excerpt?: string
  body?: string
  category?: string
  cover?: string
  read_mins?: number
  status?: string
}

export const blog = {
  list: () => api.get<BlogSummary[]>("/blog.php"),
  get: (slug: string) => api.get<BlogPost>(`/blog.php?slug=${encodeURIComponent(slug)}`),
  listAll: () => api.get<BlogAdminRow[]>("/blog.php?all=1"),
  // Editors: one post by id, any status, with excerpt and body, for the edit form.
  getForEdit: (id: number) =>
    api.get<BlogAdminRow & { excerpt: string | null; body: string | null }>(`/blog.php?id=${id}`),
  create: (p: BlogInput) => api.post<{ id: number; slug: string }>("/blog.php?action=create", p),
  update: (id: number, p: BlogInput) => api.post<{ ok: boolean; slug: string }>("/blog.php?action=update", { id, ...p }),
  publish: (id: number, status: string) => api.post<{ ok: boolean }>("/blog.php?action=publish", { id, status }),
  remove: (id: number) => api.post<{ ok: boolean }>("/blog.php?action=delete", { id }),
}

// ── Testimonials (public site, CMS-curated) ──────────────────────────────────
export type Testimonial = {
  id: number
  author: string
  role: string | null
  company: string | null
  quote: string
  rating: number
}
export type TestimonialAdmin = Testimonial & { approved: number; sort_order: number; updated_at: string }
export type TestimonialInput = {
  author: string
  role?: string
  company?: string
  quote: string
  rating?: number
  approved?: boolean
  sort_order?: number
}

export const testimonials = {
  list: () => api.get<Testimonial[]>("/testimonials.php"),
  listAll: () => api.get<TestimonialAdmin[]>("/testimonials.php?all=1"),
  create: (p: TestimonialInput) => api.post<{ id: number }>("/testimonials.php?action=create", p),
  update: (id: number, p: TestimonialInput) =>
    api.post<{ ok: boolean }>("/testimonials.php?action=update", { id, ...p }),
  approve: (id: number, approved: boolean) =>
    api.post<{ ok: boolean }>("/testimonials.php?action=approve", { id, approved }),
  remove: (id: number) => api.post<{ ok: boolean }>("/testimonials.php?action=delete", { id }),
}

// ── Content Hub (AI multi-platform drafts) ───────────────────────────────────
export type ContentDraft = {
  id: number
  topic: string
  platform: string
  title: string | null
  body: string | null
  hashtags: string | null
  keywords: string | null
  status: string
  created_at: string
  updated_at: string
}
export type ContentDraftInput = {
  topic: string
  platform: string
  title?: string
  body?: string
  hashtags?: string
  keywords?: string
}

export const content = {
  list: () => api.get<ContentDraft[]>("/content.php"),
  create: (p: ContentDraftInput) => api.post<{ id: number }>("/content.php?action=create", p),
  update: (id: number, p: ContentDraftInput) => api.post<{ ok: boolean }>("/content.php?action=update", { id, ...p }),
  remove: (id: number) => api.post<{ ok: boolean }>("/content.php?action=delete", { id }),
}

// ── Work / portfolio (GAkinzOS Work module → public site) ────────────────────
// Mirrors server/work.php. Public reads (`list`, `get`) see published rows only
// and never a client name without recorded consent; `listAll` is staff-only and
// shows drafts plus the consent flag.
export type WorkKind = "case_study" | "product" | "experiment" | "writing"
export type WorkStatus = "draft" | "published"

// The cover the endpoint folds out of the joined work_images/files columns.
export type WorkCover = {
  file_id: number
  alt: string
  caption: string | null
  share_token: string | null
  mime: string | null
}

export type WorkImage = {
  id: number
  file_id: number
  alt: string
  caption: string | null
  sort_order: number
  share_token: string | null
  mime: string | null
}

// WORK_COLUMNS + the folded cover, minus anything a branch strips.
type WorkBase = {
  id: number
  slug: string
  kind: WorkKind
  title: string
  sector: string
  summary: string
  live_url: string | null
  repo_url: string | null
  post_id: number | null
  started_on: string | null
  completed_on: string | null
  cover_file_id: number | null
  featured: number
  sort_order: number
  status: WorkStatus
  created_at: string
  updated_at: string
  cover: WorkCover | null
}

// Public rows: `client_consent` is removed, and `client_name` is OMITTED
// entirely (key absent, not blank) unless consent was recorded.
export type WorkSummary = WorkBase & { client_name?: string }
// `?action=get` additionally selects the three narrative columns and the images.
export type WorkDetail = WorkSummary & {
  problem: string | null
  built: string | null
  outcome: string | null
  images: WorkImage[]
}
// `?action=listAll` keeps the client name and the consent flag, but does NOT
// select problem/built/outcome — only the public `get` returns those.
export type WorkAdminRow = WorkBase & { client_name: string; client_consent: number }

export type WorkInput = {
  title: string
  slug?: string
  kind?: WorkKind
  status?: WorkStatus
  client_name?: string
  client_consent?: boolean
  sector?: string
  summary?: string
  problem?: string
  built?: string
  outcome?: string
  live_url?: string
  repo_url?: string
  post_id?: number | null
  started_on?: string | null
  completed_on?: string | null
  cover_file_id?: number | null
  featured?: boolean
  sort_order?: number
}

export type WorkImageInput = {
  work_id: number
  file_id: number
  alt: string
  caption?: string
  sort_order?: number
}

// addImage reports what it had to do to the underlying files row to make the
// image publicly reachable. `expiry_cleared` means an existing Files-module
// share link that would have expired is now permanent.
export type WorkAddImageResult = {
  id: number
  share_token: string | null
  token_issued: boolean
  expiry_cleared: boolean
}

export const work = {
  list: (kind?: WorkKind) => api.get<WorkSummary[]>(`/work.php?action=list${kind ? `&kind=${kind}` : ""}`),
  get: (slug: string) => api.get<WorkDetail>(`/work.php?action=get&slug=${encodeURIComponent(slug)}`),
  listAll: () => api.get<WorkAdminRow[]>("/work.php?action=listAll"),
  create: (p: WorkInput) => api.post<{ id: number; slug: string }>("/work.php?action=create", p),
  update: (id: number, p: WorkInput) => api.post<{ ok: boolean; slug: string }>("/work.php?action=update", { id, ...p }),
  // Re-reads the STORED row, so a 409 here means consent is missing on the record.
  publish: (id: number, status: WorkStatus) =>
    api.post<{ ok: boolean; status: WorkStatus }>("/work.php?action=publish", { id, status }),
  remove: (id: number) => api.post<{ ok: boolean }>("/work.php?action=remove", { id }),
  reorder: (ids: number[]) => api.post<{ ok: boolean; count: number }>("/work.php?action=reorder", { ids }),
  // Alt text is mandatory server-side; an empty string is a 400. Attaching also
  // issues the file a permanent public share token (and clears any expiry a
  // previous Files share had set), so the image cannot quietly 404 later.
  addImage: (p: WorkImageInput) => api.post<WorkAddImageResult>("/work.php?action=addImage", p),
  removeImage: (id: number) => api.post<{ ok: boolean }>("/work.php?action=removeImage", { id }),
}
