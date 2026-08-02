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

export class Sound {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private droneGain: GainNode | null = null
  private droneNodes: OscillatorNode[] = []
  private noiseBuffer: AudioBuffer | null = null

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
      case 'knot':
        this.bell(1, 196)
        break
    }
  }
}

export const sound = new Sound()
