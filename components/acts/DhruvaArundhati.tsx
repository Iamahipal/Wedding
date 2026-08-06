'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { film } from '@/lib/film'
import { smootherstep, smoothstep, visibleHeightAt, visibleWidthAt } from '@/lib/math'

/* ── ध्रुव दर्शन · अरुन्धती दर्शन ────────────────────────────────────────────
 *
 * After the vows are taken, the groom shows the bride two stars.
 *
 * First **ध्रुव** — the pole star, the one point in the sky that never moves,
 * around which everything else turns. Be steadfast like Dhruva.
 *
 * Then **अरुन्धती** — the faint star sitting immediately beside Vasishtha in
 * the सप्तर्षि, the Seven Sages. Arundhati was Vasishtha's wife; the pair are
 * shown as the model of a marriage. In the sky they are Alcor and Mizar, a
 * genuine naked-eye double in the handle of the Plough.
 *
 * This replaces what the act used to do, which was two invented "birth
 * nakshatras" drifting together. That was astrologically plausible and was not
 * a rite — nobody performs it. This is a real one, it is performed at the
 * wedding, and it is performed by *looking at these exact stars*.
 *
 * The finding it turns on: the sky is already correct. Arundhati does not need
 * to travel across the heavens to meet Vasishtha, because she is already
 * beside him. The act stops staging a convergence and reveals a fact instead,
 * which is both truer and a better thing to say at a wedding.
 * -------------------------------------------------------------------------- */

/**
 * सप्तर्षि — the Seven Sages, the asterism the West calls the Plough or Big
 * Dipper, in normalised units. Bowl first, then the handle.
 *
 * Kratu · Pulaha · Pulastya · Atri · Angiras · Vasishtha · Marichi
 */
const SAPTARISHI: [number, number][] = [
  [0.0, 0.55], // Kratu      (Dubhe)   — a pointer star
  [0.02, 0.2], // Pulaha     (Merak)   — a pointer star
  [0.32, 0.12], // Pulastya  (Phecda)
  [0.36, 0.42], // Atri      (Megrez)
  [0.62, 0.5], // Angiras    (Alioth)
  [0.86, 0.58], // Vasishtha (Mizar)   — Arundhati sits beside this one
  [1.12, 0.44], // Marichi   (Alkaid)
]

const VASISHTHA = 5
/** Alcor, a whisker from Mizar. The proximity is the whole point. */
const ARUNDHATI: [number, number] = [0.887, 0.612]

/**
 * ध्रुव. Found by running a line through the two pointer stars of the bowl and
 * following it — which is exactly the gesture the groom makes, so the film
 * draws that line rather than simply lighting the star.
 */
/**
 * Compressed. In the real sky Dhruva sits about five pointer-lengths beyond
 * Dubhe, which put it clean off the top of the frame and left the act showing
 * a line running out of shot toward a star nobody could see. The direction is
 * kept honest; the distance is foreshortened so the gesture and its object are
 * in the same image.
 */
const DHRUVA: [number, number] = [-0.06, 1.2]

const starVert = /* glsl */ `
  attribute float aSize;
  attribute float aBright;
  uniform float uHeightScale;
  uniform float uTime;
  varying float vB;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // Dhruva does not twinkle. Everything else in the sky may.
    float tw = mix(0.78 + 0.22 * sin(uTime * 1.6 + position.x * 9.0), 1.0, step(0.99, aBright));
    gl_PointSize = clamp(aSize * uHeightScale * (0.55 + aBright * 0.75) / max(-mv.z, 1.0), 0.8, 30.0);
    vB = aBright * tw;
    gl_Position = projectionMatrix * mv;
  }
`

const starFrag = /* glsl */ `
  precision highp float;
  varying float vB;
  uniform vec3 uColor;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d) * 2.0;
    if (r > 1.0) discard;
    float core = pow(max(0.0, 1.0 - r), 3.2);
    float halo = exp(-r * 2.6) - exp(-2.6);
    float a = (core + halo * 0.45) * vB;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor * a, a);
  }
`

const lineVert = /* glsl */ `
  attribute float aT;
  attribute float aGroup;   // 0 = the asterism, 1 = the pointer to Dhruva
  varying float vT;
  varying float vGroup;
  void main() {
    vT = aT; vGroup = aGroup;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const lineFrag = /* glsl */ `
  precision highp float;
  varying float vT;
  varying float vGroup;
  uniform float uDrawA;
  uniform float uDrawB;
  uniform vec3 uColor;
  void main() {
    float draw = mix(uDrawA, uDrawB, step(0.5, vGroup));
    if (vT > draw) discard;
    // the pointer is fainter than the asterism — it is a gesture, not a figure
    float a = mix(0.42, 0.2, step(0.5, vGroup));
    a *= 1.0 - smoothstep(0.0, 0.3, draw - vT) * 0.35;
    gl_FragColor = vec4(uColor * a, a);
  }
