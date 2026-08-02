import * as THREE from 'three'

/**
 * The gold.
 *
 * Most of "does this look like gold" lives in the *lighting rig*, not here —
 * metal has no diffuse response, so it shows you nothing but its environment
 * (see components/scene/GoldEnvironment.tsx). What this file controls is which
 * part of the reflected environment survives: `color` is the F0 tint of real
 * gold, and `roughness` decides how wide the highlight spreads.
 */
export const GOLD_F0 = '#ffbe5c'

export interface GoldOptions {
  roughness?: number
  color?: string
  clearcoat?: number
  envMapIntensity?: number
}

export function goldMaterial(opts: GoldOptions = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(opts.color ?? GOLD_F0),
    metalness: 1,
    roughness: opts.roughness ?? 0.24,
    envMapIntensity: opts.envMapIntensity ?? 1.15,
    clearcoat: opts.clearcoat ?? 0,
    clearcoatRoughness: 0.1,
    // TRAP: anything the camera flies through must be DoubleSide, or you see
    // straight out the back of it at the most dramatic moment in the film.
    side: THREE.DoubleSide,
  })
}

/** Darker, rougher gold for architecture — it must not compete with the text. */
export function bronzeMaterial(opts: GoldOptions = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(opts.color ?? '#c98f43'),
    metalness: 1,
    roughness: opts.roughness ?? 0.42,
    envMapIntensity: opts.envMapIntensity ?? 0.9,
    side: THREE.FrontSide,
  })
}

/**
 * The two ends of the film's temperature range. Every light lerps between them
 * by `film.damped.warmth`. Both are inside the gold family: the cool end is a
 * warm white, not a blue one. Jal gets its contrast from *value*, not hue.
 */
export const COOL_KEY = new THREE.Color('#fff0d4')
export const HOT_KEY = new THREE.Color('#ffab4d')

const scratch = new THREE.Color()

/** warmth 1.0 = neutral gold; < 1 cooler and creamier; > 1 hotter and oranger. */
export function keyColor(warmth: number, target = scratch) {
  return target.copy(COOL_KEY).lerp(HOT_KEY, THREE.MathUtils.clamp((warmth - 0.9) / 0.3, 0, 1))
}
