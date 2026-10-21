import { describe, expect, it } from "vitest"
import { BAD_REPLY_ERROR, statusError, type AssetStatus, type PortalAsset } from "@/lib/api"
import {
  portalAssetsUnavailable,
  assetCounts,
  assetSummary,
  assetsLoadState,
  groupByProject,
  labelProblem,
  noteProblem,
  noteValue,
  staffActions,
} from "./assetChecklistModel"

const asset = (id: number, projectId: number, status: AssetStatus, projectName = `Project ${projectId}`): PortalAsset => ({
  id,
  project_id: projectId,
  project_name: projectName,
  label: `Item ${id}`,
  note: null,
  status,
  client_note: null,
  supplied_at: null,
  accepted_at: null,
  created_at: "2026-10-18 10:00:00",
  updated_at: "2026-10-18 10:00:00",
})

describe("assetsLoadState", () => {
  it("is loading until the list arrives, then ready, even when it is empty", () => {
    expect(assetsLoadState(null, null, false)).toBe("loading")
    expect(assetsLoadState([], null, false)).toBe("ready")
  })

  it("shows a failed load as an error rather than loading for ever", () => {
    expect(assetsLoadState(null, "Could not reach the server.", false)).toBe("error")
    expect(assetsLoadState([asset(1, 1, "requested")], "Request failed", false)).toBe("error")
  })

  it("puts the missing database step ahead of everything else", () => {
    expect(assetsLoadState(null, "Request failed", true)).toBe("unavailable")
    expect(assetsLoadState([], null, true)).toBe("unavailable")
  })
})

describe("counts and summary", () => {
  it("counts each status", () => {
    const items = [asset(1, 1, "requested"), asset(2, 1, "supplied"), asset(3, 1, "accepted"), asset(4, 1, "accepted")]
    expect(assetCounts(items)).toEqual({ total: 4, requested: 1, supplied: 1, accepted: 2 })
  })

  it("says what is received and what waits for a check", () => {
    expect(assetSummary([])).toBe("Nothing requested yet")
    expect(assetSummary([asset(1, 1, "requested"), asset(2, 1, "accepted")])).toBe("1 of 2 received")
    expect(assetSummary([asset(1, 1, "supplied"), asset(2, 1, "supplied"), asset(3, 1, "requested")])).toBe(
      "0 of 3 received, 2 waiting for a check",
    )
  })
})

describe("groupByProject", () => {
  it("groups items by project and keeps the server's order inside and across groups", () => {
    const groups = groupByProject([asset(5, 9, "requested", "Shop"), asset(2, 3, "supplied", "Blog"), asset(7, 9, "accepted", "Shop")])
    expect(groups.map((g) => [g.projectId, g.projectName, g.items.map((i) => i.id)])).toEqual([
      [9, "Shop", [5, 7]],
      [3, "Blog", [2]],
    ])
  })

  it("returns no groups for no items", () => {
    expect(groupByProject([])).toEqual([])
  })
})

describe("form rules", () => {
  it("trims a note and turns a blank one into null", () => {
    expect(noteValue("  sent by email  ")).toBe("sent by email")
    expect(noteValue("   ")).toBeNull()
  })

  it("refuses a note over the server's limit", () => {
    expect(noteProblem("a".repeat(1000))).toBeNull()
    expect(noteProblem("a".repeat(1001))).toBe("Keep the note to 1000 characters or fewer.")
  })

  it("needs a label within the server's limit", () => {
    expect(labelProblem("  ")).not.toBeNull()
    expect(labelProblem("Logo")).toBeNull()
    expect(labelProblem("a".repeat(160))).toBeNull()
    expect(labelProblem("a".repeat(161))).toBe("Keep the label to 160 characters or fewer.")
  })
})

describe("staffActions", () => {
  it("offers accept until accepted, and reopen once the item has left requested", () => {
    expect(staffActions("requested")).toEqual({ accept: true, reopen: false })
    expect(staffActions("supplied")).toEqual({ accept: true, reopen: true })
    expect(staffActions("accepted")).toEqual({ accept: false, reopen: true })
  })
})

describe("portalAssetsUnavailable", () => {
  const refused = (status: number, error: string) => ({ ok: false as const, status, error, details: { error } })

  it("hides the card when assets.php was never uploaded and app-shell.html came back", () => {
    expect(portalAssetsUnavailable({ ok: false, status: 200, error: BAD_REPLY_ERROR })).toBe(true)
  })

  it("hides the card before SQL 15 runs", () => {
    expect(portalAssetsUnavailable(refused(503, "The asset checklist is not set up yet."))).toBe(true)
  })

  it("hides the card for a missing route: a bare 404, a 405 or the role gate", () => {
    expect(portalAssetsUnavailable({ ok: false, status: 404, error: statusError(404) })).toBe(true)
    expect(portalAssetsUnavailable(refused(405, "Method not allowed."))).toBe(true)
    expect(portalAssetsUnavailable(refused(403, "Not allowed."))).toBe(true)
  })

  it("shows a supply for an item that is not the client's, or is gone, as an error", () => {
    expect(portalAssetsUnavailable(refused(404, "Item not found."))).toBe(false)
  })

  it("shows an account with no client link as an error", () => {
    expect(portalAssetsUnavailable(refused(403, "Your account is not linked to a client."))).toBe(false)
  })

  it("shows a note that is too long as an error", () => {
    expect(portalAssetsUnavailable(refused(400, "Keep the note to 1000 characters or fewer."))).toBe(false)
  })
})
