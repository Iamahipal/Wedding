import { Effect } from 'postprocessing'
import { Uniform, Vector2, type WebGLRenderer, type WebGLRenderTarget } from 'three'

/**
 * Screen-space heat shimmer, for Agni.
 *
 * Implemented as `mainUv` rather than `mainImage`, which means postprocessing
 * folds it into the shared UV stage of the merged effect shader: it costs a
 * handful of instructions on top of a pass that already exists, not a pass of
 * its own. That matters — Agni is already the most expensive act in the film.
 *
 * The distortion is masked to a pool around the fire and fades out toward the
 * top of the frame, because heat that shimmers uniformly across the whole image
 * reads as a broken renderer rather than as hot air.
 */
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uStrength;
  uniform vec2  uCenter;
  uniform float uRadius;

  void mainUv(inout vec2 uv) {
    if (uStrength <= 0.0001) return;

    vec2 d = (uv - uCenter) * vec2(1.0, 0.62);
    float mask = 1.0 - smoothstep(0.0, uRadius, length(d));
    // strongest just above the fire, gone by the top of the frame
    mask *= smoothstep(-0.05, 0.25, uv.y - uCenter.y + 0.35);
    mask *= 1.0 - smoothstep(0.55, 1.0, uv.y);
    if (mask <= 0.0) return;

    float a = sin(uv.y * 46.0 - uTime * 3.4) + sin(uv.y * 83.0 + uTime * 2.1) * 0.55;
    float b = sin(uv.x * 37.0 + uTime * 1.9) + sin(uv.x * 61.0 - uTime * 2.7) * 0.4;

    uv.x += a * 0.0021 * uStrength * mask;
    uv.y += b * 0.0009 * uStrength * mask;
  }
`

export interface HeatShimmerOptions {
  strength?: number
  radius?: number
}

export class HeatShimmerEffect extends Effect {
  constructor({ strength = 0, radius = 0.6 }: HeatShimmerOptions = {}) {
    super('HeatShimmerEffect', fragmentShader, {
      uniforms: new Map<string, Uniform<number | Vector2>>([
        ['uTime', new Uniform(0)],
        ['uStrength', new Uniform(strength)],
        ['uCenter', new Uniform(new Vector2(0.5, 0.34))],
        ['uRadius', new Uniform(radius)],
      ]),
    })
  }

  update(_renderer: WebGLRenderer, _input: WebGLRenderTarget, deltaTime: number) {
    const u = this.uniforms.get('uTime')
    if (u) u.value = (u.value as number) + deltaTime
  }

  get strength(): number {
    return this.uniforms.get('uStrength')!.value as number
  }
  set strength(v: number) {
    this.uniforms.get('uStrength')!.value = v
  }

  /** where in the frame the fire currently is, in 0..1 screen space */
  setCenter(x: number, y: number) {
    ;(this.uniforms.get('uCenter')!.value as Vector2).set(x, y)
  }
}
