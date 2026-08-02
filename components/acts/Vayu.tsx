'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { film, STATION } from '@/lib/film'
import { lerp, mulberry32, smootherstep, smoothstep, visibleHeightAt, visibleWidthAt } from '@/lib/math'
import { curlNoise, simplex3d, windField } from '@/lib/shaders/noise'

/* ── वायु — air ──────────────────────────────────────────────────────────────
 *
 * A red-gold chunni sweeps across the frame, filling it, then lifts away.
 * Marigold petals ride the same current.
 *
 * "The same current" is meant literally: the cloth's vertices and every petal
 * sample one shared curl-noise field (lib/shaders/noise.ts). Two independently
 * tuned wind functions would have looked almost right and read as two things
 * happening near each other rather than as one moving body of air.
 *
 * This act is about breath, and the space between two people.
 * -------------------------------------------------------------------------- */

const STATION_Z = STATION.vayu[2]

/* ── the chunni ───────────────────────────────────────────────────────────── */

function Chunni() {
  const mesh = useRef<THREE.Mesh>(null)

  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      // Red-gold, and it has to be fought for. Silk this reflective lit by a
      // warm-white rig lands on salmon almost immediately: the diffuse washes
      // out, the sheen goes pink, and the act quietly leaves the palette.
      // The fix is to keep the body genuinely dark and let only the folds catch
      // light — roughly half of any surface in this film should be dark, and
      // fabric is no exception.
      color: new THREE.Color('#5e1806'),
      metalness: 0.5,
      roughness: 0.4,
      sheen: 0.65,
      sheenColor: new THREE.Color('#d98a2e'),
      sheenRoughness: 0.42,
      envMapIntensity: 0.8,
      side: THREE.DoubleSide,
    })

    m.userData.uniforms = {
      uWindTime: { value: 0 },
      uWindScale: { value: 3.4 },
      uWindAmp: { value: 0.055 },
      uWindDir: { value: new THREE.Vector3(0.35, 0.16, 0) },
      uBillow: { value: 1 },
    }

    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, m.userData.uniforms)

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           ${simplex3d}
           ${curlNoise}
           ${windField}
           uniform float uBillow;

           vec3 clothAt(vec3 p, vec2 uvIn) {
             // anchored along the lower edge and freest at the top, which is
             // where a dupatta is actually held and where it actually flies
             float hold = mix(0.28, 1.0, uvIn.y);
             return p + wind(p) * hold * uBillow;
           }`,
        )
        .replace(
          '#include <beginnormal_vertex>',
          `// The normal has to be rebuilt from the *displaced* surface. Leaving
           // the plane's flat +Z normal in place lights the cloth as a flat
           // sheet no matter how much it billows — all the silhouette moves and
           // none of the shading does, which reads as a texture sliding over a
           // board rather than as fabric.
           float _e = 0.035;
           vec3 _p0 = clothAt(position, uv);
           vec3 _pu = clothAt(position + vec3(_e, 0.0, 0.0), uv + vec2(_e, 0.0));
           vec3 _pv = clothAt(position + vec3(0.0, _e, 0.0), uv + vec2(0.0, _e));
           vec3 objectNormal = normalize(cross(_pu - _p0, _pv - _p0));
           #ifdef USE_TANGENT
             vec3 objectTangent = vec3(tangent.xyz);
           #endif`,
        )
        .replace('#include <begin_vertex>', 'vec3 transformed = _p0;')
    }

    return m
  }, [])

  const geometry = useMemo(() => {
    const seg = film.lowEnd ? 40 : 72
    return new THREE.PlaneGeometry(1, 1, seg, Math.round(seg * 0.62))
  }, [])

  useFrame(({ camera }) => {
    const g = mesh.current
    if (!g || film.on.vayu === 0) return

    const p = film.p.vayu
    const u = material.userData.uniforms as Record<string, { value: number | THREE.Vector3 }>

    // one clock for the wind, advanced by real time *and* by scroll, so the air
    // keeps moving when the page is still and still moves when it is scrubbed
    u.uWindTime.value = film.time * 0.55 + p * 5.5

    /**
     * The cloth begins pressed against the lens — it is the same silk the act
     * boundary dissolved through — and then pulls back and lifts away.
     *
     * TRAP 9: it is sized from the viewport at its actual distance, not given a
     * world width. "Fills the frame" has to mean fills *this* frame.
     */
    const away = smootherstep(0.02, 0.58, p)
    const lift = smootherstep(0.6, 1, p)
    const dist = lerp(1.25, 15, away)

    const w = visibleWidthAt(dist, film.fov, film.aspect)
    const h = visibleHeightAt(dist, film.fov)
    const cover = Math.max(w, h) * lerp(2.1, 1.05, away)
    g.scale.set(cover, cover, cover)

    // displacement is authored in the plane's own unit space, so scaling the
    // cloth up to cover the frame scales the billow with it automatically
    u.uBillow.value = lerp(0.55, 1.25, away) * (1 - lift * 0.35)

    const camLocalZ = camera.position.z - STATION_Z
    g.position.set(
      lerp(0.12, -0.42, away) * w,
      lerp(-0.08, 0.35, away) * h + lift * h * 2.1,
      camLocalZ - dist,
    )
    g.rotation.set(lerp(0.18, -0.32, away), lerp(-0.55, 0.3, away), lerp(0.14, -0.3, away) - lift * 0.5)
  })

  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} />
}

