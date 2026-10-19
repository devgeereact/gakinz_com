import { afterEach, describe, expect, it, vi } from "vitest"
import { api, downloadName, filenameFromDisposition } from "./api"

// A download is saved under the name the server gives it, but a reply can
// never choose a path or an odd name; without a usable name the page's own
// fallback is used.
describe("download file names", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("reads a plain attachment name and refuses paths and odd names", () => {
    expect(filenameFromDisposition('attachment; filename="gakinz-data-export-client-4-2026-10-19.json"')).toBe(
      "gakinz-data-export-client-4-2026-10-19.json",
    )
    expect(filenameFromDisposition("attachment; filename=call.ics")).toBe("call.ics")
    expect(filenameFromDisposition('attachment; filename="../../etc/passwd"')).toBe("passwd")
    expect(filenameFromDisposition('attachment; filename="a b<c>.json"')).toBeNull()
    expect(filenameFromDisposition('attachment; filename=".."')).toBeNull()
    expect(filenameFromDisposition("attachment")).toBeNull()
    expect(filenameFromDisposition(null)).toBeNull()
  })

  it("hands back the server's name with the file, or the fallback without one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="export-7.json"' },
        }),
      ),
    )
    const named = await api.download("/privacy.php?action=export&client_id=7", "application/json")
    expect(named.ok && downloadName(named.data, "fallback.json")).toBe("export-7.json")

    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } })))
    const plain = await api.download("/privacy.php?action=export&client_id=7", "application/json")
    expect(plain.ok && downloadName(plain.data, "fallback.json")).toBe("fallback.json")
  })
})
