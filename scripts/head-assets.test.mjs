import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { pngToIco } from "./make-favicon-ico.mjs"

const root = join(import.meta.dirname, "..")
const read = (p) => readFileSync(join(root, p))

describe("favicon.ico", () => {
  const png = read("public/favicon-32.png")
  const ico = read("public/favicon.ico")

  it("has an ICONDIR and one entry describing the 32px PNG", () => {
    expect(ico.readUInt16LE(0)).toBe(0) // reserved
    expect(ico.readUInt16LE(2)).toBe(1) // icon
    expect(ico.readUInt16LE(4)).toBe(1) // one image
    expect(ico[6]).toBe(32)
    expect(ico[7]).toBe(32)
    expect(ico.readUInt32LE(14)).toBe(png.length)
    expect(ico.readUInt32LE(18)).toBe(22)
  })

  it("carries the PNG bytes unchanged and is what the script produces", () => {
    expect(ico.subarray(22).equals(png)).toBe(true)
    expect(ico.equals(pngToIco(png))).toBe(true)
  })

  it("refuses data that is not a PNG", () => {
    expect(() => pngToIco(Buffer.alloc(40))).toThrow(/PNG/)
  })
})

describe("web manifest and head links", () => {
  const manifest = JSON.parse(read("public/site.webmanifest").toString())
  const html = read("index.html").toString()

  it("names the site and uses the graphite tokens", () => {
    expect(manifest.name).toBe("GAkinz")
    expect(manifest.short_name).toBe("GAkinz")
    expect(manifest.start_url).toBe("/")
    expect(manifest.theme_color).toBe("#0F151D")
    expect(manifest.background_color).toBe("#0F151D")
  })

  it("points only at icon files that exist in public/", () => {
    expect(manifest.icons.length).toBeGreaterThan(0)
    for (const icon of manifest.icons) expect(() => read(`public${icon.src}`)).not.toThrow()
  })

  it("is linked from the template outside the seo markers, so the prerender keeps it", () => {
    const outside = html.replace(/<!--seo:start-->[\s\S]*<!--seo:end-->/, "")
    expect(outside).toContain('<link rel="manifest" href="/site.webmanifest" />')
    expect(outside).toContain('href="/favicon.ico"')
  })
})
