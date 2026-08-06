'use client'

import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

import { ACT_ORDER, ACT_RANGE, emitBeat, film, updateFilm, type ActName } from '@/lib/film'
import type { FolioHandle } from './Folio'

gsap.registerPlugin(ScrollTrigger)

/**
 * Film.tsx — the whole shot list. Every ScrollTrigger in the piece is here, in
 * scene order, so the choreography reads top-to-bottom like a shot list and the
 * film can be re-timed without opening a single act.
 *
 * Nothing in this file calls setState. Scroll writes into lib/film.ts and the
 * render loop reads it; the only other thing it touches is GSAP tweens on DOM
 * overlay elements, which GSAP mutates directly.
 */
export default function Film() {
  useLayoutEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    film.reducedMotion = reduced

    const ctx = gsap.context(() => {
      /* ── Lenis ⇄ GSAP ────────────────────────────────────────────────────
       * Three details do most of the "feel":
       *
       * 1. autoRaf: false, and Lenis ticked from gsap.ticker. One clock — so
       *    scroll interpolation and every ScrollTrigger resolve in the same
       *    frame. Two loops leaves a frame of lag between the DOM and the WebGL
       *    that reads, unmistakably, as cheap.
       *
       * 2. lagSmoothing(0). A heavy frame must not be allowed to rewind GSAP's
       *    clock; on a scrubbed sequence that surfaces as a visible hitch.
       *
       * 3. lenis.on('scroll', ScrollTrigger.update). No scrollerProxy is needed
       *    at all — Lenis moves the real window scroll position.
       * ------------------------------------------------------------------- */
      let lenis: Lenis | null = null
      let tick: ((time: number) => void) | null = null

      if (!reduced) {
        lenis = new Lenis({
          autoRaf: false,
          duration: 1.15,
          easing: (t) => 1 - Math.pow(1 - t, 3),
          smoothWheel: true,
          wheelMultiplier: 1,
          touchMultiplier: 1.7,
        })

        lenis.on('scroll', (e: { velocity: number }) => {
          ScrollTrigger.update()
          // normalised to roughly -1..1; drives the motion-only chromatic
          // aberration and nothing else
          film.velocity = Math.max(-1.5, Math.min(1.5, e.velocity / 38))
        })

        tick = (time: number) => lenis!.raf(time * 1000)
        gsap.ticker.add(tick)
        gsap.ticker.lagSmoothing(0)
      } else {
        film.velocity = 0
      }

      ScrollTrigger.config({ ignoreMobileResize: true })

      /* ── the master playhead ─────────────────────────────────────────────
       * The single writer of film.t. Everything else in the film is derived
       * from this inside lib/film.ts.
       * ------------------------------------------------------------------- */
      const master = ScrollTrigger.create({
        trigger: '[data-film]',
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => updateFilm(self.progress),
        onRefresh: (self) => updateFilm(self.progress),
      })

      /* ── captions, act by act, in scene order ────────────────────────────
       * Each act's caption fades up over its first fifth and away over its
       * last. The elements start hidden in CSS as well as here (TRAP 15) —
       * between first paint and hydration there is no GSAP, and anything that
       * only hides itself in a timeline flashes at full opacity first.
       * ------------------------------------------------------------------- */
      /**
       * `span` is the fraction of the act the caption timeline is spread over.
       *
       * It exists because a scrubbed timeline is normalised to its trigger's
       * range: whatever the last tween is, it finishes at the *end* of the act.
       * So a caption could not be made to leave early by re-timing it — moving
       * the fade-out earlier just made the whole timeline slower and it still
       * ended at the same place. Shunya needs its caption gone before the
       * mantra arrives at readable size, and the only way to get that is to end
       * the trigger early rather than to shuffle keyframes inside it.
       */
      const caption = (act: ActName, opts: { in: number; hold: number; span?: number }) => {
        const span = opts.span ?? 1
        const section = document.querySelector<HTMLElement>(`[data-act="${act}"]`)
        const block = document.querySelector<HTMLElement>(`[data-caption="${act}"]`)
        if (!section || !block) return
        const lines = Array.from(block.querySelectorAll<HTMLElement>('[data-reveal]'))
        if (!lines.length) return

        if (reduced) {
          /**
           * Every caption block is `absolute inset-0`, so simply revealing them
           * all — which is what "no animation" naively means — stacks seven
           * captions on top of one another and renders the whole overlay
           * illegible.
           *
           * Reduced motion still needs *one* caption at a time. So the switch
           * is discrete: the block is shown or hidden outright as its act takes
           * the playhead. A hard cut is not motion; a fade is.
           */
          gsap.set(lines, { opacity: 1, y: 0 })
          block.style.opacity = '0'
          ScrollTrigger.create({
            trigger: section,
            start: 'top top',
            // same reasoning as the scrubbed path: Shunya's caption has to be
            // out of the frame before the mantra reaches it
            end: span >= 1 ? 'bottom top' : `top+=${span * 100}% top`,
            onToggle: (self) => {
              block.style.opacity = self.isActive ? '1' : '0'
            },
          })
          return
        }

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: span >= 1 ? 'bottom top' : `top+=${span * 100}% top`,
            scrub: 0.7,
          },
        })
        tl.fromTo(
          lines,
          { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: 1, stagger: 0.16, ease: 'power2.out' },
          opts.in,
        ).to(lines, { opacity: 0, y: -18, duration: 0.7, stagger: 0.08, ease: 'power2.in' }, opts.hold)
      }

      //  शून्य — held black, then the point of light, then the mantra.
      //  Gone by 44% of the act: the mantra emerges from the residual glow at
      //  46% and must arrive into an empty frame, not onto a caption.
      caption('shunya', { in: 0.15, hold: 2.1, span: 0.44 })
      //  आकाश — the nakshatras resolve, then the muhurat
      caption('akasha', { in: 0.35, hold: 2.4 })
      //  वायु — breath
      caption('vayu', { in: 0.3, hold: 2.2 })
      //  अग्नि — the seven steps get their own reveal, below
      caption('agni', { in: 0.2, hold: 2.6 })
      //  जल — stillness
      caption('jal', { in: 0.4, hold: 2.3 })
      //  पृथ्वी — the mandap, then the names
      caption('prithvi', { in: 0.3, hold: 2.5 })
      //  गठबंधन — the knot, and then the invitation proper
      caption('gathbandhan', { in: 0.25, hold: 2.7 })

      /* ── the seven steps ─────────────────────────────────────────────────
       * Seven rotations of the camera, seven vows. Each step resolves as its
       * circuit is completed, so the reveal is locked to the pradakshina in
       * lib/film.ts rather than to an independent clock.
       * ------------------------------------------------------------------- */
      const agni = document.querySelector<HTMLElement>('[data-act="agni"]')
      const steps = Array.from(document.querySelectorAll<HTMLElement>('[data-step]'))
      if (agni && steps.length) {
        if (reduced) {
          // same problem, same answer: the seven vows share one absolutely
          // positioned box, so they are switched one at a time rather than all
          // revealed at once
          gsap.set(steps, { opacity: 0, y: 0 })
          steps.forEach((el, i) => {
            ScrollTrigger.create({
              trigger: agni,
              start: `top+=${(i / steps.length) * 100}% top`,
              end: `top+=${((i + 1) / steps.length) * 100}% top`,
              onToggle: (self) => {
                el.style.opacity = self.isActive ? '1' : '0'
              },
            })
          })
        } else {
          steps.forEach((el, i) => {
            const start = (i + 0.35) / steps.length
            const end = (i + 1.0) / steps.length
            gsap.fromTo(
              el,
              { opacity: 0, y: 18 },
              {
                opacity: 1,
                y: 0,
                ease: 'power2.out',
                scrollTrigger: {
                  trigger: agni,
                  start: `top+=${start * 100}% top`,
                  end: `top+=${end * 100}% top`,
                  scrub: 0.5,
                },
              },
            )
            gsap.to(el, {
              opacity: 0,
              y: -14,
              ease: 'power2.in',
              scrollTrigger: {
                trigger: agni,
                start: `top+=${(end + 0.02) * 100}% top`,
                end: `top+=${(end + 0.14) * 100}% top`,
                scrub: 0.5,
              },
            })
          })
        }
      }

      /* ── beats for the sound layer ───────────────────────────────────────
       * Named moments, emitted once as the playhead crosses them. The sound
       * layer drains this queue; if audio was never unlocked, the beats are
       * simply discarded and nothing else in the film notices.
       * ------------------------------------------------------------------- */
      const beat = (act: ActName, at: number, name: string) => {
        const section = document.querySelector<HTMLElement>(`[data-act="${act}"]`)
        if (!section) return
        ScrollTrigger.create({
          trigger: section,
          start: `top+=${at * 100}% center`,
          onEnter: () => emitBeat(name),
          onEnterBack: () => emitBeat(name),
        })
      }
      beat('shunya', 0.3, 'ignite')
      beat('shunya', 0.42, 'detonate')
      beat('akasha', 0.62, 'align')
      beat('vayu', 0.25, 'wind')
      beat('agni', 0.08, 'fire')
      beat('jal', 0.15, 'still')
      beat('prithvi', 0.55, 'mandap')
      beat('gathbandhan', 0.5, 'knot')

      /* ── the invitation ──────────────────────────────────────────────────
       * Out of the film and into plain reading. One reveal per block, once,
       * on the way down — nothing here scrubs, because scrubbing text you are
       * trying to read is an effect at the reader's expense.
       * ------------------------------------------------------------------- */
      const invite = document.querySelector('[data-invite]')
      if (invite) {
        const blocks = Array.from(invite.querySelectorAll<HTMLElement>('[data-reveal]'))
        if (reduced) {
          gsap.set(blocks, { opacity: 1, y: 0 })
        } else {
          for (const el of blocks) {
            gsap.fromTo(
              el,
              { opacity: 0, y: 24 },
              {
                opacity: 1,
                y: 0,
                duration: 0.9,
                ease: 'power2.out',
                scrollTrigger: { trigger: el, start: 'top 88%', once: true },
              },
            )
          }
        }
      }

      /* ── the folio ───────────────────────────────────────────────────────
       * The card opens itself as it arrives, and that is the *primary* way it
       * opens rather than a flourish on top of hover. Half the people who see
       * this will be on a phone, where `hover` does not exist — a card that
       * only opens on hover is a card that never opens.
       *
       * This is React state being set from a ScrollTrigger, which the film
       * forbids everywhere else. The rule exists because scroll fires dozens of
       * times a second; these are onEnter/onLeave callbacks that fire twice per
       * visit, and the alternative — hand-rolling a state machine into refs to
       * satisfy a rule about per-frame writes — would buy nothing.
       * ------------------------------------------------------------------- */
      const folioStage = document.querySelector<HTMLElement>('[data-folio-stage]')
      const folio = document.querySelector<HTMLElement & { __folio?: FolioHandle }>('[data-folio]')

      if (folioStage && folio) {
        ScrollTrigger.create({
          trigger: folioStage,
          start: 'top 68%',
          end: 'bottom 32%',
          onEnter: () => folio.__folio?.open(),
          onEnterBack: () => folio.__folio?.open(),
          // never yank a card shut while the reader is holding one of its
          // inserts out — closing is only ever a return to `closed` from `open`
          onLeave: () => folio.__folio?.close(),
          onLeaveBack: () => folio.__folio?.close(),
        })

        if (!reduced) {
          // A slow tilt as it passes, written straight to the element by GSAP.
          // --folio-tilt is registered with @property, so it interpolates as an
          // angle instead of snapping between two strings.
          gsap.fromTo(
            folio,
            { '--folio-tilt': '7deg' },
            {
              '--folio-tilt': '-5deg',
              ease: 'none',
              scrollTrigger: {
                trigger: folioStage,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.7,
              },
            },
          )
        }
      }

      /* ── the scrub harness ───────────────────────────────────────────────
       * TRAP 18. A three-second opening cannot be sampled on a wall clock —
       * under a software renderer a screenshot costs longer than a beat, and
       * you will silently photograph either side of the explosion and conclude
       * it never happened. So the master timeline is exposed and scrubbed to
       * exact progress values, like a video.
       *
       *   __film.seek(0.07)   jump to 7% of the film
       *   __film.state.active which act owns the playhead
       * ------------------------------------------------------------------- */
      const seek = (t: number) => {
        const clamped = Math.max(0, Math.min(1, t))
        const y = master.start + (master.end - master.start) * clamped
        if (lenis) lenis.scrollTo(y, { immediate: true })
        else window.scrollTo(0, y)
        ScrollTrigger.update()
        updateFilm(clamped)
      }
      film.seek = seek
      ;(window as unknown as Record<string, unknown>).__film = {
        state: film,
        seek,
        acts: ACT_ORDER,
        /** jump to a named act at a local progress, e.g. __film.act('agni', 0.5) */
        act: (name: ActName, p = 0.5) => {
          const [a, b] = ACT_RANGE[name]
          seek(a + (b - a) * p)
        },
      }

      /* ── the chrome arrives a beat late ──────────────────────────────────
       * The opening is meant to be nothing at all, and it is not nothing if
       * the sound control and the placeholder badge are already sitting on it.
       * They fade up on a timer, or the moment the viewer scrolls — whichever
       * happens first, so the control is always on screen well before the film
       * is capable of making a sound.
       * ------------------------------------------------------------------- */
      const showChrome = () => {
        document.documentElement.dataset.chrome = 'ready'
      }
      const chromeTimer = window.setTimeout(showChrome, reduced ? 0 : 1800)
      window.addEventListener('scroll', showChrome, { once: true, passive: true })

      // read by components/Diag.tsx — proves the effect reached the end rather
      // than throwing somewhere in the middle and leaving a half-built film
      const w = window as unknown as Record<string, unknown>
      w.__filmReady = true
      w.__triggerCount = ScrollTrigger.getAll().length
      w.__lenis = lenis ? 'lenis' : reduced ? 'native (reduced)' : 'none'

      const params = new URLSearchParams(window.location.search)
      const t0 = params.get('t')
      if (t0 !== null) requestAnimationFrame(() => seek(parseFloat(t0) || 0))

      ScrollTrigger.refresh()

      return () => {
        if (tick) gsap.ticker.remove(tick)
        lenis?.destroy()
        window.clearTimeout(chromeTimer)
        window.removeEventListener('scroll', showChrome)
      }
    })

    return () => ctx.revert()
  }, [])

  return null
}
