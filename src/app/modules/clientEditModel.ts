import type { Client, ClientInput, ClientTag } from "@/lib/api"

// Editing a client from its detail sheet (Phase 7). The server decides every rule (clients.php update);
// these helpers fill the form, save a round trip and send just what the person changed.

export type ClientForm = Required<Pick<ClientInput, "company" | "contact_name" | "email" | "phone" | "notes">> & {
  tag: ClientTag
  retainer_amount: number
}

export function clientFormFrom(c: Client): ClientForm {
  return {
    company: c.company,
    contact_name: c.contact_name ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    tag: c.tag,
    retainer_amount: c.retainer_amount ?? 0,
    notes: c.notes ?? "",
  }
}

/** One plain address or none, as the server insists (it is emailed by invoice reminders). */
const EMAIL = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/

export function clientFormProblem(f: ClientForm): string | null {
  if (!f.company.trim()) return "A company name is required."
  if (f.email.trim() && !EMAIL.test(f.email.trim())) return "Enter one valid email address, or leave it empty."
  if (!(f.retainer_amount >= 0)) return "The retainer cannot be negative."
  return null
}

/** The fields that differ from the stored client, trimmed. */
export function clientPatch(c: Client, f: ClientForm): Partial<ClientForm> {
  const was = clientFormFrom(c)
  const patch: Partial<ClientForm> = {}
  for (const k of ["company", "contact_name", "email", "phone", "notes"] as const) {
    const v = f[k].trim()
    if (v !== was[k]) patch[k] = v
  }
  if (f.tag !== was.tag) patch.tag = f.tag
  if (f.retainer_amount !== was.retainer_amount) patch.retainer_amount = f.retainer_amount
  return patch
}
