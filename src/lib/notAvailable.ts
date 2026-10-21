/**
 * One rule for "this route is not on the server yet". dist/ can go live
 * before the PHP files are uploaded, so a screen that calls a NEW route must
 * tell "not uploaded or not set up yet" apart from a real failure, and hide
 * the feature or say "not available yet" quietly instead of showing an error.
 * Pure, so it is unit tested directly.
 *
 * Use it only for routes that are new in this release. An older server, or
 * the host, answers such a route in the ways below, each treated as "not
 * available yet":
 *
 * - 503: the file is new but its SQL has not run.
 * - 403 with exactly "Not allowed.": the role gate of an older file. Any other
 *   403, such as "Your account is not linked to a client." or "Account is not
 *   active.", is a real refusal and stays an error.
 * - 405, with or without a JSON body: an older file ends an action it does
 *   not know with "Method not allowed.", and the host may refuse a POST to a
 *   missing file the same way.
 * - 404 with no JSON body: the host's own page for a missing file (and, with
 *   the 2026-10-19 server/.htaccess, every request for a .php file that does
 *   not exist). A 404 WITH a JSON error ("Client not found.") is about a
 *   record and stays an error.
 * - A 200 that is not JSON at all (BAD_REPLY_ERROR), or, for a download, a
 *   200 of the wrong type (DOWNLOAD_NOT_READY): a file that was never
 *   uploaded, which the older .htaccess rewrites to app-shell.html.
 *
 * A network failure has no status and stays an error.
 */
import { BAD_REPLY_ERROR, DOWNLOAD_NOT_READY, type ApiResult } from "@/lib/api"

/** The words require_auth() in server/_bootstrap.php answers a wrong role with. */
export const ROLE_REFUSAL = "Not allowed."

export type ApiFailure = Extract<ApiResult<unknown>, { ok: false }>

export function notAvailableYet(res: ApiFailure): boolean {
  if (res.status === undefined) return false
  if (res.status === 503 || res.status === 405) return true
  if (res.status === 403) return res.details?.error === ROLE_REFUSAL
  if (res.status === 404) return res.details === undefined
  return res.error === BAD_REPLY_ERROR || res.error === DOWNLOAD_NOT_READY
}
