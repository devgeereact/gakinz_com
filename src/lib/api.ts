// Central API helper.
// Dev → hit the live API on the domain (api.php enables CORS).
// Production (same domain) → relative path.
import { getStoredToken, useAuth, type AuthUser, type Role } from "@/store/auth.store"

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
      // Self-healing session expiry: a 401 means the token is gone/expired, so
      // purge auth — RequireAuth then redirects to /login instead of leaving the
      // user stuck on a module that keeps erroring. (No-op pre-login.)
      if (res.status === 401) useAuth.getState().clear()
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
  valid_until: string | null
  client_id: number | null
  project_id: number | null
  client_company: string | null
  total: number // ex VAT (line-item sum)
  created_at: string
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
export type CommChannel = "email" | "sms" | "call" | "meeting" | "client" | "internal"
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
