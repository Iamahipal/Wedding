'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

import { film } from '@/lib/film'
import { sound } from '@/lib/sound'

/**
 * TRAP 23, second half: a page that can make noise should say so *before* it
 * makes any. This control is rendered from the very first frame, in the first
 * paint, before the film has done anything — so nobody is ever surprised by
 * audio, and nobody has to hunt for the way to stop it.
 *
 * It is one of only two pieces of React state in the whole application (the
 * other is nothing), and it is deliberately nowhere near the scroll path: it
 * changes at most a handful of times in a session, on a click.
 */
export default function SoundToggle() {
  const [on, setOn] = useState(false)
  const [pending, setPending] = useState(false)
  const drain = useRef<(() => void) | null>(null)
  /** Once someone turns it off on purpose, it stays off. */
  const silenced = useRef(false)

  const toggle = useCallback(async () => {
    if (on) {
      silenced.current = true
      sound.mute()
      film.audioUnlocked = false
      setOn(false)
      return
    }
    silenced.current = false
    setPending(true)
    const ok = await sound.unlock()
    setPending(false)
    if (ok) {
      film.audioUnlocked = true
      setOn(true)
    }
  }, [on])

  /**
   * Sound on by default — as far as a browser will actually permit.
   *
   * It cannot simply play on load. Every browser blocks audio until a real user
   * gesture, and this is worth being precise about: a **wheel scroll does not
   * count**. Someone can scroll the entire film on a laptop without ever
   * producing a gesture the audio policy accepts.
   *
   * So rather than making anyone hunt for this button, the first gesture of any
   * kind — a tap, a click, a key — arms it. On a phone that is the moment they
   * touch the screen to scroll, which is effectively "on by default". The
   * control still renders from the first frame (TRAP 23), so a page that is
   * about to make noise has already said so.
   */
  useEffect(() => {
    if (on || silenced.current) return

    let armed = false
    const arm = async () => {
      if (armed || silenced.current) return
      armed = true
      const ok = await sound.unlock()
      if (ok && !silenced.current) {
        film.audioUnlocked = true
        setOn(true)
      }
    }

    const events = ['pointerdown', 'touchend', 'keydown'] as const
    for (const e of events) window.addEventListener(e, arm, { once: true, passive: true })
    return () => {
      for (const e of events) window.removeEventListener(e, arm)
    }
  }, [on])

  useEffect(() => {
    /**
     * Beats are drained on GSAP's ticker — the same clock Lenis and every
     * ScrollTrigger run on. A separate rAF loop here would put the bell a frame
     * away from the image that is supposed to have caused it.
     */
    const tick = () => {
      if (film.beats.length === 0) return
      const beats = film.beats.splice(0, film.beats.length)
      if (!film.audioUnlocked) return // drained and discarded; nothing notices
      for (const b of beats) sound.beat(b)
      sound.setIntensity(film.damped.bloom / 2)
    }
    drain.current = tick
    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
    }
  }, [])

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? 'Turn sound off' : 'Turn sound on'}
      className="chrome group fixed right-4 top-4 z-40 flex items-center gap-2.5 rounded-full border border-gold-700/60 bg-void/70 px-4 py-2 font-[family-name:var(--font-ui)] text-[0.6rem] uppercase tracking-[0.2em] text-gold-300/90 backdrop-blur-sm transition-colors duration-500 hover:border-gold-400/80 hover:text-gold-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 sm:right-6 sm:top-6"
    >
      <span aria-hidden="true" className="flex h-3 items-end gap-[2px]">
        {[0.45, 1, 0.7].map((h, i) => (
          <span
            key={i}
            className="w-[2px] origin-bottom bg-current transition-transform duration-500"
            style={{ height: '100%', transform: `scaleY(${on ? h : 0.18})` }}
          />
        ))}
      </span>
      {pending ? 'wait' : on ? 'Sound on' : 'Sound'}
    </button>
  )
}