`

export default function DhruvaArundhati() {
  const group = useRef<THREE.Group>(null)
  const wheel = useRef<THREE.Group>(null)

  const built = useMemo(() => {
    const pts = [...SAPTARISHI, ARUNDHATI, DHRUVA]
    const Z = -62

    const pos = new Float32Array(pts.length * 3)
    const size = new Float32Array(pts.length)
    const bright = new Float32Array(pts.length)
    pts.forEach(([x, y], i) => {
      pos[i * 3] = x - 0.5
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = Z
      // Arundhati is genuinely faint — that is why she is worth pointing out
      size[i] = i === 7 ? 0.85 : i === 8 ? 1.9 : 1.35
    })

    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    starGeo.setAttribute('aBright', new THREE.BufferAttribute(bright, 1))
    starGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, Z), 60)

    const starMat = new THREE.ShaderMaterial({
      vertexShader: starVert,
      fragmentShader: starFrag,
      uniforms: {
        uHeightScale: { value: 600 },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#fff4dd') },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })

    /* lines: the asterism, then the pointer running out to Dhruva */
    const lp: number[] = []
    const lt: number[] = []
    const lg: number[] = []

    let run = 0
    const total = SAPTARISHI.reduce((acc, cur, i) => {
      if (i === 0) return 0
      const [px, py] = SAPTARISHI[i - 1]
      return acc + Math.hypot(cur[0] - px, cur[1] - py)
    }, 0)
    for (let i = 1; i < SAPTARISHI.length; i++) {
      const a = SAPTARISHI[i - 1]
      const b = SAPTARISHI[i]
      const seg = Math.hypot(b[0] - a[0], b[1] - a[1])
      lp.push(a[0] - 0.5, a[1], Z, b[0] - 0.5, b[1], Z)
      lt.push(run / total, (run + seg) / total)
      lg.push(0, 0)
      run += seg
    }

    // Merak → Dubhe → Dhruva: the line you actually follow to find the pole
    const m = SAPTARISHI[1]
    const d = SAPTARISHI[0]
    lp.push(m[0] - 0.5, m[1], Z, d[0] - 0.5, d[1], Z)
    lt.push(0, 0.18)
    lg.push(1, 1)
    lp.push(d[0] - 0.5, d[1], Z, DHRUVA[0] - 0.5, DHRUVA[1], Z)
    lt.push(0.18, 1)
    lg.push(1, 1)

    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3))
    lineGeo.setAttribute('aT', new THREE.Float32BufferAttribute(lt, 1))
    lineGeo.setAttribute('aGroup', new THREE.Float32BufferAttribute(lg, 1))
    lineGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, Z), 60)

    const lineMat = new THREE.ShaderMaterial({
      vertexShader: lineVert,
      fragmentShader: lineFrag,
      uniforms: {
        uDrawA: { value: 0 },
        uDrawB: { value: 0 },
        uColor: { value: new THREE.Color('#d8ab5c') },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })

    return { starGeo, starMat, lineGeo, lineMat, brightAttr: starGeo.attributes.aBright as THREE.BufferAttribute }
  }, [])

  useFrame(({ size: viewport, gl }) => {
    if (film.on.akasha === 0) return
    const p = film.p.akasha

    /* ── the reveal ──────────────────────────────────────────────────────
     * The asterism first, then the pointer running out from its bowl, then
     * Dhruva at the end of that line, and only then Arundhati — which is the
     * order the gesture is actually made in.
     * ------------------------------------------------------------------ */
    const sages = smootherstep(0.34, 0.58, p)
    const pointer = smootherstep(0.56, 0.72, p)
    const dhruva = smootherstep(0.68, 0.82, p)
    const arundhati = smootherstep(0.82, 0.95, p)
    const out = 1 - smoothstep(0.96, 1, p)

    const b = built.brightAttr
    for (let i = 0; i < 7; i++) b.setX(i, sages * 0.85 * out)
    b.setX(7, arundhati * 0.95 * out)
    // exactly 1.0 marks Dhruva as the star that must not twinkle
    b.setX(8, dhruva * out)
    b.needsUpdate = true

    built.starMat.uniforms.uTime.value = film.time
    const h = viewport.height * gl.getPixelRatio()
    built.starMat.uniforms.uHeightScale.value = (h * 0.5) / Math.tan((film.fov * Math.PI) / 360)

    built.lineMat.uniforms.uDrawA.value = sages * out
    built.lineMat.uniforms.uDrawB.value = pointer * out

    // TRAP 9 — fitted to the viewport, like the nakshatra band
    const g = group.current
    if (g) {
      const dist = 96
      const halfW = visibleWidthAt(dist, film.fov, film.aspect) * 0.5
      const halfH = visibleHeightAt(dist, film.fov) * 0.5
      const s = Math.min(halfW, halfH * 1.35) * 0.5
      g.scale.set(s, s, 1)
      // dropped so the asterism *and* the pole star it points at both sit in
      // frame — the whole rite is the relationship between the two
      g.position.set(halfW * 0.26, -halfH * 0.46, 0)
    }

    /**
     * And the sky turns around Dhruva — very slowly, and about the pole star
     * itself rather than the scene origin. That is the entire meaning of the
     * rite rendered as motion: everything moves, that one does not.
     */
    if (wheel.current) wheel.current.rotation.z = film.time * 0.012 * dhruva

    film.bloomBias = Math.max(film.bloomBias, dhruva * 0.35 + arundhati * 0.2)
  })

  return (
    <group ref={group}>
      <group ref={wheel} position={[DHRUVA[0] - 0.5, DHRUVA[1], 0]}>
        <group position={[-(DHRUVA[0] - 0.5), -DHRUVA[1], 0]}>
          <points geometry={built.starGeo} material={built.starMat} frustumCulled={false} />
          <lineSegments geometry={built.lineGeo} material={built.lineMat} frustumCulled={false} />
        </group>
      </group>
    </group>
  )
}
