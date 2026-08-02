import { mulberry32 } from './math'

/**
 * The 27 नक्षत्र — the lunar mansions the moon passes through in a sidereal
 * month. Vedic astrology reads the muhurat from them, which is why a wedding
 * date is an astronomical fact before it is a diary entry.
 *
 * The names are real and in traditional order. The star *positions* are not a
 * sky survey — they are a composition, laid out along the moon's path across
 * the frame so the act reads as a sky rather than as a data plot. Each one is
 * generated from a fixed seed, so every viewer sees the same sky.
 */
export const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
] as const

/** How many stars each mansion is traditionally drawn with. */
const STAR_COUNT = [3, 3, 6, 5, 3, 1, 4, 3, 5, 5, 2, 2, 5, 1, 1, 4, 4, 3, 11, 4, 4, 3, 5, 4, 2, 2, 32]

export interface Nakshatra {
  index: number
  name: string
  /** normalised layout position, -1..1 — scaled to the viewport at runtime */
  nx: number
  ny: number
  /** local depth, in world units behind the station */
  z: number
  /** star offsets from (nx, ny), also normalised */
  stars: { dx: number; dy: number; dz: number; mag: number }[]
  /** the polyline joining them, as indices into `stars` */
  path: number[]
}

export function buildNakshatras(): Nakshatra[] {
  const rand = mulberry32(0x5eed_1a3b)
  const out: Nakshatra[] = []

  for (let i = 0; i < 27; i++) {
    // The moon's path: a wide, gently tilted arc.
    //
    // It is deliberately wider than one frame — a sky that fits on screen is
    // not a sky — and the camera trucks along it so the mansions arrive one at
    // a time. The arc is centred on zero rather than left as a positive-only
    // sine, which would hang the whole band in the top third of the frame with
    // nothing underneath it.
    const u = i / 26 // 0..1 along the band
    const nx = (u - 0.5) * 2.6
    const ny = Math.sin(u * Math.PI * 1.15 - 0.25) * 0.55 - 0.2 + Math.sin(u * 9.1) * 0.06

    // depth is what makes the field parallax rather than slide
    const z = -55 - rand() * 85

    const count = Math.min(6, Math.max(2, STAR_COUNT[i] > 6 ? 5 : STAR_COUNT[i]))
    const spread = 0.085 + rand() * 0.05
    const stars: Nakshatra['stars'] = []
    for (let s = 0; s < count; s++) {
      const a = rand() * Math.PI * 2
      const r = (0.25 + rand() * 0.75) * spread
      stars.push({
        dx: Math.cos(a) * r,
        dy: Math.sin(a) * r * 0.8,
        dz: (rand() - 0.5) * 6,
        mag: 0.55 + rand() * 0.45,
      })
    }

    // join them nearest-neighbour from the brightest, so the figure reads as a
    // constellation somebody traced rather than as a random scribble
    const remaining = stars.map((_, k) => k)
    remaining.sort((a, b) => stars[b].mag - stars[a].mag)
    const path = [remaining.shift()!]
    while (remaining.length) {
      const last = stars[path[path.length - 1]]
      let best = 0
      let bestD = Infinity
      for (let k = 0; k < remaining.length; k++) {
        const s = stars[remaining[k]]
        const d = (s.dx - last.dx) ** 2 + (s.dy - last.dy) ** 2
        if (d < bestD) {
          bestD = d
          best = k
        }
      }
      path.push(remaining.splice(best, 1)[0])
    }

    out.push({ index: i, name: NAKSHATRA_NAMES[i], nx, ny, z, stars, path })
  }

  return out
}
