'use client'

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { film, shotFor, HERO_P, type ActName } from '@/lib/film'
import { damp } from '@/lib/math'

const pos = new THREE.Vector3()
const target = new THREE.Vector3()

/**
 * The camera has mass.
 *
 * The shot itself comes from lib/film.ts — this component only *drives* it, so
 * the film can be re-timed without touching a single visual and re-art-directed
 * without touching a single timing.
 *
 * Damping is what supplies the weight: the camera chases the authored shot at a
 * fixed rate rather than snapping to it, so a flick of the wheel reads as an
 * object with inertia rather than a value being assigned. The one exception is
 * an act boundary, where the station changes by hundreds of units — there it
 * snaps, under cover of the curtain, because damping across that gap would drag
 * the camera through empty space in full view once the curtain lifted.
 */
export default function CameraRig() {
  const { camera, size } = useThree()
  const lastAct = useRef<ActName | null>(null)

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20)
    const cam = camera as THREE.PerspectiveCamera

    film.aspect = size.width / Math.max(size.height, 1)
    film.portrait = film.aspect < 1

    const act = film.active
    const p = film.reducedMotion ? HERO_P[act] : film.p[act]
    const shot = shotFor(act, p, film)
    film.fov = shot.fov

    const cut = lastAct.current !== act
    lastAct.current = act

    pos.set(shot.px, shot.py, shot.pz)
    target.set(shot.tx, shot.ty, shot.tz)

    if (cut || film.reducedMotion) {
      cam.position.copy(pos)
    } else {
      const k = 9
      cam.position.x = damp(cam.position.x, pos.x, k, dt)
      cam.position.y = damp(cam.position.y, pos.y, k, dt)
      cam.position.z = damp(cam.position.z, pos.z, k, dt)
    }

    cam.up.set(0, 1, 0)
    cam.lookAt(target)
    if (shot.roll !== 0) cam.rotateZ(shot.roll)

    if (Math.abs(cam.fov - shot.fov) > 0.001) {
      cam.fov = cut ? shot.fov : damp(cam.fov, shot.fov, 6, dt)
      cam.updateProjectionMatrix()
    }
  })

  return null
}
