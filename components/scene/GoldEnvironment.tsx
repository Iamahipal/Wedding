'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'

import { film } from '@/lib/film'
import { keyColor } from '@/lib/gold'

/**
 * The lighting rig — which is to say, most of the film's look.
 *
 * TRAP 1. A metal only reads as metal if large parts of it are dark. A broad,
 * evenly-bright environment lights every face to the same value and you get a
 * flat glowing blob with no form and no legibility. So: a few *very bright,
 * very small* shapes against a dark surround. High dynamic range, low coverage.
 *
 * TRAP 2. But that surround is dark *warm*, not black. A black surround drains
 * the colour out of the shadows and the gold turns to gunmetal.
 *
 * TRAP 6. Lightformers baked once (frames={1}) rather than an HDRI — drei's
 * presets fetch megabytes from a CDN onto the critical path of the opening,
 * which is the one moment in this film that must not stall.
 *
 * TRAP 7. And it *moves*. The baked cubemap is rotated continuously and two
 * punctual lights orbit, so highlights travel across the bevels forever. This
 * is the single biggest "alive" factor in the piece and it costs nothing.
 */
export default function GoldEnvironment() {
  const orbitA = useRef<THREE.PointLight>(null)
  const orbitB = useRef<THREE.PointLight>(null)
  const rim = useRef<THREE.DirectionalLight>(null)

  useFrame(({ scene }) => {
    const t = film.time
    const { warmth, exposure } = film.damped

    // the whole reflected world turns, slowly and forever
    scene.environmentRotation.y = t * 0.045
    scene.environmentIntensity = 1.0 * exposure

    if (orbitA.current) {
      const a = t * 0.31
      orbitA.current.position.set(Math.sin(a) * 9, 3.6 + Math.sin(a * 0.7) * 1.6, Math.cos(a) * 9)
      orbitA.current.color.copy(keyColor(warmth))
      orbitA.current.intensity = 90 * exposure
    }
    if (orbitB.current) {
      const b = -t * 0.19 + 2.1
      orbitB.current.position.set(Math.sin(b) * 12, -2.2 + Math.cos(b * 0.9) * 1.2, Math.cos(b) * 12)
      orbitB.current.intensity = 42 * exposure
    }
    if (rim.current) {
      const c = t * 0.11 + 1.2
      rim.current.position.set(Math.sin(c) * 14, 6, Math.cos(c) * 14 - 6)
      rim.current.intensity = 1.5 * exposure
    }
  })

  return (
    <>
      <Environment frames={1} resolution={256} background={false}>
        {/* the dark WARM surround — never black */}
        <color attach="background" args={['#150d05']} />

        {/* key: narrow, tall, and very bright. this is what carves the form. */}
        <Lightformer
          form="rect"
          intensity={46}
          color="#fff4e0"
          scale={[2.2, 14, 1]}
          position={[-8, 5, 2]}
          rotation={[0, Math.PI / 2, 0]}
        />
        {/* kicker on the opposite side, half the strength, warmer */}
        <Lightformer
          form="rect"
          intensity={22}
          color="#ffcf94"
          scale={[1.4, 10, 1]}
          position={[9, 1.5, -1]}
          rotation={[0, -Math.PI / 2, 0]}
        />
        {/* a small hot pip overhead — gives every bevel one hard specular */}
        <Lightformer
          form="circle"
          intensity={70}
          color="#ffffff"
          scale={[1.6, 1.6, 1]}
          position={[1.5, 9, 1]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
        {/* rear rim, near-neutral white: separates one form from the next
            without dragging the frame toward navy */}
        <Lightformer
          form="rect"
          intensity={16}
          color="#fbf7ef"
          scale={[9, 2, 1]}
          position={[0, 2.5, -10]}
        />

        {/* Everything above lives behind or beside the subject, which is right
            for the bevels and wrong for the one surface the viewer actually
            reads: a flat face pointing at the lens reflects whatever sits
            *behind the camera*. Leave that empty and the front of every
            letterform goes dead black; fill it broadly and the whole face goes
            evenly bright, which is the flat blob of TRAP 1.
            So: one dim amber card for the body of the face, and one small,
            fierce spark that the environment's rotation drags across it. */}
        <Lightformer
          form="rect"
          intensity={2.4}
          color="#b9762a"
          scale={[9, 5, 1]}
          position={[0, 0.5, 12]}
        />
        <Lightformer
          form="circle"
          intensity={42}
          color="#fff3dc"
          scale={[1.1, 1.1, 1]}
          position={[-3.2, 3.4, 9.5]}
        />

        {/* the bounce. dim, deep amber, and kept small — this is what keeps the
            shadows gold-brown instead of gunmetal, and nothing more. */}
        <Lightformer
          form="rect"
          intensity={0.8}
          color="#8a4a12"
          scale={[12, 8, 1]}
          position={[0, -7, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      </Environment>

      <pointLight ref={orbitA} distance={70} decay={2} />
      <pointLight ref={orbitB} distance={90} decay={2} color="#ffb257" />
      <directionalLight ref={rim} color="#fbf7ef" />
      {/* just enough ambient that nothing is ever mathematically zero */}
      <ambientLight intensity={0.06} color="#4a2b0e" />
    </>
  )
}
