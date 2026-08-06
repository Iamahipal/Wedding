'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { couple } from '@/lib/content'
import { devanagariGeometry } from '@/lib/extrude'
import { film } from '@/lib/film'
import { bronzeMaterial, goldMaterial } from '@/lib/gold'
import { clamp01, lerp, scaleForWidthFraction, smootherstep, smoothstep } from '@/lib/math'

/* ── पृथ्वी — earth ───────────────────────────────────────────────────────────
 *
 * Gold becomes solid. The मण्डप assembles itself out of the dark — four
 * pillars, the toran across the top. Mehndi draws itself across the floor in a
 * single continuous line. A rangoli blooms outward in radial symmetry.
 *
 * The couple's names are revealed here, in the same gold as the invocation:
 * the film's visual rhyme, opening and closing on the same material.
 * -------------------------------------------------------------------------- */

const PILLAR_SPREAD = 3.6
const worldProbe = new THREE.Vector3()

/* ── the mandap ───────────────────────────────────────────────────────────── */

function Mandap() {
  const group = useRef<THREE.Group>(null)
  const pillars = useRef<THREE.InstancedMesh>(null)
  const beams = useRef<THREE.Group>(null)
  const arc = useRef<THREE.Mesh>(null)

  const pots = useRef<THREE.Group>(null)

  const { pillar, beam, toran, kalash, elements, gold, bronze } = useMemo(() => {
    // a turned column: base, shaft, capital
    const profile = [
      [0.001, 0], [0.42, 0], [0.44, 0.12], [0.34, 0.22], [0.3, 0.34],
      [0.26, 0.5], [0.24, 2.9], [0.28, 3.05], [0.36, 3.2], [0.3, 3.34],
      [0.42, 3.5], [0.44, 3.66], [0.001, 3.7],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    const pillar = new THREE.LatheGeometry(profile, 24)

    const beam = new THREE.BoxGeometry(PILLAR_SPREAD * 2 + 0.9, 0.3, 0.34)

    // the toran: a shallow hanging arc across the front of the mandap
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-PILLAR_SPREAD, 3.42, PILLAR_SPREAD),
      new THREE.Vector3(-PILLAR_SPREAD * 0.5, 2.85, PILLAR_SPREAD),
      new THREE.Vector3(0, 2.62, PILLAR_SPREAD),
      new THREE.Vector3(PILLAR_SPREAD * 0.5, 2.85, PILLAR_SPREAD),
      new THREE.Vector3(PILLAR_SPREAD, 3.42, PILLAR_SPREAD),
    ])
    const toran = new THREE.TubeGeometry(curve, 48, 0.055, 6, false)

    /**
     * A कलश on each pillar.
     *
     * Research finding, and a better one than the one I went looking for. The
     * mandap is described as a cosmological model: pots at its four corners for
     * earth, water, fire and air, and the canopy above them as the fifth —
     * आकाश. The structure this whole film is built on turns out to be built
     * into the object the film ends in. See RESEARCH.md §6.
     *
     * I had gone looking for the four पुरुषार्थ to put on these pillars, which
     * would have rhymed with this family's four pheras. That reading is real
     * but it is one of at least four the sources give — ashramas, Vedas,
     * purusharthas, the couple's parents — and they do not reconcile. Asserting
     * one as *the* meaning would have been inventing certainty. The five
     * elements are a claim about the mandap's form rather than its symbolism,
     * and the film can make it without picking a side.
     */
    const kalash = new THREE.LatheGeometry(
      [
        [0.001, 0], [0.15, 0], [0.18, 0.05], [0.14, 0.1], [0.23, 0.2],
        [0.25, 0.31], [0.19, 0.42], [0.13, 0.48], [0.18, 0.54], [0.19, 0.58],
        [0.14, 0.57],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      20,
    )

    /**
     * Each pot carries its element's *temperature*, and every one of them stays
     * inside the gold family — water is a cooler, creamier gold and not a blue
     * one. The palette does not get an exception for being symbolic.
     */
    const elements = [
      goldMaterial({ roughness: 0.42, color: '#c98a3f', envMapIntensity: 0.85 }), // पृथ्वी
      goldMaterial({ roughness: 0.18, color: '#ffe4b0', envMapIntensity: 1.25 }), // जल
      goldMaterial({ roughness: 0.26, color: '#ffa63f', envMapIntensity: 1.2 }), // अग्नि
      goldMaterial({ roughness: 0.3, color: '#ffd89a', envMapIntensity: 1.05 }), // वायु
    ]

    return {
      pillar,
      beam,
      toran,
      kalash,
      elements,
      gold: goldMaterial({ roughness: 0.3, envMapIntensity: 1.0 }),
      bronze: bronzeMaterial({ roughness: 0.4 }),
    }
  }, [])

  const matrix = useMemo(() => new THREE.Matrix4(), [])

  useFrame(() => {
    if (film.on.prithvi === 0) return
    const p = film.p.prithvi

    /**
     * It assembles itself. Each pillar rises out of the floor on its own beat,
     * staggered around the square, so the mandap builds rather than appears —
     * and the beams only arrive once there is something to rest on.
     */
    if (pillars.current) {
      for (let i = 0; i < 4; i++) {
        const t = smootherstep(0.02 + i * 0.045, 0.3 + i * 0.045, p)
        const x = i < 2 ? -PILLAR_SPREAD : PILLAR_SPREAD
        const z = i % 2 === 0 ? -PILLAR_SPREAD : PILLAR_SPREAD
        matrix.makeScale(1, Math.max(t, 0.0001), 1)
        matrix.setPosition(x, 0, z)
        pillars.current.setMatrixAt(i, matrix)
      }
      pillars.current.instanceMatrix.needsUpdate = true
    }

    if (beams.current) {
      const t = smootherstep(0.26, 0.46, p)
      beams.current.visible = t > 0.001
      beams.current.scale.setScalar(lerp(0.86, 1, t))
      beams.current.position.y = lerp(4.6, 3.55, t)
    }

    // the pots are set on the corners once there are corners to set them on,
    // one after another, in the film's own order of the elements
    if (pots.current) {
      const kids = pots.current.children
      for (let i = 0; i < kids.length; i++) {
        const t = smootherstep(0.3 + i * 0.05, 0.44 + i * 0.05, p)
        kids[i].visible = t > 0.001
        kids[i].scale.setScalar(t)
      }
    }

    if (arc.current) {
      const t = smootherstep(0.4, 0.62, p)
      arc.current.visible = t > 0.001
      arc.current.scale.set(1, t, 1)
    }

    if (group.current) group.current.visible = p > 0.005
  })

  return (
    <group ref={group} visible={false}>
      <instancedMesh ref={pillars} args={[pillar, gold, 4]} frustumCulled={false} />

      <group ref={beams} visible={false}>
        <mesh geometry={beam} material={bronze} position={[0, 0, -PILLAR_SPREAD]} />
        <mesh geometry={beam} material={bronze} position={[0, 0, PILLAR_SPREAD]} />
        <mesh geometry={beam} material={bronze} position={[-PILLAR_SPREAD, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <mesh geometry={beam} material={bronze} position={[PILLAR_SPREAD, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      </group>

      {/* पृथ्वी · जल · अग्नि · वायु, one to a corner. The canopy overhead is
          the fifth — आकाश — and is left as space rather than as an object,
          because that is what it is. */}
      <group ref={pots}>
        {[
          [-PILLAR_SPREAD, -PILLAR_SPREAD],
          [-PILLAR_SPREAD, PILLAR_SPREAD],
          [PILLAR_SPREAD, -PILLAR_SPREAD],
          [PILLAR_SPREAD, PILLAR_SPREAD],
        ].map(([x, z], i) => (
          <mesh
            key={i}
            geometry={kalash}
            material={elements[i]}
            position={[x, 3.66, z]}
            visible={false}
          />
        ))}
      </group>

      <mesh ref={arc} geometry={toran} material={gold} visible={false} />
    </group>
  )
}

/* ── the mehndi ───────────────────────────────────────────────────────────── */

const drawVertex = /* glsl */ `
  attribute float aT;
  varying float vT;
  varying vec2 vSide;
  void main() {
    vT = aT;
    vSide = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const drawFragment = /* glsl */ `
  precision highp float;
  varying float vT;
  varying vec2 vSide;
  uniform float uDraw;
  uniform float uFade;
  uniform vec3  uColor;
  uniform vec3  uTipColor;

  void main() {
    // the line exists only up to the point the nib has reached
    if (vT > uDraw) discard;

    // soft edges across the ribbon's width, so it reads as ink rather than tape
    float edge = smoothstep(0.0, 0.32, vSide.y) * smoothstep(1.0, 0.68, vSide.y);

    // the tip is brighter — that is the whole trick that makes a line look like
    // it is being *drawn* rather than revealed by a wipe
    float tip = 1.0 - smoothstep(0.0, 0.035, uDraw - vT);
    vec3 col = mix(uColor, uTipColor, tip);
    float a = edge * uFade * (0.55 + tip * 0.45);
    if (a < 0.01) discard;
    gl_FragColor = vec4(col * a, a);
  }
`

function Mehndi() {
  const { geometry, material } = useMemo(() => {
    /**
     * One continuous line. A spiralling vine with lobes along it — the same
     * gesture a mehndi artist makes, which is why it is generated as a single
     * unbroken parametric path rather than as a collection of motifs.
     */
    const SAMPLES = 1400
    const WIDTH = 0.055
    const pos: number[] = []
    const uv: number[] = []
    const at: number[] = []
    const idx: number[] = []

    const point = (t: number) => {
      const ang = t * Math.PI * 2 * 3.4
      const rad = 1.5 + t * 6.4 + Math.sin(t * Math.PI * 2 * 17) * 0.34
      const curl = Math.sin(t * Math.PI * 2 * 41) * 0.07
      return new THREE.Vector3(
        Math.cos(ang) * (rad + curl),
        0.012,
        Math.sin(ang) * (rad + curl),
      )
    }

    let prev = point(0)
    for (let i = 0; i <= SAMPLES; i++) {
      const t = i / SAMPLES
      const p = point(t)
      const next = point(Math.min(1, t + 1 / SAMPLES))
      const dir = next.clone().sub(prev).setY(0).normalize()
      const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(WIDTH * 0.5)
      pos.push(p.x - side.x, p.y, p.z - side.z, p.x + side.x, p.y, p.z + side.z)
      uv.push(t, 0, t, 1)
      at.push(t, t)
      if (i > 0) {
        const a = (i - 1) * 2
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
      prev = p
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    geometry.setAttribute('aT', new THREE.Float32BufferAttribute(at, 1))
    geometry.setIndex(idx)
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 12)

    const material = new THREE.ShaderMaterial({
      vertexShader: drawVertex,
      fragmentShader: drawFragment,
      uniforms: {
        uDraw: { value: 0 },
        uFade: { value: 1 },
        uColor: { value: new THREE.Color('#8a5a18') },
        uTipColor: { value: new THREE.Color('#ffe0a2') },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })

    return { geometry, material }
  }, [])

  useFrame(() => {
    if (film.on.prithvi === 0) return
    const p = film.p.prithvi
    material.uniforms.uDraw.value = smoothstep(0.16, 0.66, p)
    material.uniforms.uFade.value = smoothstep(0.14, 0.24, p) * (1 - smoothstep(0.9, 1, p))
  })

  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />
}

/* ── the rangoli ──────────────────────────────────────────────────────────── */

const rangoliFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uBloom;
  uniform float uTime;
  uniform vec3  uGold;
  uniform vec3  uDeep;

  float ring(float r, float c, float w) { return smoothstep(w, 0.0, abs(r - c)); }

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    if (r > 1.0) discard;

    // it blooms outward from the centre
    if (r > uBloom) discard;

    float a = atan(p.y, p.x);

    // n-fold radial symmetry: fold the angle into one sector and everything
    // drawn inside it repeats around the circle for free
    const float N = 12.0;
    float s = 6.2831853 / N;
    float af = mod(a + s * 0.5, s) - s * 0.5;
    vec2 q = vec2(cos(af), sin(af)) * r;

    float m = 0.0;
    m += ring(r, 0.085, 0.016);
    m += ring(r, 0.13, 0.010);

    // a ring of dots
    m += smoothstep(0.032, 0.0, length(q - vec2(0.215, 0.0)));

    // the petal ring
    vec2 e = (q - vec2(0.42, 0.0)) / vec2(0.16, 0.062);
    m += smoothstep(1.0, 0.86, length(e));
    m -= smoothstep(0.86, 0.72, length(e)) * 0.75;

    // an outer scalloped border, on a finer fold
    const float N2 = 24.0;
    float s2 = 6.2831853 / N2;
    float af2 = mod(a + s2 * 0.5, s2) - s2 * 0.5;
    vec2 q2 = vec2(cos(af2), sin(af2)) * r;
    m += smoothstep(0.03, 0.0, length(q2 - vec2(0.74, 0.0)));
    m += ring(r, 0.86, 0.008);
    m += ring(r, 0.9, 0.004);

    m = clamp(m, 0.0, 1.0);
    if (m < 0.02) discard;

    // the leading edge of the bloom glows
    float front = 1.0 - smoothstep(0.0, 0.09, uBloom - r);
    vec3 col = mix(uDeep, uGold, m) + uGold * front * 0.8;
    float alpha = m * (0.72 + front * 0.28);
    gl_FragColor = vec4(col * alpha, alpha);
  }
`

function Rangoli() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: rangoliFragment,
        uniforms: {
          uBloom: { value: 0 },
          uTime: { value: 0 },
          uGold: { value: new THREE.Color('#e7b357') },
          uDeep: { value: new THREE.Color('#6d3a0c') },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  )

  useFrame(() => {
    if (film.on.prithvi === 0) return
    const p = film.p.prithvi
    material.uniforms.uTime.value = film.time
    material.uniforms.uBloom.value = smootherstep(0.3, 0.72, p)
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} material={material} renderOrder={1}>
      <planeGeometry args={[7.2, 7.2]} />
    </mesh>
  )
}

/* ── the names ────────────────────────────────────────────────────────────── */

/**
 * The visual rhyme. Same pipeline, same extrusion, same gold as the invocation
 * seven acts ago — the film opens and closes on the same material, which is the
 * only reason the ending feels like an ending rather than a stop.
 */
function Names() {
  const group = useRef<THREE.Group>(null)
  const bride = useRef<THREE.Mesh>(null)
  const groom = useRef<THREE.Mesh>(null)
  const { camera } = useThree()

  const built = useMemo(() => {
    const opts = { depth: 0.2, bevel: 0.018, bevelSegments: 3, curveSegments: 5 }
    const b = devanagariGeometry(couple.bride.devanagariKey, opts)
    const g = devanagariGeometry(couple.groom.devanagariKey, opts)
    const width = (geo: THREE.BufferGeometry) => {
      geo.computeBoundingBox()
      const bb = geo.boundingBox!
      return bb.max.x - bb.min.x
    }
    const material = goldMaterial({ roughness: 0.22, envMapIntensity: 1.2 })
    return { b, g, bw: width(b), gw: width(g), material }
  }, [])

  useFrame(() => {
    if (film.on.prithvi === 0) return
    const p = film.p.prithvi
    const reveal = smootherstep(0.6, 0.9, p)

    if (group.current) {
      group.current.visible = reveal > 0.001
      /**
       * Forward of the *front* pillars, not merely the rear ones.
       *
       * The names sat at z = 2.4 with the front pillars at z = 3.6, so both
       * ends of the pair were being cut in half by gold columns — निहारिका lost
       * its first letter and महिपाल its last. The comment claimed the glyphs
       * were clear of the structure; they were behind two thirds of it.
       *
       * They now sit in front of the whole mandap and occlude it, which is also
       * the right reading: this is the moment the names arrive, and nothing
       * should be in front of them.
       */
      group.current.position.set(0, lerp(1.75, 1.95, reveal), PILLAR_SPREAD + 1.7)
      // face the camera squarely — these have to be read, not admired at an angle
      group.current.quaternion.copy(camera.quaternion)
    }

    /**
     * TRAP 9 again: sized as a fraction of the viewport width, so the names are
     * legible on a phone instead of running off both edges.
     *
     * The distance must be measured in *world* space. The group's own
     * `position` is local to the act's station, which is two and a half
     * thousand units from the origin — measuring against that inflated the
     * names by a factor of roughly 250 and put them somewhere off in the dark.
     */
    group.current?.getWorldPosition(worldProbe)
    const dist = Math.max(camera.position.distanceTo(worldProbe), 1)
    const frac = film.portrait ? 0.34 : 0.19

    if (bride.current) {
      const s = scaleForWidthFraction(built.bw, frac, dist, film.fov, film.aspect)
      bride.current.scale.setScalar(s * lerp(0.94, 1, reveal))
      bride.current.position.set(-s * built.bw * 0.62, 0, 0)
    }
    if (groom.current) {
      const s = scaleForWidthFraction(built.gw, frac, dist, film.fov, film.aspect)
      groom.current.scale.setScalar(s * lerp(0.94, 1, reveal))
      groom.current.position.set(s * built.gw * 0.62, 0, 0)
    }

    built.material.emissiveIntensity = 0
    film.bloomBias = Math.max(film.bloomBias, reveal * 0.25)
  })

  return (
    <group ref={group} visible={false}>
      <mesh ref={bride} geometry={built.b} material={built.material} />
      <mesh ref={groom} geometry={built.g} material={built.material} />
    </group>
  )
}

export default function Prithvi() {
  return (
    <>
      <Mandap />
      <Mehndi />
      <Rangoli />
      <Names />
    </>
  )
}
