'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { film } from '@/lib/film'
import { saptapadi } from '@/lib/content'
import { devanagariGeometry } from '@/lib/extrude'
import { goldMaterial } from '@/lib/gold'
import { clamp01, smootherstep } from '@/lib/math'

/* ── सप्तपदी — the seven steps ───────────────────────────────────────────────
 *
 * Seven words in a ring around the fire, cut in gold and laid flat on the
 * ground the way a mandala is inscribed. Each ignites as its step is taken.
 *
 * This replaces seven stacked DOM captions, and the reason is not tidiness. A
 * caption is gone the moment the next one arrives, so the seven vows could only
 * ever be experienced one at a time and never as a set — and the saptapadi is a
 * set. Put them in the world instead and they accumulate: by the last step the
 * frame holds a fire encircled by seven lit words, which is the whole act in a
 * single image rather than a sequence you had to catch.
 *
 * They are also *unlit* before they are taken rather than absent. The vows all
 * exist from the beginning; what changes is which have been made.
 *
 * The words are the single Sanskrit term each step is named for — see the note
 * in lib/content.ts. The full mantras are liturgical, vary by tradition, and
 * are deliberately not reproduced anywhere in this film.
 * -------------------------------------------------------------------------- */

const RADIUS = 4.9
/** the ring is rotated so the first vow faces the camera's opening position */
const OFFSET = -0.6

/** an untaken vow: dark bronze, barely picking up the room */
const UNLIT = new THREE.Color('#4a2f12')
const LIT = new THREE.Color('#ffbe5c')

/**
 * Tilted up off the ground rather than laid perfectly flat. Flat is the more
 * obvious reading of "inscribed around the fire" and it is unreadable: the
 * camera descends through the act, so by the end every word is seen almost
 * edge-on. A lectern angle keeps them legible from high above *and* from low
 * beside the flame.
 */
const TILT = 0.46

export default function Saptapadi() {
  const group = useRef<THREE.Group>(null)

  const words = useMemo(
    () =>
      saptapadi.map((step, i) => {
        const geometry = devanagariGeometry(step.key, {
          depth: 0.16,
          bevel: 0.026,
          bevelSegments: 2,
          curveSegments: 4,
        })
        /**
         * Each needs its own material: they ignite independently.
         *
         * "Unlit" has to be fought for. Polished gold sitting next to an open
         * fire picks up enough environment and firelight to look lit whatever
         * its emissive is — the first version had all seven glowing before a
         * single vow had been taken, which threw away the entire point. So an
         * untaken vow is dark bronze with the environment almost switched off,
         * and ignition drives colour, reflectivity and emissive together.
         */
        const material = goldMaterial({ roughness: 0.42, envMapIntensity: 0.18 })
        material.color = new THREE.Color(UNLIT)
        material.emissive = new THREE.Color('#ff8c2e')
        material.emissiveIntensity = 0
        material.side = THREE.FrontSide
        return { geometry, material, angle: (i / saptapadi.length) * Math.PI * 2 + OFFSET }
      }),
    [],
  )

  useFrame(() => {
    if (film.on.agni === 0) return
    const p = film.p.agni
    const t = film.time

    for (let i = 0; i < words.length; i++) {
      /**
       * Each vow is taken across its own slice of the act, and the slices do
       * not touch — there is a gap between one word catching and the next
       * beginning, because seven ignitions running into each other is a
       * shimmer, not seven distinct promises.
       */
      const from = (i + 0.12) / words.length
      const to = (i + 0.62) / words.length
      const lit = smootherstep(from, to, p)

      const m = words[i].material
      // a slow flicker once lit, in sympathy with the fire beside it
      const flicker = 0.86 + 0.14 * Math.sin(t * 6.1 + i * 1.7) * Math.sin(t * 2.3 + i)

      // colour, reflectivity and emissive all move together — any one of them
      // alone leaves the vow looking lit before it has been taken
      m.color.lerpColors(UNLIT, LIT, lit)
      m.envMapIntensity = 0.18 + lit * 1.5
      m.roughness = 0.42 - lit * 0.18
      // A taken vow glows *gold*, not white. Emissive is view-independent and
      // flat, so past about half it stops looking like lit metal and starts
      // looking like a lightbulb in the shape of a word — the same failure the
      // opening mantra had. Most of the brightness should come from the
      // environment term above, which still has form in it.
      m.emissiveIntensity = lit * 0.55 * flicker
    }

    // the ring turns, very slowly and forever, so the gold is never a still
    // image even while the camera is holding
    if (group.current) group.current.rotation.y = t * 0.035

    const anyLit = clamp01(p * words.length)
    film.bloomBias = Math.max(film.bloomBias, Math.min(anyLit * 0.12, 0.3))
  })

  return (
    <group ref={group}>
      {words.map((w, i) => (
        // outer group carries the ring angle; the mesh inside is laid flat and
        // pushed out to the radius, so the text reads from outside the circle
        <group key={saptapadi[i].key} rotation={[0, w.angle, 0]}>
          <mesh
            geometry={w.geometry}
            material={w.material}
            position={[0, 0.16, -RADIUS]}
            rotation={[-Math.PI / 2 + TILT, 0, 0]}
            scale={1.15}
          />
        </group>
      ))}
    </group>
  )
}
