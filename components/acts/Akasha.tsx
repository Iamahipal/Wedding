'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { film } from '@/lib/film'
import { buildNakshatras } from '@/lib/nakshatra'
import { clamp01, lerp, mulberry32, smootherstep, smoothstep, visibleHeightAt, visibleWidthAt } from '@/lib/math'
import { couple } from '@/lib/content'

/* ── आकाश — ether ────────────────────────────────────────────────────────────
 *
 * Through the letterforms and out into deep space. A field of stars resolves
 * into the 27 nakshatras, the lunar mansions, with the constellation lines
 * drawing themselves between the points. Two stars — the couple's birth
 * nakshatras — drift across the sky and align.
 *
 * The शुभ मुहूर्त, the auspicious moment, is an astronomical event. So it is
 * shown as one: nothing announces it, two stars simply arrive at the same place.
 * -------------------------------------------------------------------------- */

const STAR_COUNT = 9000

const starVertex = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  attribute float aTint;

  uniform float uTime;
  uniform float uHeightScale;
  uniform float uFade;

  varying float vTint;
  varying float vAlpha;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float dist = -mv.z;

    // twinkle: slow, and out of phase per star, so the field never pulses
    float tw = 0.72 + 0.28 * sin(uTime * (0.5 + aSeed * 1.7) + aSeed * 43.0);

    // perspective size attenuation — this is what turns a flat scatter of dots
    // into a field with depth as the camera dollies through it
    gl_PointSize = clamp(aSize * uHeightScale / max(dist, 1.0), 0.7, 26.0);

    vTint = aTint;
    vAlpha = tw * uFade * smoothstep(2.0, 14.0, dist);
    gl_Position = projectionMatrix * mv;
  }
`

const starFragment = /* glsl */ `
  precision highp float;
  varying float vTint;
  varying float vAlpha;
  uniform vec3 uWarm;
  uniform vec3 uCool;

  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d) * 2.0;
    if (r > 1.0) discard;

    float core = pow(max(0.0, 1.0 - r), 3.5);
    float halo = exp(-r * 3.0) - exp(-3.0);
    float a = (core + halo * 0.35) * vAlpha;

    // warm cream through to gold. never blue — a "cool" star here is simply a
    // whiter one, which is what keeps the palette intact at this scale.
    vec3 col = mix(uCool, uWarm, vTint);
    gl_FragColor = vec4(col * a, a);
  }
