'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import Saptapadi from './Saptapadi'
import { film, STATION } from '@/lib/film'
import { clamp01, lerp, mulberry32, smoothstep } from '@/lib/math'
import { simplex3d } from '@/lib/shaders/noise'

/* ── अग्नि — fire ────────────────────────────────────────────────────────────
 *
 * The sacred fire, and the emotional apex of the film. The camera circles it —
 * pradakshina — seven times, and the सप्तपदी resolve one at a time, each vow
 * appearing as its step is taken. Seven rotations, seven vows, one fire.
 *
 * The seven circuits are authored in lib/film.ts as the camera curve, and the
 * seven captions in Film.tsx against the same act progress, so the text and the
 * circuit can never drift apart.
 *
 * The vow *words* live in lib/content.ts, and are only ever the single Sanskrit
 * word each step is named for. The complete Saptapadi mantras are liturgical
 * text that varies by tradition, region and family; they are not approximated
 * here, and should only ever be added verbatim from the family's own pandit.
 * -------------------------------------------------------------------------- */

const ORIGIN = new THREE.Vector3(...STATION.agni)
const screenProbe = new THREE.Vector3()

/* ── the flame ────────────────────────────────────────────────────────────── */

const flameVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const flameFragment = /* glsl */ `
  precision highp float;
  varying vec3 vWorld;

  uniform vec3  uOrigin;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uHeight;
  uniform float uRadius;
  uniform float uFlare;

  ${simplex3d}

  /**
   * Three octaves, not four, and the domain warp below uses single noise
   * samples rather than nested fbm.
   *
   * The textbook version — fbm warped by three more fbm — costs about sixteen
   * noise evaluations per step. At forty steps over a flame that fills a third
   * of the frame that is several hundred million noise evaluations a frame, and
   * it does not merely drop the frame rate: it hangs the tab outright. The
   * cheap version is visually indistinguishable once it is moving and on fire.
   */
  float fbm(vec3 p) {
    float f = 0.5 * snoise(p);
    p *= 2.03;
    f += 0.25 * snoise(p);
    return f;
  }

  /** Slab intersection, so the march is bounded by the fire and not by guesswork. */
  vec2 boxHit(vec3 ro, vec3 rd, vec3 bmin, vec3 bmax) {
    vec3 inv = 1.0 / rd;
    vec3 t0 = (bmin - ro) * inv;
    vec3 t1 = (bmax - ro) * inv;
    vec3 tsm = min(t0, t1);
    vec3 tbg = max(t0, t1);
    return vec2(max(max(tsm.x, tsm.y), tsm.z), min(min(tbg.x, tbg.y), tbg.z));
  }

  /**
   * Density of the flame at a point, in fire-local space (y = 0 at the base).
   *
   * The shape is a tapering column; the *life* of it is domain warping — the
   * noise lookup is displaced by another noise field, which is what produces
   * the folding, licking motion. Straight fbm on its own gives a column of
   * boiling porridge.
   */
  float density(vec3 p, out float temp) {
    temp = 0.0;
    float h = p.y / uHeight;
    if (h < -0.02 || h > 1.0) return 0.0;

    float r = length(p.xz);

    // the column narrows and leans as it rises
    float taper = uRadius * (1.0 - smoothstep(0.0, 1.0, h) * 0.72);
    taper *= 1.0 + uFlare * 0.5;

    // Cheap rejection before any noise is touched. Most steps along most rays
    // are nowhere near the column, and skipping them here is worth more than
    // every other optimisation in this shader combined.
    if (r > taper * 1.9 + 0.28) return 0.0;

    // rising: the noise field travels downward through the flame, so the
    // detail appears to climb
    vec3 q = p * 0.85;
    q.y -= uTime * 1.35;

    vec3 w = q * 0.7;
    vec3 warp = vec3(snoise(w + 3.1), snoise(w + 8.4), snoise(w + 15.9));
    float n = fbm(q * 1.5 + warp * 1.25);

    // turbulence grows with height — the base is steady, the tips are wild.
    // Not *too* wild: past about half a radius of displacement the column
    // breaks into disconnected wisps that the low step count then samples as
    // speckle rather than as smoke.
    float turb = n * (0.16 + h * 0.62) * uRadius;
    float body = 1.0 - smoothstep(taper * 0.15, taper + turb, r);

    // fade the very top out so it dissolves instead of ending in a flat lid
    float top = 1.0 - smoothstep(0.55, 1.0, h);

    /**
     * And fade the very *bottom* in over a real distance. The flame is drawn
     * additively and the kund sits directly beneath it, so a density that
     * starts at full strength right at y=0 paints the hottest part of the fire
     * straight onto the brick — which is why the pit kept coming out white no
     * matter how dark its material was made. The material was never the
     * problem.
     */
    float base = smoothstep(0.0, 0.10, h);

    float d = clamp(body * top * base, 0.0, 1.0);

    // temperature: hottest low and central, cooling as it rises and spreads
    temp = clamp(d * (1.25 - h * 0.95) * (1.0 - r / max(taper, 0.001) * 0.45), 0.0, 1.0);
    return d;
  }

  /**
   * The white has to be earned. A ramp that reaches cream by two-thirds
   * temperature blows the whole column out under AgX and the fire stops being
   * gold at exactly the point it gets bright — the same failure ACES would have
   * caused everywhere else in this film. White lives in the top fifth only.
   */
  vec3 fireColor(float t) {
    vec3 c = mix(vec3(0.26, 0.024, 0.002), vec3(0.95, 0.20, 0.015), smoothstep(0.00, 0.32, t));
    c = mix(c, vec3(1.00, 0.52, 0.08), smoothstep(0.32, 0.62, t));
    c = mix(c, vec3(1.00, 0.78, 0.30), smoothstep(0.62, 0.84, t));
    c = mix(c, vec3(1.00, 0.95, 0.80), smoothstep(0.84, 1.00, t));
    return c;
  }

  void main() {
    vec3 ro = cameraPosition;
    vec3 rd = normalize(vWorld - cameraPosition);

    vec3 bmin = uOrigin + vec3(-uRadius * 2.6, -0.1, -uRadius * 2.6);
    vec3 bmax = uOrigin + vec3( uRadius * 2.6, uHeight,  uRadius * 2.6);
    vec2 hit = boxHit(ro, rd, bmin, bmax);
    if (hit.y <= max(hit.x, 0.0)) discard;

    float tStart = max(hit.x, 0.0);
    float span = hit.y - tStart;
    float dt = span / float(FLAME_STEPS);

    // dither the entry point per pixel — without it the fixed step size lays
    // visible concentric shells through the flame
    float jitter = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);

    vec3 col = vec3(0.0);
    float trans = 1.0;

    for (int i = 0; i < FLAME_STEPS; i++) {
      float t = tStart + (float(i) + jitter) * dt;
      vec3 p = ro + rd * t - uOrigin;

      float temp;
      float d = density(p, temp);
      if (d > 0.002) {
        vec3 emit = fireColor(temp) * d * uIntensity;
        col += emit * trans * dt;
        trans *= exp(-d * 2.3 * dt);
        if (trans < 0.012) break;
      }
    }

    float a = 1.0 - trans;
    if (a < 0.004) discard;
    gl_FragColor = vec4(col, a);
  }
`

