// Serve one built app for browser tests.
// Usage: node scripts/serve.mjs apps/<slug>/dist <port>
// Unknown paths fall back to index.html so routes like /app/<slug>/:recordId load.
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const root = path.resolve(process.argv[2] ?? 'dist')
const port = Number(process.argv[3] ?? 4173)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
}

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error(`no index.html in ${root}; build the app first`)
  process.exit(1)
}

http
  .createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    let file = path.join(root, url)
    if (!file.startsWith(root)) {
      res.writeHead(403).end()
      return
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      const asset = path.join(root, 'assets', path.basename(url))
      file = /\.\w+$/.test(url) && fs.existsSync(asset) ? asset : path.join(root, 'index.html')
    }
    res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  .listen(port, '127.0.0.1', () => console.log(`serving ${root} on http://127.0.0.1:${port}`))
