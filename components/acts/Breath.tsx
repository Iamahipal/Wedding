'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { film, STATION } from '@/lib/film'
import { clamp01, mulberry32, smootherstep, smoothstep, visibleWidthAt } from '@/lib/math'
import { sampleOutlinePoints, outlineAspectRatio } from '@/lib/sampleOutline'
import { simplex3d } from '@/lib/shaders/noise'

/* ── प्राण — the breath ──────────────────────────────────────────────────────
 *
 * वायु is not weather. In the Veda it is the vital breath — प्राणाद्वायुरजायत,
 * "from the breath, wind was born" — and it is the one element you cannot see.
 * You only ever know air by what it moves.
 *
 * So this does not draw air. It draws two breaths: one current from each
 * household, winding around one another in a double helix, pinching close at
 * the centre and never touching. That gap is the act's subject — the space
 * between two people.
 *
 * At the apex, particles from *both* streams settle into प्राण and hold, then
 * the breath moves on and the word scatters.
 *
 * It is deliberately the inverse of the opening. Shunya gives you the mantra as
 * solid extruded gold, permanent and walked through. This gives you a word that
 * exists only while breath sustains it — which is what शब्द is: sound lives on
 * the breath and then is gone.
 * -------------------------------------------------------------------------- */

const vertex = /* glsl */ `
  attribute vec3  aSeed;
  attribute vec3  aTarget;   // where this mote lands inside प्राण
  attribute float aStream;   // 0 or 1 — which household's breath
  attribute float aSize;
  attribute float aPhase;

  uniform float uTime;
  uniform float uResolve;    // 0 = flowing, 1 = holding the word
  uniform float uFade;
  uniform float uSpan;       // world width the current travels across
  uniform float uRadius;     // helix radius at its widest
  uniform float uWordScale;
  uniform float uHeightScale;

  varying float vStream;
  varying float vAlpha;
  varying float vHot;

  ${simplex3d}

  void main() {
    /* ── the flow ──────────────────────────────────────────────────────────
     * Each mote runs a loop along the current. Fading it in and out across
     * that loop is what lets the stream recycle endlessly without a seam —
     * a hard wrap at the end of the span pops, and the eye finds it at once.
     * ------------------------------------------------------------------- */
    float life = fract(aPhase + uTime * (0.045 + aSeed.x * 0.03));
    float x = (life - 0.5) * uSpan;

    // The two breaths wind around a shared axis, half a turn apart. The radius
    // pinches at the centre: they come close, and do not meet.
    float turns = 2.4;
    float ang = life * 6.2831 * turns + aStream * 3.14159 + aPhase * 0.6;
    float pinch = 0.30 + 0.70 * smoothstep(0.0, 0.42, abs(life - 0.5));
    float r = uRadius * pinch * (0.55 + aSeed.y * 0.45);

    vec3 flow = vec3(x, sin(ang) * r, cos(ang) * r * 0.75);

    // turbulence, so it reads as breath rather than as a wire helix
    vec3 q = flow * 0.16 + vec3(uTime * 0.15, aPhase * 4.0, 0.0);
    flow += vec3(snoise(q), snoise(q + 11.3), snoise(q + 27.7)) * (0.5 + aSeed.z * 0.8);

    /* ── the word ──────────────────────────────────────────────────────────
     * Staggered per particle, so प्राण assembles out of the air rather than
     * snapping into place all at once.
     * ------------------------------------------------------------------- */
    float stagger = clamp((uResolve * 1.45) - aPhase * 0.45, 0.0, 1.0);
    float settle = smoothstep(0.0, 1.0, stagger);
    vec3 held = aTarget * uWordScale;

    vec3 pos = mix(flow, held, settle);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    // Motes *tighten* as they settle rather than swelling. Swelling them was
    // the obvious choice and it is wrong: twenty-six thousand additive sprites
    // packed into a letterform already saturate, and making each one bigger
    // turns the word into a glowing slab with no strokes left in it.
    gl_PointSize = clamp(aSize * uHeightScale * (1.0 - settle * 0.35) / max(-mv.z, 1.0), 0.7, 22.0);

    vStream = aStream;
    vHot = settle;
    // motes fade in and out along their loop; while the word is held they all
    // burn steadily, or the letterform would flicker
    vAlpha = mix(sin(life * 3.14159), 1.0, settle) * uFade;
    gl_Position = projectionMatrix * mv;
  }
`

