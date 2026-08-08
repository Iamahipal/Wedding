/**
 * lib/film.ts — the GSAP ⇄ WebGL bridge, the world layout, and the per-act
 * camera curves.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  THE ONE ARCHITECTURAL RULE                                             │
 * │                                                                         │
 * │  React renders the scene once. Scroll never touches React state.        │
 * │                                                                         │
 * │      ScrollTrigger ──writes──▶ `film` (this object) ──reads──▶ useFrame │
 * │                                                                         │
 * │  Scroll fires dozens of times a second. Anything on that path that      │
 * │  lives in React state re-renders the tree every frame and the canvas    │
 * │  stutters. There is no setState anywhere downstream of scroll.          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * A consequence, decided deliberately: every act is mounted exactly once and
 * never unmounted. The performance budget suggests acts could load and dispose
 * around the playhead, but unmounting means re-rendering the <Canvas> subtree,
 * which is TRAP 14 and crashes the scene intermittently. The rule above is the
 * one marked non-negotiable, so it wins. Acts stay cheap instead: inactive acts
 * set `visible = false` and return early from useFrame, costing nothing per
 * frame, and the whole film is kept inside a modest triangle budget so that
 * resident memory never becomes the problem the disposal was meant to solve.
 */
import { clamp01, damp, dollyDistance, distanceForWidthFraction, lerp, smootherstep, smoothstep } from './math'

/* ────────────────────────────────────────────────────────────── acts ───── */

export const ACT_ORDER = [
  'shunya',
  'akasha',
  'vayu',
  'agni',
  'jal',
  'prithvi',
  'gathbandhan',
] as const

export type ActName = (typeof ACT_ORDER)[number]

/** Scroll length of each act, in vh. This is the pacing of the film. */
export const ACT_LENGTH_VH: Record<ActName, number> = {
  shunya: 150, // hold the black longer than is comfortable, ignite, detonate, mantra
  akasha: 180, // vast and quiet, so it needs room to feel slow rather than empty
  vayu: 160,
  agni: 210, // the emotional apex gets the most scroll of any act
  jal: 150, // stillness reads as stillness only if you are allowed to sit in it
  prithvi: 180,
  gathbandhan: 160,
}

export const FILM_LENGTH_VH = ACT_ORDER.reduce((n, a) => n + ACT_LENGTH_VH[a], 0)

/** Normalised [start, end] of each act within the film's master progress. */
export const ACT_RANGE = (() => {
  const out = {} as Record<ActName, readonly [number, number]>
  let cursor = 0
  for (const act of ACT_ORDER) {
    const start = cursor / FILM_LENGTH_VH
    cursor += ACT_LENGTH_VH[act]
    out[act] = [start, cursor / FILM_LENGTH_VH] as const
  }
  return out
})()

/**
 * Each act occupies its own region of world space. Only one act is ever visible,
 * so the camera cuts between stations rather than travelling through the void
 * between them — a weighted average of two stations would point the camera at
 * nothing at all.
 */
export const STATION: Record<ActName, readonly [number, number, number]> = {
  shunya: [0, 0, 0],
  akasha: [0, 0, -500],
  vayu: [0, 0, -1000],
  agni: [0, 0, -1500],
  jal: [0, 0, -2000],
  prithvi: [0, 0, -2500],
  gathbandhan: [0, 0, -3000],
}

/**
 * The knot's dimensions live here rather than in the act, because the camera
 * has to solve for them: the finale is framed by width fraction, not by a
 * hard-coded distance, and that calculation and the geometry cannot be allowed
 * to drift apart. components/acts/Gathbandhan.tsx builds its tori from these.
 */
export const KNOT = {
  /** major radius of each band */
  R: 1.0,
  /** tube radius */
  tube: 0.115,
  /** how far each band sits from centre once locked */
  split: 0.5,
} as const

/** Widest the linked pair ever projects — the number the finale is framed on. */
export const KNOT_WIDTH = 2 * (KNOT.split + KNOT.R + KNOT.tube)

/* ─────────────────────────────────────────────────────── transitions ───── */

