'use client'

import { useFrame } from '@react-three/fiber'

import { film, tickFilm } from '@/lib/film'
import { domRefs } from '@/lib/domRefs'

/**
 * Runs first, every frame, before anything reads the damped look values.
 *
 * Priority is negative so this stays ahead of every other subscriber while
 * leaving R3F's automatic render in place — a positive renderPriority would
 * hand the render loop to us and silently stop the scene from drawing.
 */
/**
 * Adaptive quality, measured rather than guessed.
 *
 * The mount-time DPR cap in Stage.tsx guesses from `hardwareConcurrency`, which
 * is a poor proxy: plenty of cheap phones report eight cores and a GPU that
 * cannot fill them. This watches the frames that are actually being delivered
 * and lowers the render scale when they are late.
 *
 * It does it by calling gl.setPixelRatio directly. That is the whole point —
 * drei's PerformanceMonitor does the same job through React state, which
 * re-renders the <Canvas> subtree mid-flight, races the Environment portal and
 * the loader Suspense boundaries, and crashes the scene intermittently
 * (TRAP 14). Mutating the renderer sidesteps every part of that.
 *
 * Resolution is the right lever here: Agni's raymarch and Jal's reflection pass
 * are both fragment-bound, so cost falls almost linearly with pixel count.
 */
const STEPS = [0.6, 0.75, 0.9, 1]

const perf = {
  acc: 0,
  frames: 0,
  step: STEPS.length - 1,
  /** frames to ignore after a change, so a resize is not read as a stutter */
  settle: 90,
  base: 1,
}

export default function FrameDriver() {
  useFrame((state, delta) => {
    tickFilm(Math.min(delta, 1 / 20))

    /* ── adaptive quality ─────────────────────────────────────────────── */
    if (perf.base === 1) perf.base = state.gl.getPixelRatio()
    perf.acc += delta
    perf.frames++

    if (perf.frames >= 45) {
      const avg = perf.acc / perf.frames
      perf.acc = 0
      perf.frames = 0

      if (perf.settle > 0) {
        perf.settle -= 45
      } else {
        const was = perf.step
        // 22ms — comfortably past a dropped frame at 60Hz, and forgiving
        // enough that a single hitch does not trigger a downgrade
        if (avg > 0.022 && perf.step > 0) perf.step--
        else if (avg < 0.0145 && perf.step < STEPS.length - 1) perf.step++

        if (perf.step !== was) {
          state.gl.setPixelRatio(perf.base * STEPS[perf.step])
          perf.settle = 90
        }
      }
      film.quality = STEPS[perf.step]
      film.fps = Math.round(1 / Math.max(avg, 1e-4))
    }

    // The curtain is DOM, but it is part of the film, so it is written here in
    // the render loop rather than through React — one clock, one frame.
    const el = domRefs.curtain
    if (el) {
      const v = film.curtain
      el.style.opacity = v > 0.001 ? String(v) : '0'
      if (v > 0.001) el.style.backgroundColor = film.curtainColor
    }
  }, -1000)

  return null
}
