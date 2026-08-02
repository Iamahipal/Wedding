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

  return api
}
