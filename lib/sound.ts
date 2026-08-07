/**
 * lib/sound.ts — everything you hear, synthesised.
 *
 * Nothing is fetched. No audio file sits on the critical path, no licence
 * question is ever raised, and the whole layer costs a few kilobytes of code.
 *
 * If a real recording is available and licensed, prefer it — a human voice
 * carries what synthesis cannot. The trigger points would not change: swap the
 * bodies of bell() and drone() and leave `beat()` alone.
 */

/**
 * A bell is inharmonic. Its partials are *not* integer multiples of a
 * fundamental, and that is precisely why a bell sounds like a bell while
 * stacked harmonics sound like an organ.
 *
 * These are close to the classic tuned-bell ratios: a hum an octave below the
 * strike note, the prime, a minor third (the tierce, which is what gives a bell
 * its melancholy), a fifth, the nominal an octave up, and a scatter of
 * increasingly unrelated upper partials.
 */
const BELL_PARTIALS = [
  { ratio: 0.5, gain: 1.0, decay: 9.0 }, // hum — rings on under everything
  { ratio: 1.0, gain: 0.85, decay: 6.2 }, // prime
  { ratio: 1.19, gain: 0.6, decay: 4.6 }, // tierce (minor third)
  { ratio: 1.5, gain: 0.42, decay: 3.4 }, // quint
  { ratio: 2.0, gain: 0.5, decay: 2.6 }, // nominal
  { ratio: 2.61, gain: 0.26, decay: 1.7 },
  { ratio: 3.42, gain: 0.18, decay: 1.1 },
  { ratio: 4.51, gain: 0.12, decay: 0.7 },
  { ratio: 5.63, gain: 0.08, decay: 0.45 },
]

/**
 * राग भैरवी, in **just intonation** rather than in twelve equal steps.
 *
 * Bhairavi is the all-komal raga — every swara that can be flat, is — and it is
 * the piece a Hindustani concert traditionally closes with. So it belongs on
 * the knot and nowhere earlier.
 *
 * The tuning is not a detail. Indian classical music is sung and played against
 * a fixed drone, and these intervals are small whole-number ratios *because*
 * that is what stops a held note beating against it. Equal temperament would
 * put komal re 7 cents sharp of 16/15 and the phrase would sour against the
 * tanpura underneath. Every one of these is exact.
 *
 *   S  1/1     r  16/15    g  6/5     m  4/3
 *   P  3/2     d  8/5      n  9/5     Ṡ  2/1
 */
export const BHAIRAVI = [1, 16 / 15, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 9 / 5, 2]

/**
 * One breath. Indices into BHAIRAVI, and seconds.
 *
 * It climbs to d, the highest note it touches, and then falls all the way home
 * to Sa and stays there — which is what a closing phrase in Bhairavi does, and
 * is the shape of the act it plays under.
 */
export const PHRASE: ReadonlyArray<readonly [number, number]> = [
  [4, 0.9], // P
  [3, 0.5], // m
  [2, 0.55], // g
  [3, 0.45], // m
  [4, 1.0], // P
  [5, 0.5], // d — the turn
  [4, 0.6], // P
  [2, 0.7], // g
  [1, 0.55], // r
  [0, 1.7], // S — home, and held
]

export class Sound {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private droneGain: GainNode | null = null
  private droneNodes: OscillatorNode[] = []
  private noiseBuffer: AudioBuffer | null = null
  /** A shehnai phrase is a *breath*. It cannot be interrupted by another one. */
  private shehnaiUntil = 0

  get ready() {
    return this.ctx !== null && this.ctx.state === 'running'
  }

