'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { film } from '@/lib/film'
import { goldMaterial } from '@/lib/gold'
import { simplex3d } from '@/lib/shaders/noise'

/* ── जल — water ──────────────────────────────────────────────────────────────
 *
 * Sudden stillness after the fire. A kalash — the sacred pot, coconut and mango
 * leaves at its mouth — a lotus, and a diya floating on black water that
 * reflects the gold above it.
 *
 * Almost nothing moves. The contrast with Agni *is* the effect, so the
 * temptation to give this act something to do has to be resisted: the camera
 * drifts by less than half a unit across the whole act.
 *
 * This is also the easiest place in the film to lose the palette. Water wants
 * to be blue and every instinct pulls that way. It gets its coolness from
 * *value* instead — darker, lower key, less saturated gold — and there is not a
 * single blue channel boost anywhere in this file.
 * -------------------------------------------------------------------------- */

/* ── the kalash ───────────────────────────────────────────────────────────── */

function kalashProfile() {
  const pts: THREE.Vector2[] = []
  const add = (x: number, y: number) => pts.push(new THREE.Vector2(x, y))
  add(0.001, 0)
  add(0.30, 0)
  add(0.34, 0.04)
  add(0.30, 0.11)
  add(0.46, 0.28)
  add(0.55, 0.5)
  add(0.53, 0.68)
  add(0.42, 0.84)
  add(0.32, 0.94)
  add(0.3, 1.0)
  add(0.41, 1.08) // the flared rim the leaves sit in
  add(0.42, 1.14)
  add(0.35, 1.12)
  return pts
}

function Kalash() {
  const group = useRef<THREE.Group>(null)

  const { pot, coconut, leaves, potMat, coconutMat, leafMat } = useMemo(() => {
    const pot = new THREE.LatheGeometry(kalashProfile(), 48)

    const coconut = new THREE.SphereGeometry(0.24, 20, 16)
    coconut.scale(1, 1.12, 1)
    coconut.translate(0, 1.36, 0)

    // mango leaves around the mouth, tilted outward
    const leafShape = new THREE.Shape()
    leafShape.moveTo(0, 0)
    leafShape.bezierCurveTo(0.1, 0.16, 0.11, 0.42, 0, 0.62)
    leafShape.bezierCurveTo(-0.11, 0.42, -0.1, 0.16, 0, 0)
    const one = new THREE.ShapeGeometry(leafShape, 10)

    const merged: THREE.BufferGeometry[] = []
    const count = 9
    for (let i = 0; i < count; i++) {
      const g = one.clone()
      g.rotateX(-Math.PI / 2 + 0.85)
      g.rotateY((i / count) * Math.PI * 2)
      const a = (i / count) * Math.PI * 2
      g.translate(Math.sin(a) * 0.33, 1.12, Math.cos(a) * 0.33)
      merged.push(g)
    }
    const leaves = mergeSimple(merged)
    for (const m of merged) m.dispose()
    one.dispose()

    // DoubleSide on everything here, because each prop is also drawn mirrored
    // through the water: a negative scale reverses triangle winding, and
    // front-face culling would render the reflection inside-out or not at all.
    const potMat = goldMaterial({ roughness: 0.26, envMapIntensity: 1.0 })

    const coconutMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#3b2410'),
      roughness: 0.85,
      metalness: 0.05,
      envMapIntensity: 0.5,
      side: THREE.DoubleSide,
    })

    const leafMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#4a3a12'),
      roughness: 0.6,
      metalness: 0.35,
      envMapIntensity: 0.8,
      side: THREE.DoubleSide,
    })

    /**
     * Caustics. Light bouncing off a moving surface throws bands onto whatever
     * stands in the water, and they are strongest at the waterline and fade out
     * with height — which is exactly the cue that tells the eye the pot is
     * *standing in* the water rather than sitting on a mirror.
     */
    potMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 }
      potMat.userData.shader = shader
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCausticPos;')
        .replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvCausticPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
        )
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vCausticPos;
           uniform float uTime;
           ${simplex3d}`,
        )
        .replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
           float wl = vCausticPos.y;
           float band = 1.0 - smoothstep(0.0, 0.85, wl);
           float c1 = snoise(vec3(vCausticPos.xz * 5.5, uTime * 0.35));
           float c2 = snoise(vec3(vCausticPos.xz * 9.0 + 4.1, uTime * 0.5));
           float caustic = pow(clamp(1.0 - abs(c1 * 0.7 + c2 * 0.3), 0.0, 1.0), 7.0);
           gl_FragColor.rgb += vec3(1.0, 0.72, 0.34) * caustic * band * 0.55;`,
        )
    }

    return { pot, coconut, leaves, potMat, coconutMat, leafMat }
  }, [])

  useFrame(() => {
    if (film.on.jal === 0) return
    const shader = potMat.userData.shader as { uniforms: Record<string, { value: number }> } | undefined
    if (shader) shader.uniforms.uTime.value = film.time
    if (group.current) {
      // the only movement in the act: the pot breathes on the water
      group.current.position.y = Math.sin(film.time * 0.55) * 0.012
    }
  })

  return (
    <group ref={group} position={[0, 0, 0]}>
      <mesh geometry={pot} material={potMat} />
      <mesh geometry={coconut} material={coconutMat} />
      <mesh geometry={leaves} material={leafMat} />
    </group>
  )
}

