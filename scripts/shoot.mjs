#!/usr/bin/env node
/**
 * Page screenshots, for the half of this site that is not WebGL.
 *
 *     npm run build && node scripts/serve.mjs out 4322
 *     node scripts/shoot.mjs                       # the whole celebration
 *     node scripts/shoot.mjs haldi="[data-fn='haldi']"
 *     node scripts/shoot.mjs --reduced open=.u-open
 *
 * `__film.shot()` and scripts/shots.mjs capture the *drawing buffer* — the film.
 * उत्सव is ordinary DOM, so it needs an ordinary screenshot, and it needs one at
 * 390px portrait because that is the only viewport this is really designed for.
 *
 * ── why this drives Chrome rather than asking it nicely ────────────────────
 * `chrome --screenshot` fires on the load event, which on this page is the
 * film's first frame — and the film opens on *held black*. Every shot comes
 * back black, and a black shot of a page that is supposed to be black looks
 * exactly like a pass. It is the same failure TRAP 18 describes for the film:
 * sample on somebody else's clock and you will confidently photograph the wrong
 * moment. So the page is driven instead: wait until it says it is ready, aim it
 * with the harness, wait for the reveals, then capture.
 *
 * It also collects console errors while it is in there, because "the production
 * console is clean" is a claim worth measuring rather than remembering.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'scripts/.shots')

const CANDIDATES = [
  process.env.CHROME,
  `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env.ProgramFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
]

function findChrome() {
  for (const p of CANDIDATES) if (p && fs.existsSync(p)) return p
  throw new Error('No Chrome or Edge found. Set CHROME to the executable path.')
}

/* ── arguments ───────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2)
const flag = (k, d) => {
  const hit = argv.find((a) => a.startsWith(`--${k}=`))
  if (hit) return hit.slice(k.length + 3)
  return argv.includes(`--${k}`) ? true : d
}

const width = Number(flag('width', 390))
const height = Number(flag('height', 844))
const reduced = flag('reduced', false) === true
const origin = flag('origin', process.env.SHOOT_ORIGIN || 'http://localhost:4322')
const suffix = reduced ? '-reduced' : ''

/**
 * `name=selector` or `name=selector@offset`.
 *
 * Split on the *first* `=`, because selectors contain them, and on the last `@`
 * for the offset — which exists because the film's acts are one enormous empty
 * section each, and "the top of [data-act=agni]" is the start of a two-screen
 * scroll rather than the shot anybody wants to see.
 */
const pairs = argv
  .filter((a) => !a.startsWith('--'))
  .map((a) => {
    const i = a.indexOf('=')
    const name = i < 0 ? a : a.slice(0, i)
    let selector = i < 0 ? '' : a.slice(i + 1)
    let offset = 0
    const at = selector.lastIndexOf('@')
    if (at > 0) {
      offset = Number(selector.slice(at + 1)) || 0
      selector = selector.slice(0, at)
    }
    return [name, selector, offset]
  })

const DEFAULT_SHOTS = [
  ['u-folio', '[data-folio-stage]'],
  ['u-open', '.u-open'],
  ['u-blessings', '[data-utsav] section:nth-of-type(2)'],
  ['u-tilak', "[data-fn='tilak']"],
  ['u-mehndi', "[data-fn='mehndi']"],
  ['u-haldi', "[data-fn='haldi']"],
  ['u-sangeet', "[data-fn='sangeet']"],
  ['u-baraat', "[data-fn='baraat']"],
  ['u-vivah', "[data-fn='vivah']"],
  ['u-vidaai', "[data-fn='vidaai']"],
  ['u-rsvp', '.u-rsvp'],
  ['u-countdown', '.u-countdown'],
  ['u-close', '.u-close'],
]

const shots = pairs.length ? pairs : DEFAULT_SHOTS

