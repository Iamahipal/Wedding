import Devanagari from './Devanagari'
import { ACT_ORDER, type ActName } from '@/lib/film'
import { actCopy, saptapadi } from '@/lib/content'

/**
 * The text layer: fixed above the canvas, never scrolled, never re-rendered.
 *
 * Acts stay dumb and so does this — every element here is inert markup with a
 * `data-*` hook on it, and every fade, stagger and hold is authored in
 * Film.tsx. Re-timing the film means editing one file; re-writing the copy
 * means editing another.
 *
 * Everything that animates in from nothing is also hidden in CSS via
 * `[data-reveal]` (TRAP 15). Between first paint and hydration there is no
 * GSAP, and anything relying on the timeline alone flashes at full opacity
 * before the timeline exists to hide it.
 */

/** Where each act's caption sits, so the text never lands on top of the subject. */
const PLACEMENT: Record<ActName, string> = {
  shunya: 'items-end pb-[14vh]',
  akasha: 'items-end pb-[16vh]',
  // Low, never centred. प्राण resolves dead centre, and a caption sharing that
  // space is a caption printed across the word. Horizontally centred still —
  // this is read on a phone first.
  vayu: 'items-end pb-[15vh]',
  agni: 'items-start pt-[12vh]',
  jal: 'items-start pt-[11vh]',
  prithvi: 'items-start pt-[10vh]',
  gathbandhan: 'items-end pb-[15vh]',
}

export default function Overlay() {
  return (
    <div className="caption-layer">
      {ACT_ORDER.map((act) => {
        const copy = actCopy[act]
        return (
          <div
            key={act}
            data-caption={act}
            className={`absolute inset-0 flex justify-center px-6 ${PLACEMENT[act]}`}
          >
            <div className="max-w-[44rem] text-center">
              <div data-reveal className="flex justify-center text-gold-200">
                <Devanagari
                  name={copy.devanagariKey}
                  gradient
                  height="clamp(2.4rem, 7vw, 4.6rem)"
                />
              </div>

              <p data-reveal className="eyebrow mt-5">
                {copy.roman} · {copy.english}
              </p>

              <p
                data-reveal
                className="mt-4 text-[clamp(1rem,2.4vw,1.35rem)] font-light leading-relaxed text-gold-100/80"
              >
                {copy.line}
              </p>
            </div>
          </div>
        )
      })}

      {/* ── the seven steps ────────────────────────────────────────────────
          The words themselves are in the scene now — cut in gold and lit one
          at a time in a ring around the fire (components/acts/Saptapadi.tsx).
          What is left here is only their meaning, one line at a time, because
          a guest who cannot read Devanagari should still know what is being
          promised.

          These are the *themes* of the vows: each is the single Sanskrit word
          its step is named for. The full Saptapadi mantras are liturgical
          text that varies by tradition, region and family, and are
          deliberately not reproduced or approximated anywhere in this film.
          ---------------------------------------------------------------- */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center pb-[11vh]">
        <div className="relative h-16 w-full max-w-[34rem] px-6">
          {saptapadi.map((step, i) => (
            <div
              key={step.key}
              data-step={i + 1}
              className="absolute inset-x-0 top-0 flex flex-col items-center text-center"
            >
              <p className="eyebrow">{step.roman}</p>
              <p className="mt-2 text-[clamp(0.88rem,2vw,1.05rem)] font-light text-gold-100/70">
                {step.english}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