`

/** The deep field: thousands of stars in a real volume, for parallax. */
function Starfield() {
  const points = useRef<THREE.Points>(null)

  const { geometry, material } = useMemo(() => {
    const rand = mulberry32(0xa17a5)
    const pos = new Float32Array(STAR_COUNT * 3)
    const size = new Float32Array(STAR_COUNT)
    const seed = new Float32Array(STAR_COUNT)
    const tint = new Float32Array(STAR_COUNT)

    for (let i = 0; i < STAR_COUNT; i++) {
      // a deep shell rather than a sphere — the camera travels into it
      const z = -25 - Math.pow(rand(), 0.55) * 520
      const spread = 0.62 * -z
      pos[i * 3] = (rand() - 0.5) * spread * 2.2
      pos[i * 3 + 1] = (rand() - 0.5) * spread * 1.5
      pos[i * 3 + 2] = z

      // a few big ones carry the field; most are dust
      const r = rand()
      size[i] = r > 0.985 ? 0.5 + rand() * 0.7 : 0.06 + rand() * 0.2
      seed[i] = rand()
      tint[i] = Math.pow(rand(), 2.2) // mostly cream, occasionally gold
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    g.setAttribute('aTint', new THREE.BufferAttribute(tint, 1))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -280), 900)

    const m = new THREE.ShaderMaterial({
      vertexShader: starVertex,
      fragmentShader: starFragment,
      uniforms: {
        uTime: { value: 0 },
        uHeightScale: { value: 600 },
        uFade: { value: 1 },
        uWarm: { value: new THREE.Color('#ffcb72') },
        uCool: { value: new THREE.Color('#fff6e4') },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })

    return { geometry: g, material: m }
  }, [])

  useFrame(({ size: viewport, gl }) => {
    if (film.on.akasha === 0) return
    const u = material.uniforms
    u.uTime.value = film.time
    // world-unit sizes → pixels, so a star is the same apparent size on every
    // screen and every pixel ratio
    const h = viewport.height * gl.getPixelRatio()
    u.uHeightScale.value = (h * 0.5) / Math.tan((film.fov * Math.PI) / 360)
    u.uFade.value = smoothstep(0, 0.08, film.p.akasha) * (1 - smoothstep(0.94, 1, film.p.akasha))
  })

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
}

const lineVertex = /* glsl */ `
  attribute float aT;      // 0..1 along this constellation's polyline
  attribute float aOrder;  // 0..1 — which constellation, in draw order
  varying float vT;
  varying float vOrder;
  void main() {
    vT = aT;
    vOrder = aOrder;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const lineFragment = /* glsl */ `
  precision highp float;
  varying float vT;
  varying float vOrder;
  uniform float uDraw;
  uniform float uWindow;
  uniform float uFade;
  uniform vec3  uColor;

  void main() {
    // each constellation starts drawing when the playhead reaches its slot, and
    // the line reveals itself along its own length rather than fading in whole
    float local = (uDraw - vOrder * (1.0 - uWindow)) / uWindow;
    float drawn = step(vT, local);
    if (drawn < 0.5) discard;

    // the freshly drawn tip is brighter than the settled line behind it
    float tip = 1.0 - smoothstep(0.0, 0.22, local - vT);
    float a = (0.34 + tip * 0.66) * uFade;
    gl_FragColor = vec4(uColor * a, a);
  }
`

/**
 * TRAP 9. The constellations are authored in a normalised space and scaled to
 * the viewport at runtime, rather than given world coordinates that happen to
 * compose well on a laptop. A phone in portrait has less than a third of the
 * horizontal FOV, so a fixed layout would run the lunar path straight off both
 * sides of the frame.
 *
 * The scale is uniform on x and y — fitted to the *narrower* dimension —
 * because scaling each axis to its own extent would stretch every constellation
 * into a different shape on every screen.
 *
 * It lives at module scope because the two birth stars have to resolve against
 * exactly the same number: they begin their drift sitting on their own
 * mansions, and half a percent of disagreement is visible as a star floating
 * next to the constellation it is supposed to belong to.
 */
const layout = { scale: 1 }
const LAYOUT_REF_DIST = 95

function updateLayoutScale() {
  const halfW = visibleWidthAt(LAYOUT_REF_DIST, film.fov, film.aspect) * 0.5
  const halfH = visibleHeightAt(LAYOUT_REF_DIST, film.fov) * 0.5
  layout.scale = Math.min(halfW, halfH * 1.5) * 0.95
  return layout.scale
}

function Nakshatras() {
  const group = useRef<THREE.Group>(null)
  const { size: viewport } = useThree()

  const built = useMemo(() => {
    const data = buildNakshatras()

    /* stars ------------------------------------------------------------- */
    const starPos: number[] = []
    const starSize: number[] = []
    const starSeed: number[] = []
    const starTint: number[] = []

    /* lines -------------------------------------------------------------- */
    const linePos: number[] = []
    const lineT: number[] = []
    const lineOrder: number[] = []

    data.forEach((n, i) => {
      const order = i / (data.length - 1)

      for (const s of n.stars) {
        starPos.push(n.nx + s.dx, n.ny + s.dy, n.z + s.dz)
        starSize.push(0.85 + s.mag * 1.5)
        starSeed.push(s.mag)
        starTint.push(0.45 + s.mag * 0.4)
      }

      // cumulative length along the polyline, so the reveal travels at a
      // constant speed instead of racing through the short segments
      const pts = n.path.map((k) => new THREE.Vector3(n.nx + n.stars[k].dx, n.ny + n.stars[k].dy, n.z + n.stars[k].dz))
      let total = 0
      const cum = [0]
      for (let k = 1; k < pts.length; k++) {
        total += pts[k].distanceTo(pts[k - 1])
        cum.push(total)
      }
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1]
        const b = pts[k]
        linePos.push(a.x, a.y, a.z, b.x, b.y, b.z)
        lineT.push(cum[k - 1] / (total || 1), cum[k] / (total || 1))
        lineOrder.push(order, order)
      }
    })

    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3))
    starGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(starSize, 1))
    starGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(starSeed, 1))
    starGeo.setAttribute('aTint', new THREE.Float32BufferAttribute(starTint, 1))
    starGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -100), 400)

    const starMat = new THREE.ShaderMaterial({
      vertexShader: starVertex,
      fragmentShader: starFragment,
      uniforms: {
        uTime: { value: 0 },
        uHeightScale: { value: 600 },
        uFade: { value: 1 },
        uWarm: { value: new THREE.Color('#ffc35c') },
        uCool: { value: new THREE.Color('#fffaf0') },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })

    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3))
    lineGeo.setAttribute('aT', new THREE.Float32BufferAttribute(lineT, 1))
    lineGeo.setAttribute('aOrder', new THREE.Float32BufferAttribute(lineOrder, 1))
    lineGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -100), 400)

    const lineMat = new THREE.ShaderMaterial({
      vertexShader: lineVertex,
      fragmentShader: lineFragment,
      uniforms: {
        uDraw: { value: 0 },
        uWindow: { value: 0.42 },
        uFade: { value: 1 },
        uColor: { value: new THREE.Color('#c98f36') },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })

    return { starGeo, starMat, lineGeo, lineMat }
  }, [])

  useFrame(({ gl }) => {
    if (film.on.akasha === 0) return
    const p = film.p.akasha

    const s = updateLayoutScale()
    if (group.current) group.current.scale.set(s, s, 1)

    const h = viewport.height * gl.getPixelRatio()
    const heightScale = (h * 0.5) / Math.tan((film.fov * Math.PI) / 360)

    const fade = smoothstep(0.05, 0.2, p) * (1 - smoothstep(0.9, 1, p))
    const su = built.starMat.uniforms
    su.uTime.value = film.time
    su.uHeightScale.value = heightScale
    su.uFade.value = fade

    const lu = built.lineMat.uniforms
    // the lines draw themselves across the middle of the act, one mansion at a
    // time, and are all complete before the two stars meet
    lu.uDraw.value = smootherstep(0.12, 0.66, p)
    lu.uFade.value = fade * 0.9
  })

  return (
    <group ref={group}>
      <points geometry={built.starGeo} material={built.starMat} frustumCulled={false} />
      <lineSegments geometry={built.lineGeo} material={built.lineMat} frustumCulled={false} />
    </group>
  )
}

