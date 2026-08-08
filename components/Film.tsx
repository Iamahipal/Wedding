'use client'

import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

import { ACT_ORDER, ACT_RANGE, emitBeat, film, setStage, updateFilm, type ActName } from '@/lib/film'
import { domRefs } from '@/lib/domRefs'
import { smoothstep } from '@/lib/math'
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

    // StrictMode mounts effects twice in development; without this the caption
    // registry accumulates duplicates and the render loop does the same work
    // twice for every block.
    domRefs.captions.length = 0

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

        // the render loop enforces the act boundary on this block — see
        // lib/domRefs.ts for why a scrubbed fade cannot do it alone
        domRefs.captions.push({ act, el: block })

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
      //  वायु — the breath names itself, then gets out of the way: प्राण owns
      //  the centre of the frame from 62% of the act onward
      caption('vayu', { in: 0.25, hold: 2.0, span: 0.55 })
      //  अग्नि — the seven steps get their own reveal, below
      caption('agni', { in: 0.2, hold: 2.6 })
      //  जल — stillness
      caption('jal', { in: 0.4, hold: 2.3 })
      //  पृथ्वी — the mandap, then the names
      caption('prithvi', { in: 0.3, hold: 2.5 })
      //  गठबंधन — the knot, and then the invitation proper
      caption('gathbandhan', { in: 0.25, hold: 2.7 })

      /* ── the seven steps ─────────────────────────────────────────────────
       * No ScrollTriggers here at all any more.
       *
       * The vows are gold in the scene now — see components/acts/Saptapadi.tsx
       * — and what survives on this layer is one line of meaning at a time. It
       * is driven straight from the render loop against the *same* schedule
       * that ignites each word, because a scrubbed tween and a shader uniform
       * reading two different clocks is exactly how a caption ends up naming
       * the vow before or after the one that is actually alight.
       * ------------------------------------------------------------------- */
      domRefs.steps = Array.from(document.querySelectorAll<HTMLElement>('[data-step]'))

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
      /**
       * Both halves, one loop. The celebration's blocks reveal exactly like the
       * invitation's — the difference between the two halves is colour and
       * pace, not a second set of motion rules.
       *
       * `once: true` matters more down here than it did above. Seven full-bleed
       * panels means a hundred or so blocks, and a trigger that keeps toggling
       * is a trigger still doing work on every scroll for the rest of the page.
       *
       * TRAP 22 — reduced motion still *presents* every block. The CSS branch
       * already sets `[data-reveal] { opacity: 1 }`, and this clears the inline
       * transform so nothing is left offset by a tween that never ran.
       */
      const readable = Array.from(
        document.querySelectorAll<HTMLElement>('[data-invite] [data-reveal], [data-utsav] [data-reveal]'),
      )
      if (reduced) {
        gsap.set(readable, { opacity: 1, y: 0 })
      } else {
        for (const el of readable) {
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

        /* ── the handoff: the doors open into उत्सव ────────────────────────
         * The gatefold card is the hinge between the two halves, so this is
         * the one place in the piece where the film ends and something else
         * begins. Both things happen on this single scrub:
         *
         *   the gold recedes   film.stage 1 → 0, and the canvas stops drawing
         *   colour arrives     --utsav-in 0 → 1, the celebration's ground
         *
         * The two curves are deliberately offset rather than crossfaded. A
         * straight dissolve would put half-lit gold over half-lit saffron in
         * the middle, which is the colour of neither half; staggering them
         * leaves a beat of near-black between the two, and the celebration
         * lands *out* of the dark rather than through it.
         *
         * Offsetting also keeps the section above the card readable while it
         * is still on screen: --utsav-in does not move at all until the last
         * three quarters of the zone, by which time everything but the folio
         * has scrolled off the top.
         * -------------------------------------------------------------- */
        const html = document.documentElement
        const handoff = (p: number) => {
          /**
           * The exponent is not a flourish.
           *
           * The film's last shot is a bloomed gold knot on black, and bloom is
           * bright: at a linear 30% opacity it is still unmistakably a glowing
           * ring, sitting behind the celebration's first colour. Raising the
           * curve makes "half way through the handoff" actually look half way
           * through, which a linear crossfade of an HDR image never does.
           */
          setStage((1 - smoothstep(0, 0.62, p)) ** 1.8)
          html.style.setProperty('--utsav-in', smoothstep(0.3, 1, p).toFixed(3))
          // The film's chrome goes with the film — see `.chrome` in globals.css.
          // An attribute rather than another number, because what the sound
          // control needs is to stop being *clickable*, and no amount of
          // opacity does that.
          html.toggleAttribute('data-film-over', p > 0.35)
        }

        ScrollTrigger.create({
          trigger: folioStage,
          start: 'bottom 84%',
          /**
           * Ends on the invocation, not on the card.
           *
           * A range measured entirely against the folio is a range whose length
           * depends on how tall the folio happens to be, and the thing that
           * actually has to be true is that the film is dark *before* the first
           * coloured thing can be read. Anchoring the end on ॐ श्री गणेशाय नमः
           * states that directly, and `.u-open`'s top padding is what buys the
           * room for it.
           */
          endTrigger: '.u-invocation',
          end: 'top 58%',
          onUpdate: (self) => handoff(self.progress),
          onRefresh: (self) => handoff(self.progress),
          // onUpdate stops firing once the playhead is outside the range, and
          // the endpoints are exactly where this has to be right
          onLeave: () => handoff(1),
          onLeaveBack: () => handoff(0),
        })
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
      /**
       * *Merged*, never assigned. lib/debug.ts hangs the capture half of the
       * harness — shot, sample, settle, scene, gl — off this same object from
       * inside the Canvas, and the two effects have no ordering guarantee.
       * Replacing the object wholesale silently deletes whichever half lost the
       * race, which presents as `__film.shot is not a function` on some reloads
       * and not others.
       */
      const w0 = window as unknown as Record<string, Record<string, unknown>>
      Object.assign((w0.__film ??= {}), {
        state: film,
        seek,
        acts: ACT_ORDER,
        /** jump to a named act at a local progress, e.g. __film.act('agni', 0.5) */
        act: (name: ActName, p = 0.5) => {
          const [a, b] = ACT_RANGE[name]
          seek(a + (b - a) * p)
        },
        /**
         * Scroll anywhere on the page, including past the end of the film, and
         * settle every trigger before returning.
         *
         * `seek` only reaches the film's own range, which was the whole page
         * until उत्सव existed. It is not a convenience: ScrollTrigger defers its
         * work to gsap.ticker, so a plain window.scrollTo in a tab that is not
         * compositing frames moves the page and updates nothing — the handoff
         * and every reveal below it stay exactly where they were, and any
         * measurement taken there reports confident nonsense. Same lesson as
         * TRAP 18 and the polling ResizeObserver: the harness must not depend on
         * anybody looking at the tab.
         */
        to: (y: number) => {
          const max = document.documentElement.scrollHeight - window.innerHeight
          const clamped = Math.max(0, Math.min(y, max))
          if (lenis) lenis.scrollTo(clamped, { immediate: true, force: true })
          else window.scrollTo(0, clamped)
          ScrollTrigger.update()
          return clamped
        },
        /** where a section starts, so `to` can be aimed by name rather than by pixel */
        top: (selector: string) => {
          const el = document.querySelector(selector)
          return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null
        },
      })

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

      /* Deep links for the harness. `?t=` scrubs the film; `?at=` aims at a
         selector anywhere on the page, which is the only way to photograph the
         celebration in a headless browser — there is no film progress that
         corresponds to "the हल्दी panel". */
      const params = new URLSearchParams(window.location.search)
      const t0 = params.get('t')
      if (t0 !== null) requestAnimationFrame(() => seek(parseFloat(t0) || 0))

      ScrollTrigger.refresh()

      /**
       * Aimed *after* the refresh, and synchronously.
       *
       * `?t=` above defers a frame to let layout settle, which is the obvious
       * thing to do and is exactly what makes it useless in a headless capture:
       * a tab that is not being composited never runs a requestAnimationFrame
       * callback at all, so the deep link silently does nothing and the shot
       * comes back showing the top of the page. The refresh has already forced
       * every measurement this needs, so there is nothing left to wait for.
       */
      const at = params.get('at')
      if (at) {
        const el = document.querySelector(at)
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY + (Number(params.get('off')) || 0)
          const max = document.documentElement.scrollHeight - window.innerHeight
          const clamped = Math.max(0, Math.min(y, max))
          if (lenis) lenis.scrollTo(clamped, { immediate: true, force: true })
          else window.scrollTo(0, clamped)
          ScrollTrigger.update()
        }
      }

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