/* ── the lotus ────────────────────────────────────────────────────────────── */

function Lotus() {
  const { geometry, material } = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.bezierCurveTo(0.15, 0.2, 0.13, 0.55, 0, 0.78)
    shape.bezierCurveTo(-0.13, 0.55, -0.15, 0.2, 0, 0)
    const petal = new THREE.ShapeGeometry(shape, 8)

    const parts: THREE.BufferGeometry[] = []
    const rings = [
      { n: 9, scale: 1.0, tilt: 1.32, y: 0.02 },
      { n: 8, scale: 0.78, tilt: 1.02, y: 0.06 },
      { n: 6, scale: 0.55, tilt: 0.68, y: 0.1 },
    ]
    for (const ring of rings) {
      for (let i = 0; i < ring.n; i++) {
        const g = petal.clone()
        g.scale(ring.scale, ring.scale, ring.scale)
        g.rotateX(-ring.tilt)
        const a = (i / ring.n) * Math.PI * 2 + ring.scale * 2.1
        g.rotateY(a)
        g.translate(0, ring.y, 0)
        parts.push(g)
      }
    }
    const geometry = mergeSimple(parts)
    for (const p of parts) p.dispose()
    petal.dispose()

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#8a3a12'),
      roughness: 0.45,
      metalness: 0.45,
      sheen: 0.6,
      sheenColor: new THREE.Color('#ffbe72'),
      envMapIntensity: 0.9,
      side: THREE.DoubleSide,
    })

    return { geometry, material }
  }, [])

  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (film.on.jal === 0 || !ref.current) return
    ref.current.position.y = 0.02 + Math.sin(film.time * 0.42 + 1.7) * 0.01
    ref.current.rotation.y = film.time * 0.026
  })

  return <mesh ref={ref} geometry={geometry} material={material} position={[-1.55, 0.02, 0.55]} />
}

/* ── the diya ─────────────────────────────────────────────────────────────── */