/* ── the petals ───────────────────────────────────────────────────────────── */

const petalVertex = /* glsl */ `
  attribute vec3 aBase;     // position in the drift box, normalised
  attribute vec3 aAxis;     // tumble axis
  attribute float aPhase;
  attribute float aScale;
  attribute float aSpin;

  uniform float uSpread;
  uniform float uDepth;
  uniform float uTravel;
  uniform float uFade;

  varying float vAlpha;
  varying float vShade;
  varying vec2  vUv;

  mat3 axisAngle(vec3 axis, float angle) {
    float s = sin(angle), c = cos(angle), t = 1.0 - c;
    return mat3(
      t * axis.x * axis.x + c,          t * axis.x * axis.y - s * axis.z, t * axis.x * axis.z + s * axis.y,
      t * axis.x * axis.y + s * axis.z, t * axis.y * axis.y + c,          t * axis.y * axis.z - s * axis.x,
      t * axis.x * axis.z - s * axis.y, t * axis.y * axis.z + s * axis.x, t * axis.z * axis.z + c
    );
  }

  void main() {
    // Each petal has a life 0..1 along the wind. Fading it in and out over that
    // life is what lets the field recycle without a visible seam — a hard wrap
    // at the box edge pops, every time, and the eye finds it instantly.
    float life = fract(aPhase + uWindTime * 0.035);
    vAlpha = sin(life * 3.14159) * uFade;

    vec3 base = vec3(aBase.x * uSpread, aBase.y * uSpread * 0.62, aBase.z * uDepth);
    vec3 flow = wind(base * 0.06 + aPhase * 3.1);
    vec3 world = base + flow * 2.6 + uWindDir * (life - 0.5) * uTravel;

    mat3 rot = axisAngle(normalize(aAxis), aPhase * 6.2831 + uWindTime * aSpin);
    vec3 local = rot * (position * aScale);

    // a petal is a curled thing, not a flat card
    local.z += (1.0 - position.x * position.x * 4.0) * aScale * 0.22;

    vec4 mv = modelViewMatrix * vec4(world + local, 1.0);
    vShade = clamp(dot(normalize(rot * vec3(0.0, 0.0, 1.0)), normalize(vec3(0.4, 0.6, 0.7))) * 0.5 + 0.5, 0.0, 1.0);
    vUv = uv;
    gl_Position = projectionMatrix * mv;
  }
`

