export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function inverseLerp(a: number, b: number, v: number) {
  return a === b ? 0 : clamp01((v - a) / (b - a))
}

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = inverseLerp(edge0, edge1, x)
  return t * t * (3 - 2 * t)
}

/** Ken Perlin's smootherstep — zero first *and* second derivative at both ends. */
export function smootherstep(edge0: number, edge1: number, x: number) {
  const t = inverseLerp(edge0, edge1, x)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

/**
 * Frame-rate independent exponential approach. `lambda` is roughly "how many
 * e-foldings per second", so the result is identical at 30fps and at 144fps.
 * A plain `a += (b - a) * 0.1` is not — it moves faster on faster machines.
 */
export function damp(current: number, target: number, lambda: number, dt: number) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt))
}

/**
 * TRAP 8. Apparent size goes as 1/distance, so interpolating distance linearly
 * leaves an approaching object apparently motionless for the first half of the
 * move and then exploding through the last few percent.
 *
 * Interpolate in reciprocal space instead: this makes *apparent size* the thing
 * that moves linearly, which is what the eye actually reads as constant speed.
 */
export function dollyDistance(far: number, near: number, t: number) {
  const f = Math.max(far, 1e-4)
  const n = Math.max(near, 1e-4)
  return 1 / lerp(1 / f, 1 / n, t)
}

/**
 * TRAP 9. The film must not be implicitly art-directed for one screen shape.
 * A phone in portrait has a far narrower horizontal FOV than a laptop, so an
 * object sized in world units that reads perfectly on a desktop gets cropped to
 * three letters on a phone at exactly the moment it should be legible.
 *
 * Art-direct in "fraction of the viewport width" and solve for the distance (or
 * the scale) that actually achieves it on *this* viewport.
 */
export function visibleWidthAt(distance: number, fovDeg: number, aspect: number) {
  return 2 * Math.tan((fovDeg * Math.PI) / 360) * distance * aspect
}

export function visibleHeightAt(distance: number, fovDeg: number) {
  return 2 * Math.tan((fovDeg * Math.PI) / 360) * distance
}

/** Distance at which `worldWidth` covers `fraction` of the viewport width. */
export function distanceForWidthFraction(
  worldWidth: number,
  fraction: number,
  fovDeg: number,
  aspect: number,
) {
  const f = Math.max(fraction, 1e-4)
  return worldWidth / (f * 2 * Math.tan((fovDeg * Math.PI) / 360) * aspect)
}

/** Uniform scale that makes `worldWidth` cover `fraction` of the width at `distance`. */
export function scaleForWidthFraction(
  worldWidth: number,
  fraction: number,
  distance: number,
  fovDeg: number,
  aspect: number,
) {
  return (visibleWidthAt(distance, fovDeg, aspect) * fraction) / Math.max(worldWidth, 1e-4)
}

/** What fraction of the viewport width does `worldWidth` cover at `distance`? */
export function widthFractionAt(
  worldWidth: number,
  distance: number,
  fovDeg: number,
  aspect: number,
) {
  return worldWidth / Math.max(visibleWidthAt(distance, fovDeg, aspect), 1e-4)
}

/** Deterministic PRNG. Same stars, same petals, same rangoli on every machine. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
