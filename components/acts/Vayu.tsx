'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import Breath from './Breath'
import { film } from '@/lib/film'
import { mulberry32, smoothstep, visibleWidthAt } from '@/lib/math'
import { curlNoise, simplex3d, windField } from '@/lib/shaders/noise'

/* ── वायु — air ──────────────────────────────────────────────────────────────
 *
 * The act is the breath and nothing else. See Breath.tsx for what it means.
 *
 * There used to be two chunnis here, carrying the households' weaves. They are
 * gone, and deliberately: a flowing cloth is a *technique*, and however good
 * the silk was it made the act read as a demonstration of vertex displacement
 * rather than as वायु. It also opened the act on a wall of flat colour a few
 * inches from the lens, which is a bad first frame in any film.
 *
 * The leheriya and Banarasi patterns did not go to waste — they are engraved
 * into the two bands in Gathbandhan, where the two households resolve into one
 * anyway, which is a better place for them than a curtain nobody could read.
 *
 * What remains besides the breath is marigold: air is invisible, so the only
 * honest way to show it is to show what it carries.
 * -------------------------------------------------------------------------- */

const petalVertex = /* glsl */ `
  attribute vec3 aBase;
  attribute vec3 aAxis;
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
    // fading each petal in and out across its own loop is what lets the field
    // recycle without a seam — a hard wrap at the box edge pops every time
    float life = fract(aPhase + uWindTime * 0.035);
    vAlpha = sin(life * 3.14159) * uFade;

    vec3 base = vec3(aBase.x * uSpread, aBase.y * uSpread * 0.62, aBase.z * uDepth);
    vec3 flow = wind(base * 0.06 + aPhase * 3.1);
    vec3 world = base + flow * 2.6 + uWindDir * (life - 0.5) * uTravel;

    mat3 rot = axisAngle(normalize(aAxis), aPhase * 6.2831 + uWindTime * aSpin);
    vec3 local = rot * (position * aScale);
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
    const count = film.lowEnd ? 700 : 1900
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
      scale[i] = 0.08 + Math.pow(rand(), 2) * 0.2
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

    // Petals thin as प्राण gathers. They are the proof the air is moving, which
    // is the job right up until the word becomes the subject — after that they
    // are clutter in front of it.
    u.uFade.value =
      smoothstep(0.02, 0.16, p) * (1 - smoothstep(0.44, 0.62, p) * 0.8) * (1 - smoothstep(0.9, 1, p))

    const ref = 14
    u.uSpread.value = visibleWidthAt(ref, film.fov, film.aspect) * 0.85
    if (mesh.current) mesh.current.position.z = 4
  })

  return <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} />
}

export default function Vayu() {
  return (
    <>
      <Breath />
      <Petals />
    </>
  )
}
