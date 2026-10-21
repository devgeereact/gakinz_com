/**
 * State decisions for the privacy tools (privacy.php) on Platform and the
 * client record. No React and no fetches, so it is unit tested directly.
 * privacy.php is new and uploaded by hand, so until it is on the server the
 * tools say "not available yet" quietly, by the shared rule in
 * src/lib/notAvailable.ts, instead of showing an error.
 */
import type { ApiResult, RetentionReport } from "@/lib/api"
import { notAvailableYet } from "@/lib/notAvailable"

export const PRIVACY_NOT_AVAILABLE = "Data exports are not available on the server yet."
export const RETENTION_NOT_AVAILABLE = "The retention report is not available on the server yet."

export type RetentionState =
  | { kind: "ready"; report: RetentionReport }
  | { kind: "not_on_server" }
  | { kind: "error"; error: string }

export function retentionState(res: ApiResult<RetentionReport>): RetentionState {
  if (res.ok) return { kind: "ready", report: res.data }
  return notAvailableYet(res) ? { kind: "not_on_server" } : { kind: "error", error: res.error }
}

export type ExportOutcome = { kind: "saved"; file: Blob } | { kind: "not_on_server" } | { kind: "error"; error: string }

export function exportOutcome(res: ApiResult<Blob>): ExportOutcome {
  if (res.ok) return { kind: "saved", file: res.data }
  return notAvailableYet(res) ? { kind: "not_on_server" } : { kind: "error", error: res.error }
}
