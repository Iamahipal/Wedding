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
export default function FrameDriver() {
  useFrame((_, delta) => {
    tickFilm(Math.min(delta, 1 / 20))

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
