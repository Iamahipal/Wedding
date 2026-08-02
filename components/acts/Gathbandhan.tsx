'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { film } from '@/lib/film'
import { goldMaterial } from '@/lib/gold'
import { lerp, smootherstep } from '@/lib/math'

/* ── गठबंधन — the knot ───────────────────────────────────────────────────────
 *
 * Two golden forms rotate on independent axes and interlock. Highlights sweep
 * along their curvature as they turn. Hold.
 *
 * This is the film's material thesis stated plainly: a polished gold ring
 * turning under studio light. Nothing here is doing anything clever — the whole
 * effect is the lighting rig from components/scene/GoldEnvironment.tsx rotating
 * forever behind two tori, which is exactly the point.
 * -------------------------------------------------------------------------- */

const R = 1.0

export default function Gathbandhan() {
  const ringA = useRef<THREE.Mesh>(null)
  const ringB = useRef<THREE.Mesh>(null)
  const group = useRef<THREE.Group>(null)

  const { geometry, material } = useMemo(
    () => ({
      geometry: new THREE.TorusGeometry(R, 0.115, film.lowEnd ? 14 : 20, film.lowEnd ? 64 : 112),
      // the smoothest, most reflective gold in the film. It has nothing to hide
      // behind — no text to be legible, no fire to compete with.
      material: goldMaterial({ roughness: 0.13, envMapIntensity: 1.35 }),
    }),
    [],
  )

  useFrame(() => {
    if (film.on.gathbandhan === 0) return
    const p = film.p.gathbandhan
    const t = film.time

    /**
     * Three beats:
     *   approach   the rings come in from opposite sides, each tumbling freely
     *   lock       the tumble damps out into the one orientation that links them
     *   hold       nothing turns but the pair, and the light
     *
     * The tumble has to *end*. Two rings spinning on independent axes cannot
     * stay linked — they would pass straight through one another — so the
     * independent motion is spent before they arrive, and after that the whole
     * knot turns as one rigid body.
     */
    const close = smootherstep(0.04, 0.62, p)
    const lock = smootherstep(0.5, 0.78, p)
    const free = 1 - lock

    if (ringA.current) {
      ringA.current.position.x = lerp(-3.4, -R * 0.5, close)
      ringA.current.rotation.set(t * 0.9 * free, t * 0.55 * free, 0)
    }
    if (ringB.current) {
      ringB.current.position.x = lerp(3.4, R * 0.5, close)
      // settles into the plane perpendicular to A — the linked configuration
      ringB.current.rotation.set(
        lerp(-t * 0.7, Math.PI / 2, lock),
        lerp(t * 1.1, 0, lock),
        0,
      )
    }

    if (group.current) {
      // the hold: the knot turns slowly and forever, and the highlights travel
      group.current.rotation.y = t * 0.16 + p * 0.5
      group.current.rotation.x = Math.sin(t * 0.11) * 0.11
    }

    film.bloomBias = Math.max(film.bloomBias, 0.15 * lock)
  })

  return (
    <group ref={group}>
      <mesh ref={ringA} geometry={geometry} material={material} />
      <mesh ref={ringB} geometry={geometry} material={material} />
    </group>
  )
}