/**
 * The cut between two acts is covered by a curtain that reaches full opacity at
 * the exact frame the camera changes station — a dissolve, the way a film does
 * it, rather than a hard cut that reads as a bug. Each boundary is covered by
 * whatever the outgoing act is already full of, so the curtain reads as the
 * image continuing rather than as an overlay: gold when we are inside the
 * letterforms, a flare of fire-white leaving Agni, black everywhere else.
 */
export interface Curtain {
  /** css colour */
  color: string
  /** half-width of the dissolve, in master progress */
  width: number
}

export const BOUNDARY_CURTAIN: Record<string, Curtain> = {
  // we are physically inside the gold of the mantra at this instant
  'shunya>akasha': { color: '#c98f36', width: 0.012 },
  // Dark. This used to be a warm rust, chosen when a chunni filled the frame on
  // the other side of the cut — with the cloth gone it was a flat orange field
  // several seconds long that read as a broken page rather than as silk.
  'akasha>vayu': { color: '#0a0603', width: 0.009 },
  'vayu>agni': { color: '#120802', width: 0.010 },
  // the fire flares out; the stillness of Jal lands hardest out of white
  'agni>jal': { color: '#f7e2b4', width: 0.013 },
  'jal>prithvi': { color: '#080502', width: 0.012 },
  'prithvi>gathbandhan': { color: '#0d0803', width: 0.010 },
}

/* ─────────────────────────────────────────────────────────── the look ───── */

export interface Look {
  /** bloom intensity */
  bloom: number
  /** TRAP 4 — keep this high. Low thresholds bloom everything into a haze. */
  threshold: number
  grain: number
  /** Agni's heat-shimmer post pass; 0 everywhere else */
  shimmer: number
  /**
   * Temperature *within the gold family*. Never a hue shift toward blue —
   * Jal is cooler than Agni by being darker and less saturated, not bluer.
   */
  warmth: number
  /** overall exposure trim */
  exposure: number
}

const LOOK: Record<ActName, Look> = {
  shunya: { bloom: 0.88, threshold: 0.85, grain: 0.075, shimmer: 0, warmth: 1.0, exposure: 1.0 },
  akasha: { bloom: 0.9, threshold: 0.84, grain: 0.11, shimmer: 0, warmth: 0.97, exposure: 0.95 },
  vayu: { bloom: 0.95, threshold: 0.8, grain: 0.08, shimmer: 0, warmth: 1.07, exposure: 0.9 },
  agni: { bloom: 1.2, threshold: 0.72, grain: 0.07, shimmer: 1, warmth: 1.14, exposure: 1.0 },
  jal: { bloom: 0.78, threshold: 0.82, grain: 0.06, shimmer: 0, warmth: 0.94, exposure: 0.88 },
  prithvi: { bloom: 1.0, threshold: 0.75, grain: 0.06, shimmer: 0, warmth: 1.03, exposure: 1.0 },
  gathbandhan: { bloom: 1.1, threshold: 0.72, grain: 0.055, shimmer: 0, warmth: 1.0, exposure: 1.0 },
}

/* ───────────────────────────────────────────────────────── the state ───── */

export interface Shot {
  px: number
  py: number
  pz: number
  tx: number
  ty: number
  tz: number
  fov: number
  roll: number
}

export interface FilmState {
  /** master progress through the film, 0..1. Written by ScrollTrigger. */
  t: number
  /** signed scroll velocity, normalised to roughly -1..1. Written by Lenis. */
  velocity: number
  /** seconds since mount, and the last frame delta */
  time: number
  dt: number

  /** which act owns the playhead right now */
  active: ActName
  activeIndex: number
  /** 0..1 within the active act; every other act's entry is meaningless */
  p: Record<ActName, number>
  /** 1 for the active act, 0 for all others — acts read this for `visible` */
  on: Record<ActName, number>

  /** 0 = clear, 1 = fully covered. Rises to 1 at every act boundary. */
  curtain: number
  curtainColor: string

