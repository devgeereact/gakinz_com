// serve.mjs <dir> [port]: static server for a built dist/ with SPA fallback. Every .php answers 404 locally,
// so nothing reaches the live API (vite preview would proxy .php to gakinz.com).
import http from "node:http"; import fs from "node:fs"; import path from "node:path"
const root = process.argv[2]
const types = { ".js":"text/javascript", ".css":"text/css", ".html":"text/html", ".svg":"image/svg+xml", ".webp":"image/webp", ".png":"image/png", ".woff2":"font/woff2", ".json":"application/json", ".ico":"image/x-icon" }
http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0])
  if (p.endsWith(".php")) { res.writeHead(404, {"content-type":"application/json"}); return res.end('{"error":"local stub server: no API"}') }
  let f = path.join(root, p)
  if (f.startsWith(root) && fs.existsSync(f) && fs.statSync(f).isDirectory() && fs.existsSync(path.join(f, "index.html"))) f = path.join(f, "index.html") // prerendered page
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, "index.html")
  res.writeHead(200, {"content-type": types[path.extname(f)] || "application/octet-stream"}); fs.createReadStream(f).pipe(res)
}).listen(Number(process.argv[3] || 5197), "127.0.0.1", () => console.log("ready " + (process.argv[3] || 5197)))
