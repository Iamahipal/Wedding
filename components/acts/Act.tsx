'use client'

import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { film, STATION, type ActName } from '@/lib/film'

/**
 * Every act lives inside one of these.
 *
 * It parks the act's contents at that act's station in world space and, more
 * importantly, switches the whole subtree off the instant the playhead leaves.
 * Only one act is ever visible, so the draw-call cost of the film is the cost of
 * its single most expensive act rather than the sum of all seven.
 *
 * Acts stay dumb: markup and meshes. No timing logic lives inside them — every
 * ScrollTrigger in the film is authored in Film.tsx, in scene order, so the
 * choreography reads as a shot list.
 */
export default function Act({ name, children }: { name: ActName; children?: ReactNode }) {
  const group = useRef<THREE.Group>(null)

  useFrame(() => {
    const g = group.current
    if (!g) return
    const on = film.on[name] > 0
    if (g.visible !== on) g.visible = on
  }, -900)

  return (
    <group ref={group} position={STATION[name] as unknown as [number, number, number]} visible={false}>
      {children}
    </group>
  )
}

/** True when this act owns the playhead. Acts call this to skip frame work. */
export function isLive(name: ActName) {
  return film.on[name] > 0
}