  /**
   * TRAP 23. Browsers refuse to start audio until a user gesture, and a wheel
   * scroll does not count — so sound cannot simply begin with the opening.
   *
   * Rather than fight that, the unlock *is* the moment: the bell is struck on
   * the very gesture that enables sound, which turns a browser restriction into
   * an intention. Nothing is lost and something is gained.
   */
  async unlock(): Promise<boolean> {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return false
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.0001
      this.master.connect(this.ctx.destination)
      this.buildNoise()
      this.startDrone()
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume()

    const now = this.ctx.currentTime
    this.master!.gain.cancelScheduledValues(now)
    this.master!.gain.setValueAtTime(0.0001, now)
    this.master!.gain.exponentialRampToValueAtTime(0.85, now + 0.7)

    this.bell(1)
    return true
  }

  mute() {
    if (!this.ctx || !this.master) return
    const now = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(this.master.gain.value, now)
    this.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
  }

  private buildNoise() {
    const ctx = this.ctx!
    const len = Math.floor(ctx.sampleRate * 0.4)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    this.noiseBuffer = buf
  }

  /** The strike of the clapper: a short burst of filtered noise, nothing more. */
  private strike(at: number, gain: number) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 2600
    bp.Q.value = 0.9
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(0.5 * gain, at + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.09)
    src.connect(bp).connect(g).connect(this.master!)
    src.start(at)
    src.stop(at + 0.2)
  }

  /** A temple bell. `strength` 0..1. */
  bell(strength = 1, fundamental = 196) {
    if (!this.ctx || !this.master) return
    const ctx = this.ctx
    const at = ctx.currentTime + 0.01

    this.strike(at, strength)

    for (const p of BELL_PARTIALS) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = fundamental * p.ratio
      // real bells beat slightly — two nearly-identical partials drifting
      const detune = ctx.createOscillator()
      detune.type = 'sine'
      detune.frequency.value = 0.4 + p.ratio * 0.3
      const detuneAmt = ctx.createGain()
      detuneAmt.gain.value = 1.6
      detune.connect(detuneAmt).connect(osc.frequency)

      const g = ctx.createGain()
      const peak = p.gain * strength * 0.16
      g.gain.setValueAtTime(0.0001, at)
      g.gain.exponentialRampToValueAtTime(peak, at + 0.012)
      // each partial gets its own decay, so the highs die first and the hum
      // rings on underneath — the single most important detail in the patch
      g.gain.exponentialRampToValueAtTime(0.0001, at + p.decay)

      osc.connect(g).connect(this.master)
      osc.start(at)
      detune.start(at)
      osc.stop(at + p.decay + 0.1)
      detune.stop(at + p.decay + 0.1)
    }
  }

  /** A low tanpura-ish drone, always underneath, never quite still. */
  private startDrone() {
    const ctx = this.ctx!
    const bus = ctx.createGain()
    bus.gain.value = 0.055
    this.droneGain = bus

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 520
    lp.Q.value = 3.2

    // a slow sweep on the filter stands in for the jivari buzz of a real
    // tanpura — the overtone that swells and fades as the string rolls
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.07
    const lfoAmt = ctx.createGain()
    lfoAmt.gain.value = 260
    lfo.connect(lfoAmt).connect(lp.frequency)
    lfo.start()

    const root = 98 // G2 — sits under the bell's G3 without muddying it
    const voices = [
      { f: root * 0.5, type: 'triangle' as OscillatorType, g: 1.0 },
      { f: root, type: 'sawtooth' as OscillatorType, g: 0.4 },
      { f: root * 1.5, type: 'sawtooth' as OscillatorType, g: 0.22 },
      { f: root * 2.0, type: 'triangle' as OscillatorType, g: 0.16 },
    ]

    for (const v of voices) {
      const osc = ctx.createOscillator()
      osc.type = v.type
      osc.frequency.value = v.f
      osc.detune.value = (Math.random() - 0.5) * 9
      const g = ctx.createGain()
      g.gain.value = v.g
      osc.connect(g).connect(lp)
      osc.start()
      this.droneNodes.push(osc)
    }

    lp.connect(bus).connect(this.master!)
  }

  /** A brief inharmonic shimmer — used as forms pass the camera. */
  shimmer(strength = 1) {
    if (!this.ctx || !this.master) return
    const ctx = this.ctx
    const at = ctx.currentTime + 0.01
    const base = 780 + Math.random() * 220
    for (const r of [1, 1.41, 2.13, 3.07, 4.61]) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(base * r, at)
      osc.frequency.exponentialRampToValueAtTime(base * r * 1.18, at + 1.1)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, at)
      g.gain.exponentialRampToValueAtTime(0.02 * strength, at + 0.18)
      g.gain.exponentialRampToValueAtTime(0.0001, at + 1.3)
      osc.connect(g).connect(this.master)
      osc.start(at)
      osc.stop(at + 1.5)
    }
  }

  /**
   * शहनाई — the auspicious instrument, and the sound a North Indian wedding is
   * unmistakable by.
   *
   * Built rather than sampled, like everything else here, and built around the
   * three things that actually make a shehnai sound like one:
   *
   * **मींड.** The pitch *travels* between notes. A shehnai has no frets, keys
   * or stops — it is a conical double-reed pipe with open finger holes, and the
   * player slides between swaras rather than stepping. So this is one
   * oscillator for the whole phrase whose frequency is ramped, not ten notes
   * played in sequence. Retriggering per note is the single thing that would
   * make it read as a synthesiser imitating a shehnai.
   *
   * **The formants.** A double reed is harmonically rich and *nasal*, and the
   * nasality is a pair of fixed resonances the bore imposes regardless of which
   * note is sounding. Two bandpasses, parked and never swept.
   *
   * **आंदोलन.** The vibrato opens as a note is held rather than sitting at a
   * constant depth — a player leans into a sustained swara. Depth is scheduled
   * per note, and the long ones get more of it.
   *
   * Tuned to the drone that is already running, because that is the ensemble:
   * research is consistent that a second shehnai holds the tonic in place of a
   * tanpura. `startDrone()` roots at G2, so Sa here is G4.
   */
  shehnai(strength = 1, tonic = 392) {
    if (!this.ctx || !this.master) return
    // one breath at a time — a second phrase over the first is two players
    if (this.ctx.currentTime < this.shehnaiUntil) return
    this.shehnaiUntil = renderShehnai(
      this.ctx,
      this.master,
      this.ctx.currentTime + 0.02,
      strength,
      tonic,
      this.noiseBuffer ?? undefined,
    )
  }

  /** Swell the drone — Agni gets more of it than Jal does. */
  setIntensity(v: number) {
    if (!this.ctx || !this.droneGain) return
    this.droneGain.gain.setTargetAtTime(0.03 + v * 0.06, this.ctx.currentTime, 0.6)
  }

  /** Named moments emitted by Film.tsx. */
  beat(name: string) {
    switch (name) {
      case 'ignite':
        this.shimmer(0.5)
        break
      case 'detonate':
        this.bell(0.85, 196)
        break
      case 'align':
        this.shimmer(1)
        break
      case 'wind':
        this.shimmer(0.6)
        break
      case 'fire':
        this.bell(0.6, 147)
        break
      case 'still':
        this.shimmer(0.45)
        break
      case 'mandap':
        this.bell(0.5, 262)
        break
      /**
       * The shehnai plays here and nowhere else.
       *
       * It is a मंगल वाद्य and it belongs at the wedding itself, not scattered
       * over the elements as texture — and Bhairavi is what a performance
       * closes on, so the closing act is the one place the raga is also
       * correct. Restraint is the authentic choice as well as the tasteful one.
       */
      case 'knot':
        this.bell(1, 196)
        this.shehnai(1)
        break
      // the folio: paper, not ceremony — quieter than anything in the film
      case 'folio':
        this.shimmer(0.3)
        break
      case 'folio-take':
        this.bell(0.28, 392)
        break
    }
  }
}