function Flame() {
  const mesh = useRef<THREE.Mesh>(null)

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: flameVertex,
        fragmentShader: flameFragment,
        // Every pixel of the proxy quad costs a full march, so the step count is
        // the single biggest lever here. The per-pixel jitter on the entry point
        // is what makes a count this low survivable — without it, 16 steps lays
        // obvious concentric shells through the flame.
        defines: { FLAME_STEPS: film.lowEnd ? 10 : 16 },
        uniforms: {
          // lifted clear of the kund's mouth, so the fire rises *out of* the
          // pit rather than being co-located with its top surface
          uOrigin: { value: ORIGIN.clone().add(new THREE.Vector3(0, 0.12, 0)) },
          uTime: { value: 0 },
          uIntensity: { value: 1.35 },
          uHeight: { value: 4.2 },
          uRadius: { value: 1.45 },
          uFlare: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  )

  useFrame(({ camera }) => {
    const g = mesh.current
    if (!g || film.on.agni === 0) return
    const p = film.p.agni

    // The proxy quad only has to cover the flame's silhouette, and every pixel
    // of it costs a full raymarch — so it is sized to the actual bounds
    // (6 across, 4.6 tall plus headroom for the flare) rather than to a
    // comfortable square. A quad a third larger than it needs to be is a third
    // more fragments marching through empty air.
    g.position.set(0, 2.4, 0)
    g.quaternion.copy(camera.quaternion)
    g.scale.set(6.6, 6.4, 1)

    const u = material.uniforms
    u.uTime.value = film.time * 0.9 + p * 6

    /**
     * Seven circuits, seven vows — and the fire answers each one. `fract(p * 7)`
     * is the position within the current circuit, so this spikes exactly as
     * each step completes and the next vow resolves.
     */
    const circuit = p * 7
    const flare = Math.pow(clamp01(Math.sin(Math.PI * (circuit % 1))), 14)
    u.uFlare.value = flare

    const alive = smoothstep(0, 0.05, p) * (1 - smoothstep(0.95, 1, p))
    u.uIntensity.value = (1.3 + flare * 1.5) * alive

    film.bloomBias = Math.max(film.bloomBias, alive * (0.35 + flare * 0.9))

    // hand the flame's screen position to the heat-shimmer pass
    screenProbe.set(ORIGIN.x, ORIGIN.y + 1.7, ORIGIN.z).project(camera)
    film.fireScreen[0] = screenProbe.x * 0.5 + 0.5
    film.fireScreen[1] = screenProbe.y * 0.5 + 0.5
  })

  return (
    <mesh ref={mesh} material={material} frustumCulled={false} renderOrder={5}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}

/* ── the embers ───────────────────────────────────────────────────────────── */

const emberVertex = /* glsl */ `
  attribute vec3 aSeed;
  attribute float aPhase;
  attribute float aSize;

  uniform float uTime;
  uniform float uHeightScale;
  uniform float uFade;
  uniform float uRise;

  varying float vAlpha;
  varying float vHeat;

  ${simplex3d}

  void main() {
    float life = fract(aPhase + uTime * (0.055 + aSeed.x * 0.05));

    // buoyancy: embers accelerate upward as they rise, then cool and slow.
    // linear rise reads as rain running backwards.
    float climb = pow(life, 0.72);
    float y = climb * uRise;

    // and they wander — hot air is not a lift shaft
    float wob = snoise(vec3(aSeed.yz * 6.0, life * 3.0 + aPhase * 10.0));
    float spreadR = 0.35 + climb * 1.9;
    float ang = aPhase * 6.2831 + wob * 1.4 + life * 1.1;

    vec3 pos = vec3(cos(ang) * spreadR * aSeed.y, y, sin(ang) * spreadR * aSeed.z);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = clamp(aSize * uHeightScale / max(-mv.z, 1.0), 0.6, 12.0);

    // they are born white-hot and die a dull red
    vHeat = 1.0 - climb;
    vAlpha = sin(life * 3.14159) * uFade * (0.45 + aSeed.x * 0.55);
    gl_Position = projectionMatrix * mv;
  }
`

const emberFragment = /* glsl */ `
  precision highp float;
  varying float vAlpha;
  varying float vHeat;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    float a = pow(max(0.0, 1.0 - r), 2.2) * vAlpha;
    vec3 col = mix(vec3(0.85, 0.16, 0.02), vec3(1.0, 0.86, 0.55), vHeat * vHeat);
    gl_FragColor = vec4(col * a, a);
  }
`

function Embers() {
  const { geometry, material } = useMemo(() => {
    const count = film.lowEnd ? 500 : 1600
    const rand = mulberry32(0x3f1e2a)
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count * 3)
    const phase = new Float32Array(count)
    const size = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      seed[i * 3] = rand()
      seed[i * 3 + 1] = rand() * 2 - 1
      seed[i * 3 + 2] = rand() * 2 - 1
      phase[i] = rand()
      size[i] = 0.02 + Math.pow(rand(), 2.4) * 0.09
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3))
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 5, 0), 24)

    const m = new THREE.ShaderMaterial({
      vertexShader: emberVertex,
      fragmentShader: emberFragment,
      uniforms: {
        uTime: { value: 0 },
        uHeightScale: { value: 600 },
        uFade: { value: 0 },
        uRise: { value: 13 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })

    return { geometry: g, material: m }
  }, [])

  useFrame(({ size: viewport, gl }) => {
    if (film.on.agni === 0) return
    const u = material.uniforms
    u.uTime.value = film.time + film.p.agni * 8
    u.uFade.value = smoothstep(0, 0.06, film.p.agni) * (1 - smoothstep(0.94, 1, film.p.agni))
    const h = viewport.height * gl.getPixelRatio()
    u.uHeightScale.value = (h * 0.5) / Math.tan((film.fov * Math.PI) / 360)
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}

/* ── the havan kund ───────────────────────────────────────────────────────── */

/** The square brick pit the fire is built in, and the logs across it. */
function Kund() {
  const { geometry, material } = useMemo(() => {
    const parts: THREE.BufferGeometry[] = []

    /**
     * A havan kund is an inverted stepped pyramid — widest at the mouth — and
     * it is a *pit*. Built as solid slabs it reads as a wedding cake with a
     * fire on top, which is exactly what the first version looked like. The
     * upper courses are therefore rings, so the eye can see down into a recess
     * and the flame has somewhere to come from.
     */
    const ring = (outer: number, rail: number, h: number, y: number) => {
      const half = outer / 2
      const mid = half - rail / 2
      for (let s = 0; s < 4; s++) {
        const horizontal = s % 2 === 0
        const len = horizontal ? outer : outer - rail * 2
        const box = new THREE.BoxGeometry(horizontal ? len : rail, h, horizontal ? rail : len)
        box.translate(horizontal ? 0 : (s === 1 ? mid : -mid), y, horizontal ? (s === 0 ? mid : -mid) : 0)
        parts.push(box)
      }
    }

    ring(3.7, 0.52, 0.34, -0.02)
    ring(3.0, 0.46, 0.32, -0.34)

    // the floor of the pit, sunk below both courses
    const floor = new THREE.BoxGeometry(2.3, 0.22, 2.3)
    floor.translate(0, -0.62, 0)
    parts.push(floor)

    // समिधा — the sandalwood, crossed inside the mouth of the pit
    for (let i = 0; i < 4; i++) {
      const log = new THREE.CylinderGeometry(0.075, 0.09, 2.3, 6)
      log.rotateZ(Math.PI / 2)
      log.rotateY((i * Math.PI) / 2 + 0.3)
      log.translate(0, -0.16 + (i % 2) * 0.17, 0)
      parts.push(log)
    }

    // merge, because seven separate draw calls for static props is seven too
    // many in the most expensive act of the film
    const merged = mergeGeometries(parts)
    for (const p of parts) p.dispose()

    // Brick and sandalwood, not metal. A metallic kund sitting under a light
    // this close blows to flat white and steals the frame from the fire — and
    // the one thing that must be the brightest object in this act is the fire.
    // Darker again. The kund sits directly under the flame quad, which is
    // additive, so it takes the fire's glow on top of the fire's light — two
    // brightenings stacked. Every value here has to assume both.
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#2a1409'),
      metalness: 0.05,
      roughness: 0.9,
      envMapIntensity: 0.28,
    })

    return { geometry: merged, material: m }
  }, [])

  return <mesh geometry={geometry} material={material} position={[0, 0, 0]} />
}