const fragment = /* glsl */ `
  precision highp float;
  varying float vStream;
  varying float vAlpha;
  varying float vHot;
  uniform vec3 uWarm;   // one household
  uniform vec3 uCool;   // the other
  uniform vec3 uHeld;   // what they become together

  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d) * 2.0;
    if (r > 1.0) discard;

    float core = pow(max(0.0, 1.0 - r), 3.0);
    float halo = exp(-r * 2.8) - exp(-2.8);
    float a = (core + halo * 0.4) * vAlpha;
    if (a < 0.004) discard;

    vec3 col = mix(uWarm, uCool, vStream);
    // the two breaths become one colour exactly as they become one word
    col = mix(col, uHeld, vHot * 0.85);
    gl_FragColor = vec4(col * a, a);
  }
`

const STATION_Z = STATION.vayu[2]

export default function Breath() {
  const points = useRef<THREE.Points>(null)

  const { geometry, material, wordAspect } = useMemo(() => {
    const count = film.lowEnd ? 9000 : 26000
    const rand = mulberry32(0x62ea7)

    const seed = new Float32Array(count * 3)
    const stream = new Float32Array(count)
    const size = new Float32Array(count)
    const phase = new Float32Array(count)

    // every mote is given a home inside the letterform, so the word is built
    // from both breaths rather than one of them
    const target = sampleOutlinePoints('prana', count)

    for (let i = 0; i < count; i++) {
      seed[i * 3] = rand()
      seed[i * 3 + 1] = rand()
      seed[i * 3 + 2] = rand()
      stream[i] = i % 2
      size[i] = 0.028 + Math.pow(rand(), 2.6) * 0.1
      phase[i] = rand()
    }

    const g = new THREE.BufferGeometry()
    // `position` is unused by the shader but three requires it to size the draw
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3))
    g.setAttribute('aTarget', new THREE.BufferAttribute(target, 3))
    g.setAttribute('aStream', new THREE.BufferAttribute(stream, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 300)

    const m = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uTime: { value: 0 },
        uResolve: { value: 0 },
        uFade: { value: 0 },
        uSpan: { value: 40 },
        uRadius: { value: 3.4 },
        uWordScale: { value: 6 },
        uHeightScale: { value: 600 },
        uWarm: { value: new THREE.Color('#ffb457') },
        uCool: { value: new THREE.Color('#ffe7bd') },
        uHeld: { value: new THREE.Color('#ffd489') },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })

    return { geometry: g, material: m, wordAspect: outlineAspectRatio('prana') }
  }, [])

  useFrame(({ size: viewport, gl, camera }) => {
    if (film.on.vayu === 0) return
    const p = film.p.vayu
    const u = material.uniforms

    // one clock, advanced by real time *and* by scroll — the breath keeps
    // moving while the page is still, and still moves when it is scrubbed
    u.uTime.value = film.time * 0.6 + p * 4.5

    /**
     * The word gathers, holds, and lets go. The hold is the point of the act,
     * so it is given real room — a third of the scroll — rather than being a
     * moment the viewer can miss between two scroll flicks.
     */
    const gather = smootherstep(0.46, 0.66, p)
    const release = smootherstep(0.84, 0.97, p)
    u.uResolve.value = clamp01(gather - release)

    // The breath now carries the whole act — the cloths that used to open it
    // are gone — so it arrives early and the braid gets real time to read
    // before the word begins to gather.
    u.uFade.value = smoothstep(0.02, 0.14, p) * (1 - smoothstep(0.94, 1, p))

    /**
     * TRAP 9. The current is spanned across the *viewport* and प्राण sized as a
     * fraction of it, so a phone in portrait gets the same composition rather
     * than a word running off both edges.
     *
     * The distance has to be the camera's *actual* one, measured every frame.
     * Sizing against a fixed guess is what made the first version overflow the
     * frame: Vayu's camera dollies from sixteen units to five and a half, so a
     * word scaled for eleven is nearly twice the size it should be by the time
     * the hold arrives — and the error is invisible until exactly the moment
     * the word is supposed to be readable.
     */
    const dist = Math.max(camera.position.z - STATION_Z, 1)
    const w = visibleWidthAt(dist, film.fov, film.aspect)
    u.uSpan.value = w * 2.1
    u.uRadius.value = w * (film.portrait ? 0.22 : 0.16)
    u.uWordScale.value = (w * (film.portrait ? 0.66 : 0.4)) / wordAspect

    const h = viewport.height * gl.getPixelRatio()
    u.uHeightScale.value = (h * 0.5) / Math.tan((film.fov * Math.PI) / 360)

    // the held word is the brightest thing in the act
    film.bloomBias = Math.max(film.bloomBias, u.uResolve.value * 0.2)
  })

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
}