  /**
   * The handoff. 1 while the film owns the screen, 0 once उत्सव does.
   *
   * The canvas is `position: fixed` and mounted forever, so without this it
   * keeps rendering a full post chain underneath a photo-heavy scroll it is no
   * longer contributing anything to. On the mid-range Android this is built for
   * that is the difference between a celebration that scrolls and one that
   * stutters — and bloom costs the same whether the scene in front of it has
   * 23,000 triangles or none, so hiding the acts alone would not have done it.
   *
   * Written by the handoff ScrollTrigger in Film.tsx, read by FrameDriver (the
   * opacity), by every act (via `on`, which setStage blanks), and by Post (which
   * disables every composer pass, making composer.render a no-op loop).
   */
  stage: number

  look: Look
  /** the damped values the renderer actually uses */
  damped: Look
  chroma: number
  /**
   * Additive bloom, written by whichever act is live and reset to zero at the
   * top of every frame. This is how TRAP 11 is obeyed: the shine is a curve
   * driven by an object's *apparent size*, which only the act holding that
   * object can know, while the base look stays declarative in one table.
   */
  bloomBias: number
  /** where the fire currently sits on screen, 0..1 — drives the heat shimmer */
  fireScreen: [number, number]

  reducedMotion: boolean
  /** Decided once at mount from the device, never from React state. */
  lowEnd: boolean
  /** The renderer's pixel ratio. Fixed at mount; reported by ?diag. */
  quality: number
  /** Measured, not assumed. Reported by ?diag. */
  fps: number
  portrait: boolean
  aspect: number
  fov: number

  /** set true once the audio context has been unlocked by a real gesture */
  audioUnlocked: boolean
  /** acts push named beats here; the sound layer drains them */
  beats: string[]

  /** debug harness — Film.tsx installs the real implementation */
  seek: (t: number) => void
}

const zeroPerAct = <T,>(v: T) => Object.fromEntries(ACT_ORDER.map((a) => [a, v])) as Record<ActName, T>

export const film: FilmState = {
  t: 0,
  velocity: 0,
  time: 0,
  dt: 1 / 60,

  active: 'shunya',
  activeIndex: 0,
  p: zeroPerAct(0),
  on: { ...zeroPerAct(0), shunya: 1 },

  curtain: 0,
  curtainColor: '#000000',
  stage: 1,

  look: { ...LOOK.shunya },
  damped: { ...LOOK.shunya },
  chroma: 0,
  bloomBias: 0,
  fireScreen: [0.5, 0.34],

  reducedMotion: false,
  lowEnd: false,
  quality: 1,
  fps: 0,
  portrait: false,
  aspect: 16 / 9,
  fov: 38,

  audioUnlocked: false,
  beats: [],

  seek: () => {},
}

export function emitBeat(name: string) {
  if (film.beats.length < 16) film.beats.push(name)
}

/* ────────────────────────────────────────────────────────── the handoff ───── */

/** Below this the stage is dark: nothing ticks, nothing renders. */
export const STAGE_OFF = 0.002

/**
 * The one writer of `film.stage`.
 *
 * Crossing the threshold in either direction is a state change, not a per-frame
 * value, so it is done here once rather than tested every frame in three places.
 * Going dark blanks `on` — an act whose `on` is 0 sets `visible = false` and
 * returns early from useFrame, so the whole act list stops costing anything.
 * Coming back re-derives the same state from the playhead, because the master
 * ScrollTrigger's range ended long ago and will not fire again on its own.
 *
 * `frameloop` is deliberately untouched (TRAP 14): a renderer reconfigured
 * mid-flight is the hazard, by whatever route.
 */
export function setStage(v: number) {
  const next = clamp01(v)
  if (next === film.stage) return

  const wasLive = film.stage > STAGE_OFF
  const live = next > STAGE_OFF
  film.stage = next
  if (live === wasLive) return

  if (live) {
    updateFilm(film.t)
  } else {
    for (const act of ACT_ORDER) film.on[act] = 0
    film.curtain = 0
  }
}

/* ───────────────────────────────────────────── written by ScrollTrigger ───── */

/**
 * The only writer of scroll-derived state. Called from ScrollTrigger's onUpdate,
 * which means dozens of times a second — so it allocates nothing.
 */
