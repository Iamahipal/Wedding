'use client'

import { useFrame } from '@react-three/fiber'

import { film, STAGE_OFF, tickFilm } from '@/lib/film'
import { domRefs } from '@/lib/domRefs'
import { smoothstep } from '@/lib/math'

/**
 * Runs first, every frame, before anything reads the damped look values.
 *
 * Priority is negative so this stays ahead of every other subscriber while
 * leaving R3F's automatic render in place — a positive renderPriority would
 * hand the render loop to us and silently stop the scene from drawing.
 */
/**
 * Frame timing, measured and *reported* — but no longer acted on.
 *
 * This used to step gl.setPixelRatio down when frames ran late, which sounded
 * like free insurance and was not. Changing the pixel ratio reallocates the
 * drawing buffer, and the EffectComposer's render targets are sized from the
 * drawing buffer at the moment it was built — so every adjustment left the post
 * chain rendering at one resolution into a canvas of another until it caught
 * up. On a phone that surfaced exactly where it hurts most: scrolling is when
 * frames run late, so the mantra *blinked* while being scrolled, which is the
 * one moment in this film that has to be still and golden and unbroken.
 *
 * The deeper lesson is the one TRAP 14 was already making. It warns against
 * drei's PerformanceMonitor because it churns the renderer through React state;
 * I avoided React and kept the churn, which was the part that mattered. A
 * renderer reconfigured mid-flight is the hazard, by whatever route.
 *
 * So DPR is decided once at mount in Stage.tsx and never touched again. This
 * still measures, because ?diag reporting real numbers from a real device is
 * worth having — it just no longer changes anything underneath the film.
 */
const perf = {
  acc: 0,
  frames: 0,
}

export default function FrameDriver() {
  useFrame((state, delta) => {
    /* ── the handoff ───────────────────────────────────────────────────────
     * The film's last frame is not the page's last frame. Once उत्सव owns the
     * screen the canvas is faded out and then hidden outright — `visibility`
     * rather than `display`, because zeroing the container's layout size would
     * take the ResizeObserver R3F depends on with it, and coming back up the
     * page would find a renderer sized to nothing.
     *
     * Everything below this early return is film work. `film.stage` is 0 only
     * once `setStage` has already blanked `on` for every act, so the acts are
     * invisible and returning early from their own useFrame; Post has disabled
     * every composer pass, so the render itself is a no-op loop. What is left
     * is one style write per frame on a hidden element.
     * ------------------------------------------------------------------- */
    const stage = domRefs.stage
    if (stage) {
      const v = film.stage
      const o = v < STAGE_OFF ? '0' : v > 0.999 ? '1' : v.toFixed(3)
      if (stage.style.opacity !== o) stage.style.opacity = o
      const vis = v < STAGE_OFF ? 'hidden' : ''
      if (stage.style.visibility !== vis) stage.style.visibility = vis
    }
    // The curtain is DOM, but it is part of the film, so it is written here in
    // the render loop rather than through React — one clock, one frame.
    //
    // Above the early return, and that placement is load-bearing: the curtain
    // sits at z-30, over everything. `setStage` zeroes `film.curtain` on the way
    // out, but the *element* only learns about it here, and a driver that
    // returned first would leave a black sheet lying over the celebration.
    const el = domRefs.curtain
    if (el) {
      const v = film.curtain
      el.style.opacity = v > 0.001 ? String(v) : '0'
      if (v > 0.001) el.style.backgroundColor = film.curtainColor
    }

    if (film.stage < STAGE_OFF) return

    tickFilm(Math.min(delta, 1 / 20))

    /* ── frame timing, reported only ──────────────────────────────────── */
    perf.acc += delta
    perf.frames++
    if (perf.frames >= 45) {
      film.fps = Math.round(45 / Math.max(perf.acc, 1e-4))
      film.quality = state.gl.getPixelRatio()
      perf.acc = 0
      perf.frames = 0
    }

    // Hard boundary on the captions. A scrubbed tween lags the playhead on
    // purpose, so on a fast scroll the outgoing act's caption is still fading
    // while the next act is already on screen. This makes the boundary
    // absolute regardless of what any timeline currently thinks.
    for (const c of domRefs.captions) {
      const want = film.on[c.act] > 0 ? '' : 'hidden'
      if (c.el.style.visibility !== want) c.el.style.visibility = want
    }

    // The seven vow meanings, on the same schedule that lights the gold words
    // in the ring around the fire. One line at a time; nothing when Agni is
    // not the act on screen.
    if (domRefs.steps.length) {
      const live = film.on.agni > 0
      const p = film.p.agni
      const n = domRefs.steps.length
      for (let i = 0; i < n; i++) {
        let o = 0
        if (live) {
          const from = (i + 0.12) / n
          const to = (i + 0.62) / n
          const outFrom = (i + 1.05) / n
          const outTo = (i + 1.35) / n
          const rise = smoothstep(from, to, p)
          const fall = i === n - 1 ? 1 - smoothstep(0.95, 1, p) : 1 - smoothstep(outFrom, outTo, p)
          o = rise * fall
        }
        const s = o < 0.002 ? '0' : o.toFixed(3)
        if (domRefs.steps[i].style.opacity !== s) domRefs.steps[i].style.opacity = s
      }
    }
  }, -1000)

  return null
}
