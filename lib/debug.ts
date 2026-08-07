/**
 * The verification harness. Loaded only when the page is opened with `?debug`.
 *
 * TRAP 18. A three-second opening cannot be sampled on a wall clock. Under a
 * software renderer — or in any browser tab that is not on screen — a single
 * screenshot costs longer than a beat, and you will silently photograph either
 * side of the explosion and conclude it never happened. So the film is scrubbed
 * to exact progress values, like a video, and the frame at that value is
 * captured deliberately rather than caught in passing.
 *
 * TRAP 19. `canvas.toBlob()` on a WebGL canvas returns a blank image without
 * `preserveDrawingBuffer`, and a pixel-measurement harness built on it will
 * report a confident screenful of zeros. Stage.tsx turns that flag on for
 * exactly this mode and leaves it off everywhere else, because it costs a full
 * buffer copy per frame.
 *
 *   __film.shot('agni-mid', 0.55)   capture one frame at 55% of the film
 *   __film.stats()                  triangles, draw calls, programs
 */
import * as THREE from 'three'

import { BHAIRAVI, PHRASE, renderShehnai } from './sound'

import { film } from './film'

/**
 * react-use-measure — and therefore R3F's <Canvas> — waits for a ResizeObserver
 * callback before it will create the renderer at all. A tab that is not being
 * composited never delivers one, because observer callbacks are part of the
 * rendering steps of the event loop, and the canvas then sits at its default
 * 300×150 forever with no context on it.
 *
 * Polling sidesteps that entirely. This is debug-only: in a visible tab the
 * real ResizeObserver is both correct and free.
 */
export class PollingResizeObserver {
  private callback: ResizeObserverCallback
  private targets = new Set<Element>()
  private sizes = new WeakMap<Element, { w: number; h: number }>()
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(target: Element) {
    this.targets.add(target)
    this.sizes.delete(target)
    if (!this.timer) this.timer = setInterval(() => this.poll(), 100)
    this.poll()
  }

  unobserve(target: Element) {
    this.targets.delete(target)
  }

  disconnect() {
    this.targets.clear()
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private poll() {
    const entries: ResizeObserverEntry[] = []
    for (const target of this.targets) {
      const rect = target.getBoundingClientRect()
      const prev = this.sizes.get(target)
      if (!prev || prev.w !== rect.width || prev.h !== rect.height) {
        this.sizes.set(target, { w: rect.width, h: rect.height })
        entries.push({ target, contentRect: rect } as unknown as ResizeObserverEntry)
      }
    }
    if (entries.length) this.callback(entries, this as unknown as ResizeObserver)
  }
}

export interface HarnessDeps {
  gl: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.Camera
  advance: (timestamp: number, runGlobalEffects?: boolean) => void
  seek: (t: number) => void
}

const SINK = 'http://localhost:4399/shot'

export function installHarness(deps: HarnessDeps) {
  const target = (window as unknown as Record<string, any>)
  const api = (target.__film ??= {})

  /** Render `frames` steps of ~16ms so damped values actually settle. */
  const settle = (frames = 30) => {
    const t0 = performance.now()
    for (let i = 1; i <= frames; i++) deps.advance(t0 + i * 16.6667)
  }

  api.settle = settle

  api.scene = deps.scene
  api.gl = deps.gl
  api.camera = deps.camera
  api.find = (name: string) => deps.scene.getObjectByName(name)

  api.stats = () => {
    // A single advance runs every pass in the post chain, and each one resets
    // the counters by default — leaving you reading the triangle count of the
    // final fullscreen quad and concluding the film is empty.
    const info = deps.gl.info
    info.autoReset = false
    info.reset()
    deps.advance(performance.now())
    const out = {
      triangles: info.render.triangles,
      drawCalls: info.render.calls,
      points: info.render.points,
      lines: info.render.lines,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
      size: deps.gl.getSize(new THREE.Vector2()).toArray(),
      pixelRatio: deps.gl.getPixelRatio(),
    }
    info.autoReset = true
    return out
  }

  /**
   * Scrub to `t`, let the frame settle, then post the real drawing buffer to
   * the frame sink (scripts/shots.mjs) so it can be looked at as a file.
   */
  api.shot = async (name: string, t?: number, frames = 30) => {
    if (typeof t === 'number') deps.seek(t)
    settle(frames)
    const canvas = deps.gl.domElement as HTMLCanvasElement
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'))
    if (!blob) return { ok: false, reason: 'toBlob returned null — preserveDrawingBuffer?' }
    const res = await fetch(`${SINK}?name=${encodeURIComponent(name)}`, {
      method: 'POST',
      body: blob,
    })
    return { ok: res.ok, bytes: blob.size, file: await res.text(), stats: api.stats() }
  }

  /** Sample the rendered frame without leaving the browser: mean colour, etc. */
  api.sample = (t?: number, frames = 30) => {
    if (typeof t === 'number') deps.seek(t)
    settle(frames)
    const canvas = deps.gl.domElement as HTMLCanvasElement
    const w = 160
    const h = Math.max(1, Math.round((canvas.height / canvas.width) * w))
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')!
    ctx.drawImage(canvas, 0, 0, w, h)
    const d = ctx.getImageData(0, 0, w, h).data
    let r = 0,
      g = 0,
      b = 0,
      maxL = 0,
      lit = 0
    const n = w * h
    for (let i = 0; i < d.length; i += 4) {
      r += d[i]
      g += d[i + 1]
      b += d[i + 2]
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
      if (l > maxL) maxL = l
      if (l > 24) lit++
    }
    return {
      // reported from inside, because a caller spreading this into an object
      // literal reads film state *before* the seek happens and silently gets
      // the previous sample's act
      t: +film.t.toFixed(4),
      act: film.active,
      p: +film.p[film.active].toFixed(3),
      mean: [+(r / n).toFixed(1), +(g / n).toFixed(1), +(b / n).toFixed(1)],
      maxLuma: +maxL.toFixed(1),
      /** fraction of the frame that is not essentially black */
      litFraction: +(lit / n).toFixed(4),
      /** > 0 means warm (gold); < 0 would mean the palette has drifted blue */
      warmth: +((r - b) / n).toFixed(1),
    }
  }

  api.shehnai = verifyShehnai

  return api
}

/**
 * Normalised autocorrelation. Returns the strongest periodicity in `data`
 * between `minF` and `maxF`, which for a pitched tone is its fundamental.
 *
 * The search is bounded to the phrase's own range rather than to the audible
 * one, because a sawtooth's second partial correlates nearly as well as its
 * first and an unbounded search cheerfully reports every note an octave high.
 */
function estimateF0(data: Float32Array, sampleRate: number, minF = 300, maxF = 760) {
  const minLag = Math.floor(sampleRate / maxF)
  const maxLag = Math.ceil(sampleRate / minF)
  let best = -Infinity
  let bestLag = minLag
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0
    let a = 0
    let b = 0
    for (let i = 0; i + lag < data.length; i++) {
      s += data[i] * data[i + lag]
      a += data[i] * data[i]
      b += data[i + lag] * data[i + lag]
    }
    const r = s / Math.sqrt(a * b + 1e-12)
    if (r > best) {
      best = r
      bestLag = lag
    }
  }
  return sampleRate / bestLag
}