export function updateFilm(t: number) {
  film.t = clamp01(t)

  let active: ActName = ACT_ORDER[0]
  let activeIndex = 0
  for (let i = 0; i < ACT_ORDER.length; i++) {
    const act = ACT_ORDER[i]
    const [a, b] = ACT_RANGE[act]
    const raw = a === b ? 0 : clamp01((film.t - a) / (b - a))
    if (film.reducedMotion) {
      const [lo, hi] = REDUCED_CONTENT[act]
      film.p[act] = lo + raw * (hi - lo)
    } else {
      film.p[act] = raw
    }
    // the last act keeps the playhead past 1.0 so the finale holds
    if (film.t >= a && (film.t < b || i === ACT_ORDER.length - 1)) {
      active = act
      activeIndex = i
    }
  }

  film.active = active
  film.activeIndex = activeIndex
  for (const act of ACT_ORDER) film.on[act] = act === active ? 1 : 0

  // curtain: 1 exactly at each boundary, 0 by `width` either side of it
  let curtain = 0
  let color = '#000000'
  for (let i = 0; i < ACT_ORDER.length - 1; i++) {
    const key = `${ACT_ORDER[i]}>${ACT_ORDER[i + 1]}`
    const c = BOUNDARY_CURTAIN[key]
    if (!c) continue
    const edge = ACT_RANGE[ACT_ORDER[i]][1]
    const d = Math.abs(film.t - edge)
    if (d < c.width) {
      const v = smootherstep(c.width, 0, d)
      if (v > curtain) {
        curtain = v
        color = c.color
      }
    }
  }
  film.curtain = curtain
  film.curtainColor = color

  // look is a straight per-act table; the damping happens in tickFilm
  const l = LOOK[active]
  film.look.bloom = l.bloom
  film.look.threshold = l.threshold
  film.look.grain = l.grain
  film.look.shimmer = l.shimmer
  film.look.warmth = l.warmth
  film.look.exposure = l.exposure
}

/* ──────────────────────────────────────────────── read by useFrame ───── */

/** Called once per frame, before anything reads `film.damped`. */
export function tickFilm(dt: number) {
  film.dt = dt
  film.time += dt
  // acts re-assert this later in the same frame; whoever is live owns it
  film.bloomBias = 0

  const k = 4.5
  const d = film.damped
  const l = film.look
  d.bloom = damp(d.bloom, l.bloom, k, dt)
  d.threshold = damp(d.threshold, l.threshold, k, dt)
  d.grain = damp(d.grain, l.grain, k, dt)
  d.shimmer = damp(d.shimmer, l.shimmer, k, dt)
  d.warmth = damp(d.warmth, l.warmth, k, dt)
  d.exposure = damp(d.exposure, l.exposure, k, dt)

  /**
   * TRAP 12. Chromatic aberration must be *exactly* zero at rest. Even a
   * sub-pixel offset resamples 1px particles across the channels and speckles
   * the entire starfield magenta and green. It is a motion cue, so it exists
   * only while there is motion — and it is snapped to zero below a floor rather
   * than allowed to asymptote toward it.
   */
  const target = film.reducedMotion ? 0 : Math.min(Math.abs(film.velocity) * 0.9, 1)
  film.chroma = damp(film.chroma, target, 8, dt)
  if (film.chroma < 0.004) film.chroma = 0
}

/* ─────────────────────────────────────────────────── camera curves ───── */

const shot: Shot = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0, fov: 38, roll: 0 }

/* ── the prologue's one moving object ────────────────────────────────────────
 * The camera holds still through Shunya and the mantra travels toward it, so
 * this curve is the whole shot. It is authored in *fractions of the viewport
 * width* rather than in world units (TRAP 9): a phone in portrait has a far
 * narrower horizontal FOV than a laptop, and text sized to read on a desktop
 * crops to three letters on a phone at exactly the moment it must be legible.
 * Solving for distance per viewport gives every screen the same composition.
 * -------------------------------------------------------------------------- */

/** where the approach ends and the camera starts passing through the gold */
const FLY_THROUGH_AT = 0.86

export interface MantraShot {
  /** distance in front of the camera; negative once it is behind */
  distance: number
  /** how much of the viewport width it covers right now */
  fraction: number
  yaw: number
  /** 0..1 — how much glow this thing should be carrying */
  shine: number
}