/** Minimal geometry merge — avoids pulling in the addons util for four boxes. */
function mergeGeometries(list: THREE.BufferGeometry[]) {
  const out = new THREE.BufferGeometry()
  let vertexCount = 0
  let indexCount = 0
  for (const g of list) {
    vertexCount += g.attributes.position.count
    indexCount += g.index ? g.index.count : g.attributes.position.count
  }

  const position = new Float32Array(vertexCount * 3)
  const normal = new Float32Array(vertexCount * 3)
  const index = new Uint32Array(indexCount)

  let vo = 0
  let io = 0
  for (const g of list) {
    const p = g.attributes.position.array as Float32Array
    const n = g.attributes.normal.array as Float32Array
    position.set(p, vo * 3)
    normal.set(n, vo * 3)
    const gi = g.index
    const count = gi ? gi.count : g.attributes.position.count
    for (let i = 0; i < count; i++) index[io + i] = (gi ? gi.getX(i) : i) + vo
    vo += g.attributes.position.count
    io += count
  }

  out.setAttribute('position', new THREE.BufferAttribute(position, 3))
  out.setAttribute('normal', new THREE.BufferAttribute(normal, 3))
  out.setIndex(new THREE.BufferAttribute(index, 1))
  out.computeBoundingSphere()
  return out
}