/**
 * Render the shehnai phrase offline and *measure* it — the audio equivalent of
 * capturing a frame and actually looking at it.
 *
 * Checks the thing that is worth checking: that every swara lands on its just
 * ratio against the tonic. A phrase can be inaudibly wrong — a note a comma
 * sharp, an octave error in a ratio, a typo in the scale table — and no amount
 * of listening on laptop speakers will localise it. This will.
 *
 *   await __film.shehnai()
 */
export async function verifyShehnai(tonic = 392) {
  const Ctor =
    window.OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
      .webkitOfflineAudioContext
  if (!Ctor) return { ok: false, reason: 'no OfflineAudioContext' }

  const rate = 44100
  const total = PHRASE.reduce((s, n) => s + n[1], 0) + 2
  const ctx = new Ctor(1, Math.ceil(total * rate), rate)

  // the same noise the live class builds, so breath is in the measurement too
  const noise = ctx.createBuffer(1, Math.floor(rate * 0.4), rate)
  const nd = noise.getChannelData(0)
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1

  const at = 0.05
  renderShehnai(ctx, ctx.destination, at, 1, tonic, noise)
  const buf = await ctx.startRendering()
  const pcm = buf.getChannelData(0)

  let peak = 0
  for (let i = 0; i < pcm.length; i++) peak = Math.max(peak, Math.abs(pcm[i]))

  const notes: Array<Record<string, unknown>> = []
  let t = at
  let worst = 0
  for (const [deg, dur] of PHRASE) {
    // skip the meend at the head of the note and stop before the next one
    const from = Math.floor((t + 0.22) * rate)
    const to = Math.min(Math.floor((t + Math.min(dur, 0.42)) * rate), pcm.length)
    if (to - from > 1024) {
      const f0 = estimateF0(pcm.slice(from, to), rate)
      const want = tonic * BHAIRAVI[deg]
      const cents = 1200 * Math.log2(f0 / want)
      worst = Math.max(worst, Math.abs(cents))
      notes.push({
        swara: ['S', 'r', 'g', 'm', 'P', 'd', 'n', "S'"][deg],
        want: +want.toFixed(1),
        got: +f0.toFixed(1),
        cents: +cents.toFixed(1),
      })
    }
    t += dur
  }

  return {
    // 25 cents is an eighth of a tone. The vibrato alone is ±17 cents by the
    // end of a long note, so anything tighter would be measuring the andolan.
    ok: peak > 0.01 && peak < 1 && worst < 25,
    peak: +peak.toFixed(4),
    worstCents: +worst.toFixed(1),
    seconds: +total.toFixed(2),
    notes,
  }
}