const mantraShot: MantraShot = { distance: 1, fraction: 0, yaw: 0, shine: 1 }

export function prologueMantra(
  p: number,
  worldWidth: number,
  fov: number,
  aspect: number,
  portrait: boolean,
): MantraShot {
  const far = 0.012
  const readable = portrait ? 0.88 : 0.64

  const approach = smootherstep(0.5, FLY_THROUGH_AT, p)
  const fraction = lerp(far, readable, approach)
  const dApproach = distanceForWidthFraction(worldWidth, fraction, fov, aspect)

  let distance = dApproach
  if (p > FLY_THROUGH_AT) {
    // Past this point the reciprocal curve is the wrong tool — it cannot cross
    // zero, and crossing zero is the entire point: the camera has to end up
    // behind the letterforms. A linear push handles the last stretch, and at
    // this range apparent size is exploding on its own anyway.
    const dAt = distanceForWidthFraction(worldWidth, readable, fov, aspect)
    distance = lerp(dAt, -worldWidth * 0.18, smoothstep(FLY_THROUGH_AT, 1, p))
  }

  mantraShot.distance = distance
  mantraShot.fraction = fraction

  /**
   * TRAP 10. The yaw is fully spent *before* the mantra reaches readable size.
   * A turned form announces depth while it is distant, but at size the near end
   * swells and blows out while the far end shrinks into darkness. The threshold
   * is measured against apparent size, not guessed from progress: legibility
   * here starts around a third of the viewport width, so the turn is flat well
   * before that.
   */
  mantraShot.yaw = lerp(0.44, 0, smootherstep(0.04, 0.3, fraction))

  /**
   * TRAP 11. The shine is an explicit curve driven by apparent size. Far away
   * the mantra is a speck and needs to be bright and loose — heavy bloom is the
   * only thing that makes a distant object read as a jewel rather than as a
   * dead pixel. Close up it settles right down: at readable size glow is the
   * enemy of legibility and destroys the shading that makes a form look solid.
   *
   * It reaches *exactly* zero, and early. Glow here is emissive, and emissive
   * is view-independent and uniform across a surface — so any of it left at
   * readable size floods the letterforms to one flat value and the gold stops
   * being metal and becomes lit plastic. The curve is spent by the time the
   * mantra is a seventh of the frame wide, long before anyone tries to read it.
   */
  mantraShot.shine = lerp(1, 0, smoothstep(0.02, 0.14, fraction))

  return mantraShot
}

/**
 * TRAP 22. The reduced-motion branch skips the camera moves — but it must still
 * *present* the content. Freezing each act at p = 0 would leave the mantra as an
 * unreadable speck in deep space: less motion, and nothing communicated.
 *
 * So reduced motion pins the camera to the one progress value per act where the
 * framing is legible, and lets the content reveal itself normally.
 */
export const HERO_P: Record<ActName, number> = {
  shunya: 0.85, // mantra at readable size, before the fly-through
  akasha: 0.62, // constellations drawn, before the camera has swung away
  vayu: 0.5,
  agni: 0.35,
  jal: 0.5,
  prithvi: 0.82, // mandap assembled, names revealed
  gathbandhan: 0.85, // the forms interlocked
}

/**
 * ...and pinning the camera is only half of it.
 *
 * The first version of this branch froze the camera and left everything else
 * alone — and since most of this film's motion belongs to the *subjects* rather
 * than to the lens, the result was a reduced-motion viewer scrolling through an
 * empty black screen while the mantra sat, unreached, at the far end of a curve
 * that never advanced. Less motion, and nothing communicated: precisely the
 * failure this trap describes.
 *
 * So content progress is remapped onto the stretch of each act where there is
 * something to see. Scrolling still advances it — the viewer is not handed a
 * still image — but it starts at the legible state and stays there.
 */
const REDUCED_CONTENT: Record<ActName, readonly [number, number]> = {
  shunya: [0.8, 0.86], // the readable mantra. no detonation, no fly-through.
  akasha: [0.35, 1.0], // constellations draw themselves, the two stars meet
  vayu: [0.35, 0.75], // the silk, without the sweep past the lens
  agni: [0.02, 0.98], // all seven vows still resolve, one at a time
  jal: [0.2, 0.8],
  prithvi: [0.25, 1.0], // mandap assembles, mehndi draws, the names arrive
  gathbandhan: [0.3, 1.0], // the rings interlock
}