/* ── the fire's own light ─────────────────────────────────────────────────── */

/**
 * A fire that does not light anything around it is a sprite. This throws real,
 * flickering light onto the kund — and the flicker is driven by the same clock
 * as the flame, so the light leaps when the flame leaps.
 */
function FireLight() {
  const light = useRef<THREE.PointLight>(null)

  useFrame(() => {
    const l = light.current
    if (!l || film.on.agni === 0) return
    const p = film.p.agni
    const t = film.time
    const flicker = 0.78 + 0.22 * Math.sin(t * 11.3) * Math.sin(t * 4.7 + 1.1)
    const circuit = p * 7
    const flare = Math.pow(clamp01(Math.sin(Math.PI * (circuit % 1))), 14)
    // Sits barely a unit above the kund, and three.js lights fall off as 1/d² —
    // so the intensity that looks reasonable as a number blows the brick to
    // white. This is the value the pit actually reads at, measured.
    l.intensity = (1.5 + flare * 2.2) * flicker * smoothstep(0, 0.06, p)
    l.position.set(0, 1.1 + Math.sin(t * 2.3) * 0.12, 0)
  })

  return <pointLight ref={light} color="#ff8a2b" distance={26} decay={2} />
}

export default function Agni() {
  return (
    <>
      <Kund />
      <Saptapadi />
      <Flame />
      <Embers />
      <FireLight />
    </>
  )
}
