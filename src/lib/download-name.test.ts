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

  it("prefers the UTF-8 filename* and still refuses paths and odd names in it", () => {
    const both = (star: string) => `attachment; filename="Plan_.pdf"; filename*=UTF-8''${star}`
    expect(filenameFromDisposition(both("Pl%C3%A4n%20v2.pdf"))).toBe("Plän v2.pdf")
    expect(filenameFromDisposition(both("..%2F..%2Fetc%2Fpasswd"))).toBe("passwd")
    // Unsafe or malformed filename*: the ASCII fallback is used instead.
    expect(filenameFromDisposition(both("a%3Cb%3E.pdf"))).toBe("Plan_.pdf")
    expect(filenameFromDisposition(both("%E0%A4%A.pdf"))).toBe("Plan_.pdf")
    expect(filenameFromDisposition(both("%2E%2E"))).toBe("Plan_.pdf")
    expect(filenameFromDisposition("attachment; filename*=UTF-8''ev%0Ail.pdf")).toBeNull()
    expect(filenameFromDisposition("attachment; filename*=UTF-8''Report.pdf")).toBe("Report.pdf")
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
