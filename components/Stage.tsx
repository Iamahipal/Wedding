'use client'

import { useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { installHarness, PollingResizeObserver } from '@/lib/debug'
import Acts from './acts'
import Backdrop from './scene/Backdrop'
import CameraRig from './scene/CameraRig'
import FrameDriver from './scene/FrameDriver'
import GoldEnvironment from './scene/GoldEnvironment'
import Post from './scene/Post'
import { film } from '@/lib/film'

/**
 * Read once, at module scope. Everything here is a mount-time decision — none of
 * it may ever become React state, because changing it re-renders the <Canvas>
 * subtree (TRAP 14) and that races the Environment portal and the loader
 * Suspense boundaries into an *intermittent* crash.
 */
function mountConfig() {
  if (typeof window === 'undefined') return { dpr: 1, debug: false }

  const debug = new URLSearchParams(window.location.search).has('debug')

  /**
   * DPR is capped here and never touched again. drei's PerformanceMonitor is
   * the obvious tool for this and it is the exact thing TRAP 14 warns about: it
   * drives DPR through React state, so it re-renders the canvas mid-mount.
   *
   * A static cap costs a little sharpness on a very high-density screen and
   * buys a scene that never crashes. That trade is not close.
   */
  const cores = navigator.hardwareConcurrency ?? 4
  const lowEnd = cores <= 4
  const dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.25 : 1.75)

  // Acts read this once, when they build their geometry, to decide particle
  // counts and shader step budgets. Like DPR it is a mount-time decision and
  // never changes, so nothing downstream can be re-rendered by it.
  film.lowEnd = lowEnd

  return { dpr, debug }
}

/** Debug only: hands the renderer to the scrub-and-capture harness. */
function DebugBridge() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const advance = useThree((s) => s.advance)

  useEffect(() => {
    installHarness({ gl, scene, camera, advance, seek: (t) => film.seek(t) })
  }, [gl, scene, camera, advance])

  return null
}

export default function Stage() {
  const cfg = useRef(mountConfig()).current

  return (
    <Canvas
      // `flat` = NoToneMapping on the renderer. The composer owns tone mapping,
      // and it uses AgX (TRAP 3). Two tone mappers would be one too many.
      flat
      dpr={cfg.dpr}
      frameloop="always"
      // R3F will not create the renderer until a ResizeObserver callback tells
      // it the container has a size. A tab that is not being composited never
      // delivers one — observer callbacks are part of the event loop's
      // rendering steps — so under ?debug we poll instead and the harness can
      // capture frames from a page nobody is looking at.
      resize={cfg.debug ? { polyfill: PollingResizeObserver as unknown as typeof ResizeObserver } : undefined}
      gl={{
        antialias: false, // SMAA in the post chain instead — cheaper on mobile
        alpha: false,
        stencil: false,
        powerPreference: 'high-performance',
        // TRAP 19. canvas.toBlob() on a WebGL canvas returns a blank image
        // without this, and a pixel-measurement harness built on it will report
        // confident zeros. Debug builds only — it costs a buffer copy.
        preserveDrawingBuffer: cfg.debug,
      }}
      camera={{ fov: 38, near: 0.2, far: 3200, position: [0, 0, 6] }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(new THREE.Color('#050301'), 1)
        scene.environmentRotation = new THREE.Euler(0, 0, 0)
        if (cfg.debug) {
          ;(window as unknown as Record<string, unknown>).__stage = { gl, scene, film }
        }
      }}
    >
      {cfg.debug && <DebugBridge />}
      <FrameDriver />
      <CameraRig />
      <Backdrop />
      <GoldEnvironment />
      <Acts />
      <Post />
    </Canvas>
  )
}
