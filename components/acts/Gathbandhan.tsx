'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { REGION_OF, type Region } from '@/lib/content'
import { KNOT, film } from '@/lib/film'
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

const { R, tube: TUBE, split: SPLIT } = KNOT

export default function Gathbandhan() {
  const ringA = useRef<THREE.Mesh>(null)
  const ringB = useRef<THREE.Mesh>(null)
  const group = useRef<THREE.Group>(null)

  const { geometry, matA, matB } = useMemo(() => {
    const geometry = new THREE.TorusGeometry(R, TUBE, film.lowEnd ? 14 : 20, film.lowEnd ? 64 : 112)

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
     *
     * ── on scale, which this got wrong twice ──
     *
     * Torus UV is not a square sheet. u runs the major circle, 2πR ≈ 6.28 world
     * units of it; v runs the tube, 2πr ≈ 0.72. That is a **ratio of R/r ≈ 8.7
     * to one**, so a pattern sampled on raw uv is stretched around the ring and
     * crushed across the tube by that factor. The tube coordinate has to be
     * scaled by exactly r/R to put the cells back on square — anything else is
     * an aspect bug wearing a magic number.
     *
     * And the frequency was low enough that the band pitch came out near the
     * tube's own diameter, which does not read as chasing. It reads as a
     * barber's pole. Pitch is now about 0.09 world units — roughly a tenth of
     * the tube's circumference, which is the scale goldwork is actually chased
     * at, and fine enough that the eye takes it as surface rather than as
     * stripes.
     */
    const ASPECT = TUBE / R // r/R — puts the pattern cells back on square
    const CHASE = 92.0
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
             // torus uv: x runs the major circle, y the tube. y is scaled by
             // r/R so a cell is as wide as it is tall in world space.
             vec2 puv = vRingUv * vec2(1.0, ${ASPECT.toFixed(4)});
             float own = uRegion < 0.5
               ? leheriya(puv, ${CHASE.toFixed(1)}, 0.7)
               : butti(puv, 30.0);
             // the shared chase both bands become — one spiral, not two grids
             float shared = leheriya(puv, ${CHASE.toFixed(1)}, 0.28);
             float cut = mix(own, shared, uUnify);

             // Chasing this fine has to *vanish* rather than alias once the
             // band pitch falls under a pixel — on a 390px phone the ring is a
             // third the size it is here. A moiré shimmer crawling over a
             // wedding ring is far worse than a plain gold one.
             float perPixel = fwidth(vRingUv.x) * ${CHASE.toFixed(1)};
             cut *= 1.0 - smoothstep(0.22, 0.55, perPixel);

             // a gentle swing: engraving widens the highlight, it does not
             // paint matte stripes. 0.13 → 0.25 is about a stop of gloss.
             roughnessFactor = mix(roughnessFactor, 0.30, cut * 0.7);`,
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
      ringA.current.position.x = lerp(-3.4, -SPLIT, close)
      ringA.current.rotation.set(t * 0.9 * free, t * 0.55 * free, 0)
    }
    if (ringB.current) {
      ringB.current.position.x = lerp(3.4, SPLIT, close)
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