/**
 * The two birth stars. They drift toward one another across the whole act and
 * arrive together — no label, no announcement. The muhurat is the moment two
 * things are in the same place.
 */
function BirthStars() {
  const a = useRef<THREE.Mesh>(null)
  const b = useRef<THREE.Mesh>(null)
  const glow = useRef<THREE.Mesh>(null)

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          precision highp float;
          varying vec2 vUv;
          uniform float uIntensity;
          uniform vec3 uColor;
          void main() {
            float r = length(vUv - 0.5) * 2.0;
            if (r > 1.0) discard;
            float core = pow(max(0.0, 1.0 - r), 5.0);
            float halo = exp(-r * 2.6) - exp(-2.6);
            float av = core + halo * 0.5;
            gl_FragColor = vec4(uColor * av * uIntensity, av);
          }
        `,
        uniforms: {
          uIntensity: { value: 1 },
          uColor: { value: new THREE.Color('#fff2d6') },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  )

  const flareMaterial = useMemo(() => {
    const m = material.clone()
    m.uniforms.uColor.value = new THREE.Color('#ffd18a')
    return m
  }, [material])

  const start = useMemo(() => {
    const data = buildNakshatras()
    return {
      a: data[couple.bride.nakshatra % 27],
      b: data[couple.groom.nakshatra % 27],
    }
  }, [])

  useFrame(({ camera }) => {
    if (film.on.akasha === 0) return
    const p = film.p.akasha
    const meet = smootherstep(0.42, 0.88, p)
    const s = layout.scale
    const rise = clamp01(smoothstep(0.06, 0.22, p))

    // They meet where the camera has trucked to by the end of the act, not at
    // the world origin — otherwise the one moment the act is built around
    // happens off the side of the frame.
    const tx = 13
    const ty = -0.06 * s
    const tz = -70

    const place = (mesh: THREE.Mesh | null, from: (typeof start)['a']) => {
      if (!mesh) return
      mesh.position.set(
        lerp(from.nx * s, tx, meet),
        lerp(from.ny * s, ty, meet),
        lerp(from.z, tz, meet),
      )
      mesh.quaternion.copy(camera.quaternion)
      mesh.scale.setScalar(lerp(0.9, 1.6, meet))
      ;(mesh.material as THREE.ShaderMaterial).uniforms.uIntensity.value = (1.6 + meet * 2.6) * rise
    }

    place(a.current, start.a)
    place(b.current, start.b)

    // the flare of the meeting itself — brief, and only at the very end
    if (glow.current) {
      const flare = smoothstep(0.8, 0.93, p) * (1 - smoothstep(0.95, 1, p))
      glow.current.visible = flare > 0.001
      glow.current.position.set(tx, ty, tz + 0.5)
      glow.current.quaternion.copy(camera.quaternion)
      glow.current.scale.setScalar(lerp(2, 18, flare))
      ;(glow.current.material as THREE.ShaderMaterial).uniforms.uIntensity.value = flare * 5
      film.bloomBias = Math.max(film.bloomBias, flare * 1.1)
    }
  })

  return (
    <>
      <mesh ref={a} material={material} frustumCulled={false}>
        <planeGeometry args={[1.6, 1.6]} />
      </mesh>
      <mesh ref={b} material={material} frustumCulled={false}>
        <planeGeometry args={[1.6, 1.6]} />
      </mesh>
      <mesh ref={glow} material={flareMaterial} frustumCulled={false} visible={false}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </>
  )
}

export default function Akasha() {
  return (
    <>
      <Starfield />
      <Nakshatras />
      <BirthStars />
    </>
  )
}
