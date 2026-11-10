/**
 * A one-origin stack for browser tests: the built site (dist/, with the prerendered pages and the SPA fallback)
 * and the PHP under test behind one address, so the site's own relative `/contact.php` calls work exactly as
 * on gakinz.com. Every `.php` request is forwarded to the throwaway PHP server that tests/server/global-setup.ts
 * started. Nothing here can reach the live site.
 */
import { chromium, type Browser } from "playwright-core"
import fs from "node:fs"
import http from "node:http"
import path from "node:path"
import { BASE, PHP_PORT } from "../server/env"

const DIST = path.resolve(__dirname, "../../dist")
const TYPES: Record<string, string> = {
  ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml", ".webp": "image/webp",
  ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json", ".ico": "image/x-icon", ".xml": "application/xml", ".txt": "text/plain",
}

export type Stack = { origin: string; close: () => Promise<void> }

export function assertBuilt(): void {
  if (!fs.existsSync(path.join(DIST, "index.html"))) throw new Error("dist/ is missing. Run `npm run build` before `npm run test:browser`.")
}

export function startStack(): Promise<Stack> {
  assertBuilt()
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x")
    if (url.pathname.endsWith(".php")) {
      // The PHP under test allows exactly one origin (its own address), so present that one.
      const headers = { ...req.headers, host: `127.0.0.1:${PHP_PORT}`, origin: BASE }
      const up = http.request({ host: "127.0.0.1", port: PHP_PORT, path: req.url, method: req.method, headers }, (r) => {
        res.writeHead(r.statusCode ?? 502, r.headers)
        r.pipe(res)
      })
      up.on("error", () => { res.writeHead(502); res.end() })
      req.pipe(up)
      return
    }
    let f = path.join(DIST, decodeURIComponent(url.pathname))
    if (!f.startsWith(DIST)) f = path.join(DIST, "index.html")
    if (fs.existsSync(f) && fs.statSync(f).isDirectory() && fs.existsSync(path.join(f, "index.html"))) f = path.join(f, "index.html")
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, "index.html")
    res.writeHead(200, { "content-type": TYPES[path.extname(f)] ?? "application/octet-stream" })
    fs.createReadStream(f).pipe(res)
  })
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => {
      const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
      resolve({ origin, close: () => new Promise((r) => server.close(() => r())) })
    }),
  )
}

export function launch(): Promise<Browser> {
  return chromium.launch({ headless: true })
}