/* ── a very small CDP client ─────────────────────────────────────────────── */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function connect(port) {
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`)
      const { webSocketDebuggerUrl } = await res.json()
      return webSocketDebuggerUrl
    } catch {
      await sleep(100)
    }
  }
  throw new Error('Chrome never opened its debugging port.')
}

function client(ws) {
  let id = 0
  const pending = new Map()
  const listeners = []
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
    } else if (msg.method) {
      for (const fn of listeners) fn(msg)
    }
  })
  return {
    on: (fn) => listeners.push(fn),
    send(method, params = {}, sessionId) {
      return new Promise((resolve, reject) => {
        const i = ++id
        pending.set(i, { resolve, reject })
        ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) }))
      })
    },
  }
}

/* ── the run ─────────────────────────────────────────────────────────────── */

const port = 9400 + Math.floor(Math.random() * 400)
const chrome = spawn(
  findChrome(),
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-color-profile=srgb',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(os.tmpdir(), `panch-shoot-${port}`)}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const problems = []

try {
  fs.mkdirSync(outDir, { recursive: true })

  const wsUrl = await connect(port)
  const ws = new WebSocket(wsUrl)
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  const cdp = client(ws)

  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
  const send = (m, p) => cdp.send(m, p, sessionId)

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Log.enable')
  // Console errors alone report "Failed to load resource: 404" with no URL in
  // it, which is a fault report you cannot act on. This says which one.
  await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: true,
  })
  if (reduced) {
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    })
  }

  cdp.on((msg) => {
    if (msg.sessionId !== sessionId) return
    if (msg.method === 'Runtime.exceptionThrown') {
      problems.push(msg.params.exceptionDetails.text || 'uncaught exception')
    } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      problems.push(msg.params.entry.text)
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      problems.push(msg.params.args.map((a) => a.value ?? a.description ?? '?').join(' '))
    } else if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400) {
      problems.push(`${msg.params.response.status} ${msg.params.response.url}`)
    }
  })

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text)
    return r.result.value
  }

  console.log(`  ${origin}  ${width}×${height}${reduced ? '  reduced motion' : ''}\n`)

  for (const [name, selector, offset = 0] of shots) {
    await send('Page.navigate', { url: origin })

    // Wait for the choreography to have finished building. `__filmReady` is set
    // at the very end of the effect in Film.tsx, so it proves the whole thing
    // reached the end rather than throwing somewhere in the middle.
    let ready = false
    for (let i = 0; i < 120 && !ready; i++) {
      ready = await evaluate('!!window.__filmReady').catch(() => false)
      if (!ready) await sleep(100)
    }
    if (!ready) throw new Error(`${name}: the film never reported ready`)

    const y = selector
      ? await evaluate(
          `(() => { const t = window.__film.top(${JSON.stringify(selector)});
             return t === null ? null : window.__film.to(t + ${offset}); })()`,
        )
      : 0
    if (selector && y === null) {
      console.log(`  ${name.padEnd(14)} — no element matches ${selector}, skipped`)
      continue
    }

    // The reveals are 0.9s tweens fired by ScrollTrigger, and the celebration
    // is nothing but reveals. Capturing before they land photographs an empty
    // page and calls it a layout.
    await sleep(1400)

    // Anything worth asserting about the page at this scroll position. The
    // interesting facts down here — has the canvas actually stopped drawing,
    // is the stage hidden — are only true *after* a frame has run, so they
    // cannot be checked anywhere except from inside a browser that is
    // compositing.
    const probe = flag('probe', '')
    if (typeof probe === 'string' && probe) {
      const value = await evaluate(`JSON.stringify((() => (${probe}))())`)
      console.log(`    probe ${value}`)
    }

    const { data } = await send('Page.captureScreenshot', { format: 'png' })
    const file = path.join(outDir, `${name}${suffix}.png`)
    fs.writeFileSync(file, Buffer.from(data, 'base64'))
    console.log(
      `  ${name.padEnd(14)} y=${String(y).padStart(6)}  ${(fs.statSync(file).size / 1024).toFixed(0)}KB`,
    )
  }

  await cdp.send('Browser.close').catch(() => {})
  ws.close()
} finally {
  chrome.kill()
}

console.log('')
if (problems.length) {
  console.log(`  ${problems.length} console error(s):`)
  for (const p of [...new Set(problems)]) console.log(`    ${p}`)
  process.exitCode = 1
} else {
  console.log('  Console clean.')
}