/* ── breath ──────────────────────────────────────────────────────────────────
 * Scroll drives the narrative. Time drives the *life*.
 *
 * Every shot in this film was authored purely as a function of scroll progress,
 * which means that the instant the viewer stops scrolling the camera becomes
 * perfectly, mechanically still — and a perfectly still camera is the single
 * most deadening thing in a piece that is otherwise trying to feel photographed.
 * No real camera is ever that still. Even locked off on a tripod it breathes.
 *
 * So a small, slow, never-repeating drift is added on top of the authored shot.
 * It is deliberately *not* a scroll effect: it keeps running when nothing else
 * is, which is the whole point. The amplitude scales with the shot's distance
 * so it reads identically whether the camera is nine units from a kalash or
 * thirty-four from a starfield.
 *
 * Jal gets the least of it. Its stillness is the effect.
 * -------------------------------------------------------------------------- */
export const BREATH: Record<ActName, number> = {
  shunya: 0.75,
  akasha: 1.0,
  vayu: 1.15,
  agni: 1.3, // hot air, and the circling is already restless
  jal: 0.4, // almost nothing — the contrast with Agni *is* the act
  prithvi: 0.85,
  gathbandhan: 0.8,
}

export interface Breath {
  px: number
  py: number
  pz: number
  tx: number
  ty: number
  roll: number
}

const breath: Breath = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, roll: 0 }

/**
 * Frequencies are mutually irrational so the pattern never visibly loops — three
 * sines at 1:1.42:0.68 take minutes to come back into phase, and by then nobody
 * is still looking at the same act.
 */
export function cameraBreath(act: ActName, time: number, distance: number): Breath {
  const k = BREATH[act] * Math.max(distance, 1)
  const a = k * 0.0038
  const b = k * 0.0021

  breath.px = Math.sin(time * 0.19) * a
  breath.py = Math.sin(time * 0.27 + 1.7) * a * 0.8
  breath.pz = Math.sin(time * 0.13 + 3.1) * a * 0.6

  // the target drifts on its own clock, which is what turns a translation into
  // a slow, unrepeatable re-aim rather than a rigid slide
  breath.tx = Math.sin(time * 0.23 + 0.6) * b
  breath.ty = Math.sin(time * 0.17 + 2.4) * b

  breath.roll = Math.sin(time * 0.09 + 1.1) * BREATH[act] * 0.0045

  return breath
}