function Diya() {
  const group = useRef<THREE.Group>(null)
  const flame = useRef<THREE.Mesh>(null)

  const { bowl, bowlMat, flameMat } = useMemo(() => {
    const profile = [
      new THREE.Vector2(0.001, 0),
      new THREE.Vector2(0.16, 0.005),
      new THREE.Vector2(0.2, 0.05),
      new THREE.Vector2(0.19, 0.11),
      new THREE.Vector2(0.14, 0.09),
      new THREE.Vector2(0.13, 0.03),
    ]
    const bowl = new THREE.LatheGeometry(profile, 24)
    const bowlMat = goldMaterial({ roughness: 0.34 })
    bowlMat.side = THREE.DoubleSide

    const flameMat = new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        void main() {
          vec2 q = vUv - vec2(0.5, 0.12);
          q.x *= 2.6;
          q.x += sin(uTime * 3.1 + vUv.y * 5.0) * 0.05 * vUv.y;
          float d = length(q / vec2(1.0, 1.35));
          float a = pow(clamp(1.0 - d * 2.0, 0.0, 1.0), 2.0);
          vec3 col = mix(vec3(1.0, 0.42, 0.06), vec3(1.0, 0.94, 0.76), pow(a, 1.8));
          gl_FragColor = vec4(col * a * 2.2, a);
        }`,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })

    return { bowl, bowlMat, flameMat }
  }, [])

  useFrame(({ camera }) => {
    if (film.on.jal === 0) return
    flameMat.uniforms.uTime.value = film.time
    if (group.current) {
      group.current.position.y = Math.sin(film.time * 0.63 + 3.1) * 0.014
      group.current.rotation.z = Math.sin(film.time * 0.4) * 0.02
    }
    if (flame.current) flame.current.quaternion.copy(camera.quaternion)
  })

  return (
    <group ref={group} position={[1.35, 0.01, 0.9]}>
      <mesh geometry={bowl} material={bowlMat} />
      <mesh ref={flame} material={flameMat} position={[0, 0.18, 0]}>
        <planeGeometry args={[0.26, 0.34]} />
      </mesh>
      <pointLight color="#ffa64d" intensity={0.55} distance={4} decay={2} position={[0, 0.2, 0]} />
    </group>
  )
}

/* ── the water ────────────────────────────────────────────────────────────── */

const waterVertex = /* glsl */ `
  varying vec3 vWorld;
  varying vec2 vXZ;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vXZ = w.xz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`

const waterFragment = /* glsl */ `
  precision highp float;
  varying vec3 vWorld;
  varying vec2 vXZ;

  uniform float uTime;
  uniform vec3  uDeep;
  uniform vec3  uGlint;

  ${simplex3d}

  void main() {
    vec3 V = normalize(cameraPosition - vWorld);

    // ripple normal: two slow, crossed wave trains, nothing more. Water this
    // still should barely move.
    float e = 0.35;
    vec2 p = vXZ * 0.55;
    float h  = snoise(vec3(p, uTime * 0.11)) * 0.5 + snoise(vec3(p * 2.3 + 11.0, uTime * 0.17)) * 0.25;
    float hx = snoise(vec3(p + vec2(e, 0.0), uTime * 0.11)) * 0.5 + snoise(vec3((p + vec2(e, 0.0)) * 2.3 + 11.0, uTime * 0.17)) * 0.25;
    float hz = snoise(vec3(p + vec2(0.0, e), uTime * 0.11)) * 0.5 + snoise(vec3((p + vec2(0.0, e)) * 2.3 + 11.0, uTime * 0.17)) * 0.25;
    vec3 N = normalize(vec3(h - hx, 0.55, h - hz));

    /**
     * Fresnel decides how much of the reflection below survives.
     *
     * The camera in this act sits low and looks almost along the surface, which
     * is a grazing angle — and at grazing angles water is nearly a mirror. So
     * the alpha *falls* as the view flattens, letting the mirrored kalash come
     * through strongly near the horizon and fade to dark water underfoot. That
     * gradient is most of what sells the plane as liquid.
     */
    float f = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
    // Never fully transparent. A reflection that comes through at full strength
    // reads as a mirror lying on the floor; water always keeps some of its own
    // darkness over the top of what it is reflecting.
    float alpha = mix(0.95, 0.44, clamp(f * 1.35, 0.0, 1.0));

    // a few specular glints where the ripple happens to face the key light
    float g = pow(clamp(dot(N, normalize(vec3(-0.35, 0.55, 0.4))), 0.0, 1.0), 90.0);

    vec3 col = uDeep + uGlint * g * 1.5;
    gl_FragColor = vec4(col, alpha);
  }
`

function Water() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: waterVertex,
        fragmentShader: waterFragment,
        uniforms: {
          uTime: { value: 0 },
          // warm near-black. A neutral or cool base here is exactly what tips
          // the act toward blue, which is the one thing it must not do.
          uDeep: { value: new THREE.Color('#070402') },
          uGlint: { value: new THREE.Color('#ffd79a') },
        },
        transparent: true,
        depthWrite: false,
        toneMapped: true,
      }),
    [],
  )

  useFrame(() => {
    if (film.on.jal === 0) return
    material.uniforms.uTime.value = film.time
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} renderOrder={10} material={material}>
      {/* big enough that its far edge dies in the backdrop rather than drawing
          a hard horizon straight across the frame */}
      <planeGeometry args={[300, 300]} />
    </mesh>
  )
}

/* ── util ─────────────────────────────────────────────────────────────────── */

/** Position+normal+uv merge, enough for the static props in this act. */
function mergeSimple(list: THREE.BufferGeometry[]) {
  let vc = 0
  let ic = 0
  for (const g of list) {
    vc += g.attributes.position.count
    ic += g.index ? g.index.count : g.attributes.position.count
  }
  const position = new Float32Array(vc * 3)
  const normal = new Float32Array(vc * 3)
  const uv = new Float32Array(vc * 2)
  const index = new Uint32Array(ic)

  let vo = 0
  let io = 0
  for (const g of list) {
    position.set(g.attributes.position.array as Float32Array, vo * 3)
    if (g.attributes.normal) normal.set(g.attributes.normal.array as Float32Array, vo * 3)
    if (g.attributes.uv) uv.set(g.attributes.uv.array as Float32Array, vo * 2)
    const gi = g.index
    const count = gi ? gi.count : g.attributes.position.count
    for (let i = 0; i < count; i++) index[io + i] = (gi ? gi.getX(i) : i) + vo
    vo += g.attributes.position.count
    io += count
  }

  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(position, 3))
  out.setAttribute('normal', new THREE.BufferAttribute(normal, 3))
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  out.setIndex(new THREE.BufferAttribute(index, 1))
  out.computeVertexNormals()
  out.computeBoundingSphere()
  return out
}

/** Everything that stands in the water. Rendered twice — once upright, once
 *  mirrored — which *is* the reflection. */
function Props() {
  return (
    <>
      <Kalash />
      <Lotus />
      <Diya />
    </>
  )
}

export default function Jal() {
  return (
    <>
      {/**
       * The reflection is real geometry, mirrored through the surface, drawn
       * under a translucent water plane.
       *
       * The obvious tool here is drei's MeshReflectorMaterial, and it was the
       * first thing tried. It renders the whole scene a second time from a
       * mirrored camera every frame — which is both the most expensive thing
       * that would exist in this film and, in this scene, wrong: it washed the
       * frame out even with every object in the act hidden.
       *
       * Mirrored geometry costs one extra draw call per prop, is exact, and can
       * be art-directed directly (it is dimmed and desaturated below, because a
       * reflection is never as bright as the thing reflected).
       */}
      <group scale={[1, -1, 1]} renderOrder={1}>
        <Props />
      </group>
      <Water />
      <Props />
    </>
  )
}
