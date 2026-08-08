/**
 * The celebration's ornament, generated rather than drawn.
 *
 * This is the same argument lib/shaders/patterns.ts makes for the film, carried
 * into 2D: nothing here is a downloaded asset, so there is no image to load, no
 * path to 404 behind a basePath, and no resolution at which it goes soft. The
 * film's motifs are procedural GLSL; the celebration's are procedural SVG, from
 * the same two vocabularies.
 *
 *   राजस्थान  the cusped jharokha arch, and the jaali screen behind it
 *   अवध       the multifoil arch, and the Banarasi butti on its zari lattice
 *
 * Everything below is authored in a 0..1 unit square, which is what makes the
 * frames work at all: the *same string* is used as an `objectBoundingBox`
 * clipPath and as a stroked outline. The photograph's edge and the gold line
 * around it are therefore literally the same path and cannot drift apart, which
 * they absolutely would if one were a mask and the other a drawing.
 */

export type Vocabulary = 'rajasthan' | 'awadh'

/** Trim float noise without losing the precision a 0..1 path needs. */
const r = (n: number) => {
  const s = n.toFixed(4)
  return s.replace(/\.?0+$/, '') || '0'
}

/**
 * An arch, as one closed path in the unit square.
 *
 * The lobes are a polar modulation of an elliptical arch, which is the same
 * trick the jaali shader uses for its eight-pointed void — radius as a function
 * of angle — and it puts the parity of `cusps` in charge of the arch's whole
 * character:
 *
 *   even  a *point* falls on the apex        → the Rajput cusped arch
 *   odd   a *lobe* falls on the apex          → the Awadhi multifoil
 *
 * That single fact is why these two are one function and not two drawings. The
 * modulation is 1 at both springing points, so the arch always meets its jambs
 * flush however many lobes it is given.
 *
 * @param cusps  lobes across the whole arch
 * @param depth  how far each lobe cuts in, as a fraction of the arch radius
 * @param spring y of the springing line — also the arch's height, so the apex
 *               always lands exactly on the top edge
 */
function arch(cusps: number, depth: number, spring: number, steps = 18): string {
  const n = cusps * steps
  const pts: string[] = []
  for (let i = 0; i <= n; i++) {
    const phi = (i / n) * Math.PI
    // 1 at every lobe join, 1 - depth at every lobe's deepest point
    const m = 1 - depth * (0.5 - 0.5 * Math.cos(2 * cusps * phi))
    pts.push(`${r(0.5 + 0.5 * m * Math.cos(phi))} ${r(spring - spring * m * Math.sin(phi))}`)
  }
  // up the right jamb, over the arch, down the left jamb, close along the base
  return `M1 1 L${pts.join(' L')} L0 1 Z`
}

/**
 * The two frames.
 *
 * राजस्थान springs higher and cuts deeper: a jharokha is a tall, emphatic,
 * pointed opening, and shallow lobes on it read as a wobble rather than as
 * carving. अवध is wider, shallower and rounder, which is what a Nawabi
 * multifoil actually is — more foils, each of them gentler.
 */
export const ARCH: Record<Vocabulary, string> = {
  rajasthan: arch(8, 0.085, 0.42),
  awadh: arch(11, 0.055, 0.34),
}

/**
 * जाली — one cell of the pierced screen: an eight-pointed void in a square of
 * stone. Identical geometry to the `jaali()` in lib/shaders/patterns.ts, and
 * deliberately so; the screen behind the mandap in पृथ्वी and the border on a
 * panel down here are the same screen.
 *
 * Returned as the *void*, so the caller decides whether it is a hole, a fill or
 * a stroke.
 */
export function jaaliStar(steps = 96): string {
  const pts: string[] = []
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const rad = 0.3 + 0.085 * Math.cos(a * 8)
    pts.push(`${r(0.5 + rad * Math.cos(a))} ${r(0.5 + rad * Math.sin(a))}`)
  }
  return `M${pts.join(' L')} Z`
}

/**
 * बूटी — the Banarasi brocade motif: a kalga, the paisley with the curled tip.
 * A teardrop bent along its own length, exactly as `buttiMotif()` bends it in
 * the shader, plus the curl that makes it a kalga rather than a leaf.
 */
export function buttiMotif(): string {
  const steps = 56
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2
    // an ellipse, then bent: the further from the base, the further it leans
    const x0 = 0.17 * Math.cos(t)
    const y0 = 0.25 * Math.sin(t)
    const bend = (y0 + 0.25) * (y0 + 0.25) * 1.5
    xs.push(x0 - bend * 0.44)
    ys.push(y0)
  }
  // Centred in its own cell rather than wherever the bend happened to leave it.
  // A motif that sits off-centre tiles into a lattice that visibly leans.
  const ox = 0.5 - (Math.min(...xs) + Math.max(...xs)) / 2
  const oy = 0.5 - (Math.min(...ys) + Math.max(...ys)) / 2
  const pts = xs.map((x, i) => `${r(x + ox)} ${r(ys[i] + oy)}`)
  return `M${pts.join(' L')} Z`
}

/**
 * गेंदा — a marigold garland, as the connective tissue between panels.
 *
 * Flowers on a catenary, because a strung garland hangs; a straight row of
 * discs is bunting. Sizes and vertical jitter come from a fixed hash rather
 * than Math.random, so the server and the client draw the same garland — a
 * random one differs between the two renders and React replaces the whole
 * thing on hydration, which is both a hydration mismatch and a visible flash.
 */
export interface Bloom {
  cx: number
  cy: number
  r: number
  /** 0..1 — how far toward the deep marigold this one sits */
  tone: number
}

export function garland(count = 34, sag = 0.34): Bloom[] {
  const out: Bloom[] = []
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    // fract(sin(i * k) * m) — the same cheap hash the shaders use
    const h = (n: number) => {
      const v = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453
      return v - Math.floor(v)
    }
    out.push({
      cx: t,
      cy: sag * Math.sin(t * Math.PI) + h(1) * 0.05,
      r: 0.028 + h(2) * 0.018,
      tone: h(3),
    })
  }
  return out
}
