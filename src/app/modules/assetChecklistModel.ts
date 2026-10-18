/**
 * Pure logic for the project asset checklist (assets.php, SQL 15): the panel
 * on a project board and the card in the client portal. No React and no
 * fetches, so it is unit tested directly. The server is the authority on every
 * rule; these only stop an obviously bad form being sent and decide what the
 * panel shows.
 */
import { ASSET_LABEL_MAX, ASSET_NOTE_MAX, type AssetStatus, type PortalAsset } from "@/lib/api"

export type AssetsView = "unavailable" | "error" | "loading" | "ready"

/**
 * What a checklist panel shows. `unavailable` (SQL 15 has not run, a 503)
 * wins, then a load failure with a retry, so the panel never spins for ever.
 */
export function assetsLoadState(items: unknown[] | null, loadError: string | null, unavailable: boolean): AssetsView {
  if (unavailable) return "unavailable"
  if (loadError) return "error"
  if (items === null) return "loading"
  return "ready"
}

export type AssetCounts = { total: number; requested: number; supplied: number; accepted: number }

export function assetCounts(items: { status: AssetStatus }[]): AssetCounts {
  const c: AssetCounts = { total: items.length, requested: 0, supplied: 0, accepted: 0 }
  for (const i of items) c[i.status] += 1
  return c
}

/** One line for the panel header, e.g. "2 of 5 received, 1 waiting for a check". */
export function assetSummary(items: { status: AssetStatus }[]): string {
  const c = assetCounts(items)
  if (c.total === 0) return "Nothing requested yet"
  const parts = [`${c.accepted} of ${c.total} received`]
  if (c.supplied > 0) parts.push(`${c.supplied} waiting for a check`)
  return parts.join(", ")
}

/** The portal's items grouped by project, keeping the server's order. */
export function groupByProject(items: PortalAsset[]): { projectId: number; projectName: string; items: PortalAsset[] }[] {
  const groups = new Map<number, { projectId: number; projectName: string; items: PortalAsset[] }>()
  for (const i of items) {
    let g = groups.get(i.project_id)
    if (!g) {
      g = { projectId: i.project_id, projectName: i.project_name, items: [] }
      groups.set(i.project_id, g)
    }
    g.items.push(i)
  }
  return [...groups.values()]
}

/** A trimmed note, or null when blank, which is what the server stores. */
export const noteValue = (text: string): string | null => (text.trim() === "" ? null : text.trim())

export function noteProblem(text: string): string | null {
  return text.trim().length > ASSET_NOTE_MAX ? `Keep the note to ${ASSET_NOTE_MAX} characters or fewer.` : null
}

export function labelProblem(text: string): string | null {
  const v = text.trim()
  if (v === "") return "Say what the client should send."
  if (v.length > ASSET_LABEL_MAX) return `Keep the label to ${ASSET_LABEL_MAX} characters or fewer.`
  return null
}

/** Which staff actions an item allows, matching assets.php. */
export function staffActions(status: AssetStatus): { accept: boolean; reopen: boolean } {
  return { accept: status !== "accepted", reopen: status !== "requested" }
}

/** Badge tone key (page-kit StatusBadge) and words, for each audience. */
export const ASSET_BADGE: Record<AssetStatus, { tone: string; client: string; staff: string }> = {
  requested: { tone: "new", client: "Needed", staff: "Requested" },
  supplied: { tone: "pending", client: "Sent", staff: "Supplied, check it" },
  accepted: { tone: "accepted", client: "Received", staff: "Accepted" },
}
