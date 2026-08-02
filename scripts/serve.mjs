#!/usr/bin/env node
/** Dependency-free static server. `node scripts/serve.mjs <dir> <port>` */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const dir = path.resolve(process.argv[2] ?? '.')
const port = Number(process.argv[3] ?? 4321)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
}

http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0])
    let file = path.join(dir, url)
    if (url.endsWith('/')) file = path.join(file, 'index.html')
    if (!file.startsWith(dir)) {
      res.writeHead(403).end('forbidden')
      return
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { 'content-type': 'text/plain' }).end('not found')
        return
      }
      res.writeHead(200, {
        'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      })
      res.end(data)
    })
  })
  .listen(port, () => console.log(`serving ${dir} on http://localhost:${port}/`))