/**
 * The shehnai graph, built against any BaseAudioContext so it can be rendered
 * offline and *measured* — see scripts/verify-shehnai.mjs. A sound nobody can
 * check is a sound nobody can fix.
 *
 * Returns the time the phrase finishes.
 */
export function renderShehnai(
  ctx: BaseAudioContext,
  dest: AudioNode,
  at: number,
  strength = 1,
  tonic = 392,
  noise?: AudioBuffer,
): number {
  const peak = 0.055 * strength

  // the reed: a sawtooth is the right source for a double reed, which is rich
  // in *both* odd and even harmonics — a square would give a clarinet
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'

  // आंदोलन, scheduled per note below
  const vib = ctx.createOscillator()
  vib.type = 'sine'
  vib.frequency.value = 5.4
  const vibAmt = ctx.createGain()
  vibAmt.gain.value = 0
  vib.connect(vibAmt)
  vibAmt.connect(osc.detune) // cents

  // the bore's two fixed resonances, plus a dulled direct path for body
  const mix = ctx.createGain()
  const f1 = ctx.createBiquadFilter()
  f1.type = 'bandpass'
  f1.frequency.value = 1150
  f1.Q.value = 3.5
  const f2 = ctx.createBiquadFilter()
  f2.type = 'bandpass'
  f2.frequency.value = 2750
  f2.Q.value = 5
  const g2 = ctx.createGain()
  g2.gain.value = 0.42
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 4200
  lp.Q.value = 0.7
  const g3 = ctx.createGain()
  g3.gain.value = 0.5

  osc.connect(f1).connect(mix)
  osc.connect(f2).connect(g2).connect(mix)
  osc.connect(lp).connect(g3).connect(mix)

  const env = ctx.createGain()
  env.gain.value = 0.0001
  mix.connect(env).connect(dest)

  // the air a reed player is actually pushing — quiet, but its absence is
  // audible as "synthetic" even when nobody can say why
  let breath: AudioBufferSourceNode | null = null
  if (noise) {
    breath = ctx.createBufferSource()
    breath.buffer = noise
    breath.loop = true
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 1800
    const bg = ctx.createGain()
    bg.gain.value = 0.06
    breath.connect(hp).connect(bg).connect(env)
  }

  let t = at
  let prev = tonic * BHAIRAVI[PHRASE[0][0]]
  osc.frequency.setValueAtTime(prev, t)

  for (let i = 0; i < PHRASE.length; i++) {
    const [deg, dur] = PHRASE[i]
    const f = tonic * BHAIRAVI[deg]

    if (i === 0) {
      // a reed speaks quickly, but it does not click
      env.gain.setValueAtTime(0.0001, t)
      env.gain.exponentialRampToValueAtTime(peak, t + 0.14)
    } else {
      /**
       * The meend, and the breath pulse that articulates it. The dip is what
       * separates two swaras inside one continuous breath — without it the
       * phrase is a siren, with a hard gate it is ten separate notes.
       *
       * Both parameters are **anchored first**, and that is not defensive
       * coding. A Web Audio ramp interpolates from the previous scheduled
       * event's *end time*, not from the moment the ramp is written — so
       * ramping without an anchor at `t` glides across the whole of the
       * preceding note instead of across 100ms of it. The offline gate in
       * lib/debug.ts caught exactly that: every swara was landing up to 133
       * cents off because none of them was ever actually held.
       */
      osc.frequency.setValueAtTime(prev, t)
      osc.frequency.exponentialRampToValueAtTime(f, t + 0.1)
      env.gain.setValueAtTime(peak, t)
      env.gain.exponentialRampToValueAtTime(peak * 0.6, t + 0.035)
      env.gain.exponentialRampToValueAtTime(peak, t + 0.13)
    }
    prev = f

    vibAmt.gain.setValueAtTime(1.5, t)
    vibAmt.gain.linearRampToValueAtTime(dur > 0.7 ? 17 : 7, t + dur * 0.9)

    t += dur
  }

  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)

  const end = t + 0.7
  osc.start(at)
  vib.start(at)
  osc.stop(end)
  vib.stop(end)
  breath?.start(at)
  breath?.stop(end)

  return end
}

export const sound = new Sound()
