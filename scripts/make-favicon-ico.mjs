/**
 * Wraps public/favicon-32.png in an ICO container and writes public/favicon.ico.
 *
 * ICO allows a PNG image as the entry's data, so no pixel work or image library
 * is needed: a 6-byte ICONDIR, one 16-byte ICONDIRENTRY, then the PNG bytes.
 * Run `node scripts/make-favicon-ico.mjs` after redrawing favicon-32.png.
 */
import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { join, dirname } from "node:path"

export function pngToIco(png) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (png.length < 24 || sig.some((b, i) => png[i] !== b)) throw new Error("Not a PNG file")
  const width = png.readUInt32BE(16)
  const height = png.readUInt32BE(20)
  if (width > 256 || height > 256) throw new Error("ICO entries are at most 256 pixels")
  const head = Buffer.alloc(22)
  head.writeUInt16LE(0, 0) // reserved
  head.writeUInt16LE(1, 2) // type: icon
  head.writeUInt16LE(1, 4) // image count
  head.writeUInt8(width === 256 ? 0 : width, 6) // 0 means 256
  head.writeUInt8(height === 256 ? 0 : height, 7)
  head.writeUInt8(0, 8) // palette colours: none
  head.writeUInt8(0, 9) // reserved
  head.writeUInt16LE(1, 10) // colour planes
  head.writeUInt16LE(32, 12) // bits per pixel
  head.writeUInt32LE(png.length, 14) // image data size
  head.writeUInt32LE(22, 18) // image data offset
  return Buffer.concat([head, png])
}

const here = dirname(fileURLToPath(import.meta.url))
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const png = await readFile(join(here, "..", "public", "favicon-32.png"))
  await writeFile(join(here, "..", "public", "favicon.ico"), pngToIco(png))
  console.log("wrote public/favicon.ico")
}
