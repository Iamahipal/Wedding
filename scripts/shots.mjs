#!/usr/bin/env node
/**
 * Frame sink for the scrub harness. `node scripts/shots.mjs`
 *
 * The page POSTs a captured WebGL frame here and it lands on disk as a PNG, so
 * frames can be inspected as files instead of as megabytes of base64 passed
 * around. Pair it with __film.shot() in the browser — see lib/debug.ts.
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dir = path.join(root, 'scripts/.shots')
fs.mkdirSync(dir, { recursive: true })

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
}

http
  .createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS).end()
      return
    }
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (req.method !== 'POST' || url.pathname !== '/shot') {
      res.writeHead(404, CORS).end('not found')
      return
    }
    const name = (url.searchParams.get('name') ?? 'frame').replace(/[^a-z0-9._-]/gi, '_')
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const buf = Buffer.concat(chunks)
      const file = path.join(dir, `${name}.png`)
      fs.writeFileSync(file, buf)
      console.log(`${new Date().toISOString().slice(11, 19)}  ${name}.png  ${buf.length} bytes`)
      res.writeHead(200, { ...CORS, 'content-type': 'text/plain' }).end(file)
    })
  })
  .listen(4399, () => console.log(`frame sink → ${dir} (http://localhost:4399/shot?name=…)`))
