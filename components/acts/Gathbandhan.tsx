'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { REGION_OF, type Region } from '@/lib/content'
import { film } from '@/lib/film'
import { goldMaterial } from '@/lib/gold'
import { lerp, smootherstep } from '@/lib/math'
import { patterns } from '@/lib/shaders/patterns'

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

  const { geometry, matA, matB } = useMemo(() => {
    const geometry = new THREE.TorusGeometry(R, 0.115, film.lowEnd ? 14 : 20, film.lowEnd ? 64 : 112)

    /**
     * Each band is engraved with its own household's pattern — leheriya on one,
     * the Banarasi butti on the other — and as they lock, both resolve into a
     * single continuous chase running around the knot.
     *
     * This is the film's whole argument in one object, so it is worth stating
     * how it is *not* done: the pattern is cut into **roughness**, not painted
     * into colour. Engraved gold is gold everywhere; what changes across a
     * chased surface is how wide the highlight spreads, and colouring it
     * instead would give us two rings with stickers on them.
     */
    const engrave = (region: Region) => {
      const m = goldMaterial({ roughness: 0.13, envMapIntensity: 1.35 })
      m.userData.uniforms = {
        uRegion: { value: region === 'rajasthan' ? 0 : 1 },
        uUnify: { value: 0 },
      }
      m.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, m.userData.uniforms)
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec2 vRingUv;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRingUv = uv;')
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            `#include <common>
             ${patterns}
             uniform float uRegion;
             uniform float uUnify;
             varying vec2 vRingUv;`,
          )
          .replace(
            '#include <roughnessmap_fragment>',
            `#include <roughnessmap_fragment>
             // torus uv: x runs the major circle, y the tube
             float own = uRegion < 0.5
               ? leheriya(vRingUv * vec2(1.0, 0.35), 26.0, 0.7)
               : butti(vRingUv * vec2(1.0, 0.3), 14.0);
             // the shared chase both bands become
             float shared = leheriya(vRingUv * vec2(1.0, 0.3), 34.0, 0.0);
             float cut = mix(own, shared, uUnify);
             roughnessFactor = mix(roughnessFactor, 0.42, cut * 0.8);`,
          )
      }
      return m
    }

    return { geometry, matA: engrave(REGION_OF.groom), matB: engrave(REGION_OF.bride) }
  }, [])

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

    // the two engravings resolve into one chase as the knot closes
    ;(matA.userData.uniforms.uUnify as { value: number }).value = lock
    ;(matB.userData.uniforms.uUnify as { value: number }).value = lock

    film.bloomBias = Math.max(film.bloomBias, 0.15 * lock)
  })

  return (
    <group ref={group}>
      <mesh ref={ringA} geometry={geometry} material={matA} />
      <mesh ref={ringB} geometry={geometry} material={matB} />
    </group>
  )
}