const petalFragment = /* glsl */ `
  precision highp float;
  varying float vAlpha;
  varying float vShade;
  varying vec2  vUv;
  uniform vec3 uDeep;
  uniform vec3 uBright;

  void main() {
    // trim the quad into a petal silhouette
    vec2 q = vUv - 0.5;
    float r = length(vec2(q.x * 2.1, q.y * 1.25));
    if (r > 0.5) discard;

    float edge = smoothstep(0.5, 0.24, r);
    vec3 col = mix(uDeep, uBright, vShade * 0.75 + edge * 0.25);
    float a = vAlpha * edge;
    if (a < 0.01) discard;
    gl_FragColor = vec4(col * a, a);
  }
`

function Petals() {
  const mesh = useRef<THREE.InstancedMesh>(null)

  const { geometry, material, count } = useMemo(() => {
    const count = film.lowEnd ? 900 : 2600
    const rand = mulberry32(0x9e77a1)

    const g = new THREE.InstancedBufferGeometry()
    const src = new THREE.PlaneGeometry(1, 0.62, 1, 1)
    g.index = src.index
    g.attributes.position = src.attributes.position
    g.attributes.uv = src.attributes.uv
    g.attributes.normal = src.attributes.normal

    const base = new Float32Array(count * 3)
    const axis = new Float32Array(count * 3)
    const phase = new Float32Array(count)
    const scale = new Float32Array(count)
    const spin = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      base[i * 3] = rand() * 2 - 1
      base[i * 3 + 1] = rand() * 2 - 1
      base[i * 3 + 2] = rand() * 2 - 1
      const a = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize()
      axis[i * 3] = a.x
      axis[i * 3 + 1] = a.y
      axis[i * 3 + 2] = a.z
      phase[i] = rand()
      scale[i] = 0.1 + Math.pow(rand(), 2) * 0.26
      spin[i] = 0.4 + rand() * 1.5
    }

    g.setAttribute('aBase', new THREE.InstancedBufferAttribute(base, 3))
    g.setAttribute('aAxis', new THREE.InstancedBufferAttribute(axis, 3))
    g.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1))
    g.setAttribute('aScale', new THREE.InstancedBufferAttribute(scale, 1))
    g.setAttribute('aSpin', new THREE.InstancedBufferAttribute(spin, 1))
    g.instanceCount = count
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 400)

    const m = new THREE.ShaderMaterial({
      vertexShader: `${simplex3d}\n${curlNoise}\n${windField}\n${petalVertex}`,
      fragmentShader: petalFragment,
      uniforms: {
        uWindTime: { value: 0 },
        uWindScale: { value: 1 },
        uWindAmp: { value: 1 },
        uWindDir: { value: new THREE.Vector3(0.82, 0.34, 0.1).normalize() },
        uSpread: { value: 18 },
        uDepth: { value: 15 },
        uTravel: { value: 46 },
        uFade: { value: 0 },
        uDeep: { value: new THREE.Color('#a8380a') },
        uBright: { value: new THREE.Color('#ffb02e') },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: true,
    })

    return { geometry: g, material: m, count }
  }, [])

  useFrame(() => {
    if (film.on.vayu === 0) return
    const p = film.p.vayu
    const u = material.uniforms

    u.uWindTime.value = film.time * 0.55 + p * 5.5
    u.uFade.value = smoothstep(0.04, 0.24, p) * (1 - smoothstep(0.9, 1, p))

    // the drift box is sized to the viewport so the stream reads the same on a
    // phone as on a laptop instead of thinning out to nothing at the edges
    const ref = 14
    u.uSpread.value = visibleWidthAt(ref, film.fov, film.aspect) * 0.85
    if (mesh.current) mesh.current.position.z = 4
  })

  return <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} />
}

export default function Vayu() {
  return (
    <>
      <Chunni />
      <Petals />
    </>
  )
}
