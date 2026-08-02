'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { film, prologueMantra } from '@/lib/film'
import { devanagariGeometry } from '@/lib/extrude'
import { goldMaterial } from '@/lib/gold'
import { clamp01, lerp, smootherstep, smoothstep } from '@/lib/math'

/* ── शून्य — the void, and the invocation ────────────────────────────────────
 *
 *   0.00 – 0.20   black, held longer than is comfortable
 *   0.20 – 0.40   a single point ignites, and flickers like a match catching
 *   0.40 – 0.46   it takes, and swells
 *   0.46 – 0.56   it detonates past the camera and swallows the frame
 *   0.50 – 0.86   out of the residual glow, ॐ गं गणपतये नमः, approaching
 *   0.86 – 1.00   the camera flies through the letterforms
 *
 * ॐ गं गणपतये नमः — Om Gam Ganapataye Namah, invoking Ganesha, remover of
 * obstacles. Every Hindu ceremony begins here, so the film does too.
 * -------------------------------------------------------------------------- */

/**
 * A match catching: three failed sparks, then it takes. Authored as an explicit
 * shape rather than as noise, and a pure function of scroll progress rather
 * than of wall-clock time — so scrubbing backwards and forwards replays exactly
 * the same stutter instead of re-randomising the one beat that has to feel
 * deliberate.
 */
function ignition(p: number) {
  if (p < 0.2 || p >= 0.5) return 0

  const q = clamp01((p - 0.2) / 0.26) // 0..1 across the flicker window
  const spark = (at: number, w: number, h: number) => h * Math.max(0, 1 - Math.abs(q - at) / w)

  const catches = smootherstep(0.62, 0.92, q)
  const stutter = spark(0.06, 0.05, 0.55) + spark(0.24, 0.06, 0.42) + spark(0.44, 0.07, 0.78)
  const lit = clamp01(Math.max(stutter * (1 - catches), catches))

  // and then it is consumed by its own detonation. Without this hand-off the
  // point stays lit at full strength for the rest of the act and sits as a
  // blob in the middle of the mantra.
  return lit * (1 - smoothstep(0.43, 0.5, p))
}

/**
 * 0 before the blast, 1 at its peak, back to 0 as the glow burns down.
 *
 * The fall is much longer than the rise and still deliberately short: the frame
 * clamps to pure white for as long as this sits near 1, and a whiteout measured
 * in tens of vh of scrolling stops reading as an explosion and starts reading
 * as a page that failed to load.
 */
function detonation(p: number) {
  if (p < 0.44 || p > 0.6) return 0
  return smoothstep(0.44, 0.48, p) * (1 - smoothstep(0.5, 0.585, p))
}

const glowVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const glowFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uIntensity;
  uniform float uCore;
  uniform vec3  uColor;

  void main() {
    float r = length(vUv - 0.5) * 2.0;
    if (r > 1.0) discard;
    float core = pow(max(0.0, 1.0 - r), 4.0);
    float halo = exp(-r * 3.4) - exp(-3.4);
    float a = core * uCore + halo * 0.75;
    gl_FragColor = vec4(uColor * a * uIntensity, a);
  }
`

function Ignition() {
  const mesh = useRef<THREE.Mesh>(null)

  // Constructed, not declared — R3F merges a `uniforms` prop into the
  // material's own object instead of adopting it, so per-frame writes to a
  // memoised uniforms object never reach the shader. See Backdrop.tsx.
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: glowVertex,
        fragmentShader: glowFragment,
        uniforms: {
          uIntensity: { value: 0 },
          uCore: { value: 1 },
          uColor: { value: new THREE.Color('#ffd79a') },
        },
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  )

  useFrame(({ camera }) => {
    const g = mesh.current
    if (!g || !g.parent?.visible) return

    const p = film.p.shunya
    const spark = ignition(p)
    const blast = detonation(p)
    // reduced motion still gets the beat — it just does not get flashbanged
    const gain = film.reducedMotion ? 0.22 : 1

    if (spark <= 0 && blast <= 0) {
      g.visible = false
      return
    }
    g.visible = true

    // the point sits 6 units ahead of a stationary camera, then comes at it.
    // it has to be big enough to actually read as a point of light rather than
    // as a stuck pixel — on a phone in portrait, sub-degree is sub-visible.
    const swell = smootherstep(0.4, 0.46, p)
    const size = lerp(0.17, 0.62, swell) + blast * 26
    const z = lerp(0, 5.4, blast * blast)
    g.position.set(0, 0, z)
    g.scale.setScalar(size)
    g.quaternion.copy(camera.quaternion) // always square to the lens

    const u = material.uniforms
    u.uIntensity.value = (spark * 7 + blast * 38) * gain
    u.uCore.value = lerp(1, 0.25, blast)
    ;(u.uColor.value as THREE.Color).setRGB(1, lerp(0.78, 0.95, blast), lerp(0.42, 0.86, blast))

    // a distant point of light only reads as a point of light with bloom on it
    film.bloomBias = Math.max(film.bloomBias, spark * 0.9 + blast * 2.2)
  })

  return (
    <mesh ref={mesh} material={material} visible={false} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}

function Mantra() {
  const mesh = useRef<THREE.Mesh>(null)
  const { camera } = useThree()

  const geometry = useMemo(
    () =>
      devanagariGeometry('invocation', {
        // deep, because the camera has to fly *through* this and the interior
        // walls whipping past are the shot
        depth: 0.55,
        bevel: 0.02,
        bevelSegments: 3,
        curveSegments: 6,
      }),
    [],
  )

  const material = useMemo(() => {
    const m = goldMaterial({ roughness: 0.2, envMapIntensity: 1.3 })
    m.emissive = new THREE.Color('#ff9d3a')
    m.emissiveIntensity = 0
    return m
  }, [])

  const worldWidth = useMemo(() => {
    geometry.computeBoundingBox()
    const b = geometry.boundingBox!
    return b.max.x - b.min.x
  }, [geometry])

  useFrame(() => {
    const g = mesh.current
    if (!g || !g.parent?.visible) return

    const p = film.p.shunya
    if (p < 0.46) {
      g.visible = false
      return
    }
    g.visible = true

    const cam = camera as THREE.PerspectiveCamera
    const shot = prologueMantra(p, worldWidth, cam.fov, film.aspect, film.portrait)

    g.position.set(0, 0, cam.position.z - shot.distance)
    g.rotation.set(0, film.reducedMotion ? 0 : shot.yaw, 0)

    // TRAP 11 — glow is a function of apparent size, not of scroll progress.
    // A speck needs to burn; a legible form needs to stop burning and be metal,
    // which means the emissive has to reach zero, not merely get small.
    material.emissiveIntensity = shot.shine * 4
    material.roughness = lerp(0.24, 0.15, shot.shine)
    film.bloomBias = Math.max(film.bloomBias, shot.shine * 1.2)
  })

  return <mesh ref={mesh} geometry={geometry} material={material} visible={false} />
}

export default function Shunya() {
  return (
    <>
      <Ignition />
      <Mantra />
    </>
  )
}
