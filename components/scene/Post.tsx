'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  SMAA,
  ToneMapping,
  wrapEffect,
} from '@react-three/postprocessing'
import {
  BlendFunction,
  ToneMappingMode,
  type BloomEffect,
  type ChromaticAberrationEffect,
  type EffectComposer as EffectComposerImpl,
  type NoiseEffect,
} from 'postprocessing'
import * as THREE from 'three'

import { film, STAGE_OFF } from '@/lib/film'
import { HeatShimmerEffect } from './effects/HeatShimmer'

const HeatShimmer = wrapEffect(HeatShimmerEffect)

/**
 * The post chain.
 *
 * TRAP 3 — AgX, not ACES. ACES desaturates blown highlights hard toward white,
 * so gold stops being gold at exactly the moment it gets bright, which in this
 * film is every moment that matters. AgX holds hue far into the highlights.
 * This one line is worth more than any amount of material tweaking.
 *
 * TRAP 4 — the bloom threshold stays high. Low thresholds bloom everything and
 * the whole scene collapses into a monochrome starfield.
 *
 * TRAP 12 — chromatic aberration is exactly zero at rest. It is a motion cue;
 * a sub-pixel offset at rest resamples 1px particles across the channels and
 * speckles the entire field magenta and green.
 *
 * TRAP 13 — there is no vignette, and there will not be one.
 *
 * Every parameter below is driven by mutating the effect instance inside
 * useFrame. None of it is React state: this component renders exactly once.
 */
export default function Post() {
  const composer = useRef<EffectComposerImpl>(null)
  const bloom = useRef<BloomEffect>(null)
  const chroma = useRef<ChromaticAberrationEffect>(null)
  const grain = useRef<NoiseEffect>(null)
  const shimmer = useRef<HeatShimmerEffect>(null)

  const zero = useMemo(() => new THREE.Vector2(0, 0), [])

  useFrame(() => {
    /* ── the handoff ───────────────────────────────────────────────────────
     * Once उत्सव owns the screen the film must stop *drawing*, not just stop
     * being visible: bloom is a fullscreen convolution and costs the same over
     * an empty scene as over a full one, so hiding the acts saves the geometry
     * and none of the expensive part.
     *
     * A disabled pass is skipped by EffectComposer.render outright, so with all
     * of them off the render call is an empty loop — zero draw calls, zero
     * fragment work — while the renderer, the composer and its render targets
     * are left exactly as they were. That last part is the whole point: TRAP 14
     * is about reconfiguring a live renderer, and nothing here does.
     *
     * This runs at the default priority, so it lands before the composer's own
     * subscriber at priority 1 and takes effect in the same frame.
     * ------------------------------------------------------------------- */
    const c = composer.current
    if (c) {
      const live = film.stage >= STAGE_OFF
      for (const pass of c.passes) if (pass.enabled !== live) pass.enabled = live
      if (!live) return
    }

    const d = film.damped

    if (bloom.current) {
      bloom.current.intensity = d.bloom + film.bloomBias
      bloom.current.luminanceMaterial.threshold = d.threshold
    }
    if (grain.current) {
      grain.current.blendMode.opacity.value = d.grain
    }
    if (shimmer.current) {
      shimmer.current.strength = d.shimmer
      // the shimmer follows the fire rather than sitting at a fixed point:
      // the camera circles it, so a hard-coded centre would slide off the
      // flame and distort empty air on every circuit
      shimmer.current.setCenter(film.fireScreen[0], film.fireScreen[1])
    }
    if (chroma.current) {
      const c = film.chroma
      // hard zero, not an asymptote toward it
      if (c === 0) chroma.current.offset.copy(zero)
      else chroma.current.offset.set(c * 0.0011, c * 0.0007)
    }
  })

  return (
    <EffectComposer
      ref={composer}
      multisampling={0}
      enableNormalPass={false}
      frameBufferType={THREE.HalfFloatType}
    >
      <Bloom
        ref={bloom}
        mipmapBlur
        intensity={1.15}
        luminanceThreshold={0.78}
        luminanceSmoothing={0.22}
        radius={0.72}
      />
      <HeatShimmer ref={shimmer} strength={0} radius={0.62} />
      <ChromaticAberration
        ref={chroma}
        offset={zero}
        radialModulation
        modulationOffset={0.35}
        blendFunction={BlendFunction.NORMAL}
      />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <SMAA />
      {/**
       * Grain last — and *premultiplied*, which is not the obvious choice and
       * is load-bearing.
       *
       * Everything after the tone mapper works in display-linear, and the
       * output pass then applies the sRGB transfer curve on top. An additive
       * grain of 0.022 is therefore not a 2% effect: encoded, it lands at
       * 40/255, and on a film whose first shot is meant to be black it lifted
       * the entire frame to a flat neutral grey with the void invisible
       * underneath it. Measured, not guessed — see lib/debug.ts.
       *
       * Premultiplying scales the grain by the image, so it behaves the way
       * film grain actually behaves: present in the mid-tones and highlights,
       * absent where there is no exposure. The blacks get their dither from the
       * backdrop shader instead, which does it in scene-linear where 1/255 is
       * still 1/255.
       */}
      <Noise ref={grain} premultiply blendFunction={BlendFunction.SCREEN} opacity={0.06} />
    </EffectComposer>
  )
}
