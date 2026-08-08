import { CRANE } from '@/lib/ornament'

/**
 * सारस — a flight of cranes.
 *
 * ── on the clock they run on ──────────────────────────────────────────────
 * These fly on *time*, not on scroll, and that is the one decision in here
 * worth arguing about. The whole film is authored as a function of scroll
 * progress, and the camera breath in lib/film.ts is the exception that proves
 * why: a scene that only moves while the reader's thumb is moving is a scene
 * that dies the instant they stop to read something. Scroll drives the
 * narrative; time drives the life. A bird that hangs motionless in the sky
 * until you scroll is not a bird, it is a sticker.
 *
 * So the whole thing is CSS keyframes and ships no JavaScript: the flock
 * crosses on one animation, each bird flaps on its own, and the periods are
 * mutually irrational so the formation never visibly locks into step.
 *
 * Colour comes from `currentColor`, so a flock takes the colour of whatever
 * section it is flying over rather than carrying its own.
 */
export interface BirdsProps {
  /** how many in the flight. Odd numbers make a better skein. */
  count?: number
  /** seconds for one crossing */
  duration?: number
  className?: string
}

export default function Birds({ count = 5, duration = 34, className = '' }: BirdsProps) {
  // A skein, not a row: cranes fly in a ragged line, leader out front, the
  // rest strung back and below it. Authored per index rather than randomised,
  // so the server and the client draw the same flight and React has nothing to
  // reconcile — a random flock is a hydration mismatch and a visible flash.
  const flock = Array.from({ length: count }, (_, i) => {
    const t = i / Math.max(count - 1, 1)
    return {
      // Shallow. A skein trails behind and only a little below its leader; drop
      // each bird as far as it lags and the flock stacks into a vertical column,
      // which is not a formation any bird has ever flown.
      top: `${12 + t * 20}%`,
      scale: 1 - t * 0.4,
      // Where this bird sits when it is not allowed to fly. Reduced motion has
      // only the custom properties to lay the flock out with, and deriving a
      // position from `--bird-scale` — the one other per-bird value — packs
      // them into an overlapping knot.
      parked: `${4 + t * 64}%`,
      /**
       * Two things at once, and the constant matters as much as the spread.
       *
       * The spread strings the flock across about half the screen, which
       * together with the shallow drop above is what makes it a skein rather
       * than a column or a queue.
       *
       * The 0.32 starts the cycle already a third of the way through, so the
       * birds are in frame at load rather than lined up off the left edge. The
       * animation begins when the page does, not when the reader arrives here —
       * without the offset the first thing anyone scrolling down at a normal
       * pace sees is an empty sky.
       */
      delay: -(0.32 + t * 0.24) * duration,
      // periods that do not divide into one another, so the wingbeats never
      // fall into unison and start reading as one object
      flap: 0.66 + t * 0.17,
      flapDelay: -t * 0.29,
      opacity: 1 - t * 0.3,
    }
  })

  return (
    <div className={`u-birds ${className}`} aria-hidden="true">
      {flock.map((b, i) => (
        <div
          key={i}
          className="u-bird"
          style={
            {
              top: b.top,
              opacity: b.opacity,
              '--bird-scale': b.scale,
              '--bird-x': b.parked,
              '--bird-cross': `${duration}s`,
              '--bird-cross-delay': `${b.delay}s`,
              '--bird-flap': `${b.flap}s`,
              '--bird-flap-delay': `${b.flapDelay}s`,
            } as React.CSSProperties
          }
        >
          <svg viewBox={CRANE.box} focusable="false">
            {/* Upper wing behind the body, lower wing in front. Drawing order
                is the only thing giving a flat silhouette a near side and a far
                one, and it costs nothing. */}
            <path className="u-bird__wing u-bird__wing--up" d={CRANE.wingUp} />
            <path className="u-bird__body" d={CRANE.body} />
            <path className="u-bird__body" d={CRANE.legs} />
            <path className="u-bird__wing u-bird__wing--down" d={CRANE.wingDown} />
          </svg>
        </div>
      ))}
    </div>
  )
}
