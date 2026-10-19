import { afterEach, describe, expect, it, vi } from "vitest"
import { api, DOWNLOAD_NOT_READY, downloadName, isFileReply } from "./api"

// A shared portal file can be any allowed type, so its download takes a check
// on the reply's type instead of one exact type. The check must still refuse
// the replies that are not a file: JSON (an error or an older server) and HTML
// (the app shell a missing PHP file is rewritten to). Exact-type callers, such
// as the calendar file, must behave as before.
function reply(body: string, type: string, extra: Record<string, string> = {}) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status: 200, headers: { "Content-Type": type, ...extra } })))
}

describe("download reply types", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("accepts a stored file's type and refuses JSON, HTML and no type", () => {
    for (const t of ["application/pdf", "image/png", "text/plain", "text/csv", "application/octet-stream", "application/zip"]) {
      expect(isFileReply(t), t).toBe(true)
    }
    for (const t of ["", "application/json", "application/problem+json", "text/html", "application/xhtml+xml"]) {
      expect(isFileReply(t), t).toBe(false)
    }
  })

  it("hands back a portal file of any allowed type with the server's name", async () => {
    reply("%PDF-1.4", "application/pdf", { "Content-Disposition": 'attachment; filename="Recommendation.pdf"' })
    const pdf = await api.download("/files.php?action=mine_download&id=3", isFileReply)
    expect(pdf.ok).toBe(true)
    expect(pdf.ok && downloadName(pdf.data, "fallback")).toBe("Recommendation.pdf")
    expect(pdf.ok && (await pdf.data.text())).toBe("%PDF-1.4")

    // A name with a space is not taken from the header, so the page's own fallback is used.
    reply("a,b", "text/csv", { "Content-Disposition": 'attachment; filename="Q3 figures.csv"' })
    const csv = await api.download("/files.php?action=mine_download&id=4", isFileReply)
    expect(csv.ok && downloadName(csv.data, "Q3 figures.csv")).toBe("Q3 figures.csv")
  })

  it("refuses the app shell and a JSON 200 for a portal file, so neither is saved as the file", async () => {
    reply("<!doctype html><title>GAkinz</title>", "text/html; charset=utf-8")
    const shell = await api.download("/files.php?action=mine_download&id=3", isFileReply)
    expect(shell).toEqual({ ok: false, error: DOWNLOAD_NOT_READY, status: 200 })

    reply("[]", "application/json; charset=utf-8")
    const json = await api.download("/files.php?action=mine_download&id=3", isFileReply)
    expect(json).toEqual({ ok: false, error: DOWNLOAD_NOT_READY, status: 200 })
  })

  it("passes the check the type in lower case without parameters", async () => {
    const seen: string[] = []
    reply("x", "Application/PDF; charset=binary")
    await api.download("/x", (t) => (seen.push(t), true))
    expect(seen).toEqual(["application/pdf"])
  })

  it("keeps an exact expected type exact for existing callers", async () => {
    reply("BEGIN:VCALENDAR", "text/calendar; charset=utf-8")
    expect((await api.download("/bookings.php?action=mine_ics&id=1", "text/calendar")).ok).toBe(true)

    reply("%PDF-1.4", "application/pdf")
    const wrong = await api.download("/bookings.php?action=mine_ics&id=1", "text/calendar")
    expect(wrong).toEqual({ ok: false, error: DOWNLOAD_NOT_READY, status: 200 })
  })
})