/** Per-act camera. Returns a shared scratch object — do not retain it. */
export function shotFor(act: ActName, p: number, state: FilmState): Shot {
  const [sx, sy, sz] = STATION[act]
  shot.fov = state.portrait ? 46 : 38
  shot.roll = 0
  shot.px = sx
  shot.py = sy
  shot.pz = sz
  shot.tx = sx
  shot.ty = sy
  shot.tz = sz - 1

  switch (act) {
    case 'shunya': {
      // the camera holds dead still through the ignition, then the mantra comes
      // to *it* — moving both reads as soup
      shot.pz = sz + 6
      shot.tz = sz
      shot.py = sy + lerp(0, 0.15, smoothstep(0.55, 1, p))
      break
    }
    case 'akasha': {
      // A slow dolly, and a long truck along the lunar path.
      //
      // Camera and target move together rather than the camera swinging on a
      // fixed point: a truck keeps the near stars sliding against the far ones,
      // which is the only thing that makes a scatter of dots read as depth. A
      // pan would rotate the whole field rigidly and flatten it.
      const a = smootherstep(0, 1, p)
      shot.pz = sz + lerp(34, 10, a)
      shot.px = sx + lerp(-17, 17, a)
      shot.py = sy + lerp(1.4, -0.6, a)
      shot.tx = sx + lerp(-13, 13, a)
      shot.tz = sz - 20
      shot.roll = lerp(-0.02, 0.02, a)
      break
    }
    case 'vayu': {
      // The cloths open the act and the breath carries it, so the camera
      // settles rather than keeps travelling: प्राण has to be *centred* when it
      // resolves, and a look-at still drifting upward puts the word low and
      // left in the frame at exactly the moment it is meant to be read.
      const a = smootherstep(0, 1, p)
      const settle = smootherstep(0.35, 0.68, p)
      shot.pz = sz + lerp(16, 7.5, a)
      shot.py = sy + lerp(-1.6, 0.35, a)
      shot.px = sx + Math.sin(a * Math.PI) * 1.1 * (1 - settle)
      shot.tz = sz - 2
      shot.ty = sy + lerp(0, 0.5, a) * (1 - settle)
      break
    }
    case 'agni': {
      /**
       * A quarter turn, not seven circuits.
       *
       * Seven pradakshina around the fire was the literal reading of the ritual
       * and it does not survive contact with the image: the flame is radially
       * symmetric, so orbiting it produces seven *identical* views. That is
       * motion without change, and at scroll speed it reads as vibration rather
       * than as ceremony. No amount of easing fixes a camera move that reveals
       * nothing.
       *
       * The circuits moved into the vows instead — see Saptapadi.tsx, where the
       * seven words ignite one at a time in a ring around the kund. So the
       * camera can do what it should have been doing all along: begin high and
       * wide, where the whole ring can be read at once, and come down and in as
       * the vows complete until nothing is left in frame but the fire.
       */
      const a = smootherstep(0, 1, p)
      const ang = lerp(-0.6, 0.66, a)
      const radius = lerp(15, 8.2, a)
      shot.px = sx + Math.sin(ang) * radius
      shot.pz = sz + Math.cos(ang) * radius
      shot.py = sy + lerp(10.5, 3.1, a)
      shot.tx = sx
      shot.ty = sy + lerp(0.3, 1.7, a)
      shot.tz = sz
      break
    }
    case 'jal': {
      // almost nothing. The contrast with Agni *is* the effect.
      const a = smootherstep(0, 1, p)
      shot.pz = sz + lerp(9.4, 8.2, a)
      shot.py = sy + lerp(1.55, 1.15, a)
      shot.px = sx + lerp(-0.35, 0.25, a)
      shot.ty = sy + lerp(0.95, 0.75, a)
      shot.tz = sz
      break
    }
    case 'prithvi': {
      // Stays *outside* the mandap's footprint. Pushing in to z = 9 put the
      // lens between the pillars, and a pillar three units from the camera is
      // a gold wall — the structure has to be seen whole to read as a mandap.
      const a = smootherstep(0, 1, p)
      shot.pz = sz + lerp(30, 16, a)
      shot.py = sy + lerp(9, 3.4, a)
      shot.ty = sy + lerp(0.6, 2.0, a)
      shot.tz = sz
      break
    }
    case 'gathbandhan': {
      const a = smootherstep(0, 1, p)

      /**
       * TRAP 9, and the finale was the one act still ignoring it.
       *
       * The dolly used to end at a hard-coded 7.2 units. That frames the knot
       * on a laptop and crops it in half on a phone, because `fov` in three is
       * the *vertical* angle: at portrait aspect the horizontal field collapses
       * to about 22°, and the linked pair is KNOT_WIDTH across. Measured on a
       * 375pt viewport it ran off both edges at once.
       *
       * So the end of the move is solved rather than guessed — the knot lands
       * on the same fraction of the viewport width on every screen, and the
       * hard number only sets where the shot *starts*.
       */
      // KNOT_WIDTH is the *widest* the pair ever projects, which happens only
      // when the group's slow turn brings it square to the lens. Framing on the
      // worst case is the point — the knot then breathes between this size and
      // a little under it as it rotates, and never once touches an edge.
      const near = distanceForWidthFraction(
        KNOT_WIDTH,
        state.portrait ? 0.78 : 0.5,
        shot.fov,
        state.aspect,
      )
      shot.pz = sz + dollyDistance(near * 1.8, near, a)
      shot.py = sy + lerp(1.2, 0.15, a)
      shot.px = sx + lerp(1.5, 0, a)
      shot.tz = sz
      shot.ty = sy
      break
    }
  }
  return shot
}

