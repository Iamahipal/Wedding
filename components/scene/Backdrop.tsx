'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { film } from '@/lib/film'

/**
 * The void.
 *
 * A *warm* black — a low gold-brown haze, never flat #000. Flat black gives the
 * tone mapper nothing at the edges and the corners read as dead patches rather
 * than as space. This also stands in for the vignette we are deliberately not
 * using (TRAP 13): the falloff is in the world, so it has parallax, and Agni's
 * circling camera sweeps through it instead of dragging four dark corners along.
 *
 * The dither is not optional. A gradient this dark banded into visible rings on
 * an 8-bit display is the single most obvious way to look cheap.
 */
const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragment = /* glsl */ `
  precision highp float;
  varying vec3 vDir;
  uniform float uTime;
  uniform float uWarmth;
  uniform float uExposure;
  uniform float uLift;
  uniform vec3  uDeep;
  uniform vec3  uHaze;

  // cheap hash for the dither
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec3 d = normalize(vDir);

    // a broad, soft pool of gold-brown low in the frame, falling to almost
    // nothing overhead and behind
    float elev = d.y * 0.5 + 0.5;
    float pool = pow(1.0 - elev, 2.2);
    float front = pow(max(0.0, -d.z) * 0.5 + 0.5, 3.0);

    vec3 deep  = uDeep;
    vec3 haze  = uHaze;
    haze = mix(haze, haze * vec3(1.10, 0.94, 0.80), clamp((uWarmth - 1.0) * 3.0, -1.0, 1.0));

    float amount = clamp(pool * 0.75 + front * 0.35, 0.0, 1.0);
    vec3 col = mix(deep, haze, amount) * uExposure;
    col += haze * uLift;

    // very slow breathing so the void is never a still image
    col *= 0.94 + 0.06 * sin(uTime * 0.13 + d.x * 1.7);

    // dither: ±1/255 of noise, which is invisible but destroys the banding
    float n = hash(gl_FragCoord.xy + fract(uTime));
    col += (n - 0.5) * (1.6 / 255.0);

    // linear out — the composer owns tone mapping and the output transform
    gl_FragColor = vec4(max(col, 0.0), 1.0);
  }
`

export default function Backdrop() {
  const mesh = useRef<THREE.Mesh>(null)

  /**
   * The material is constructed here rather than declared as <shaderMaterial
   * uniforms={...} />, and that is not a style preference.
   *
   * R3F does not adopt a `uniforms` object by reference — it merges the values
   * into the material's own. The object you memoised is therefore *not* the one
   * the shader reads, so every per-frame `uniforms.uTime.value = …` writes into
   * an orphan and silently does nothing: initial values look right, and every
   * animation driven through them is dead. Owning the instance removes the
   * question entirely.
   */
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: {
          uTime: { value: 0 },
          uWarmth: { value: 1 },
          uExposure: { value: 1 },
          uLift: { value: 0 },
          // measured against the tone mapper rather than guessed: the void sits
          // just far enough above zero that the corners read as space
          uDeep: { value: new THREE.Vector3(0.0016, 0.001, 0.0005) },
          uHaze: { value: new THREE.Vector3(0.018, 0.0097, 0.0038) },
        },
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    [],
  )

  useFrame(({ camera }) => {
    const u = material.uniforms
    u.uTime.value = film.time
    u.uWarmth.value = film.damped.warmth
    u.uExposure.value = film.damped.exposure
    if (mesh.current) mesh.current.position.copy(camera.position)
  })

  return (
    <mesh ref={mesh} name="backdrop" material={material} renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[600, 32, 24]} />
    </mesh>
  )
}
