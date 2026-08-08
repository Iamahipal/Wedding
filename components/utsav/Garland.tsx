import { garland, rosette } from '@/lib/ornament'

/**
 * गेंदा — a marigold garland, strung between one panel and the next.
 *
 * The one thing in the celebration that does not take the panel's palette. Each
 * function owns its colour and the garland runs through all seven of them
 * unchanged, which is what makes it read as connective tissue rather than as a
 * divider rule: at a real wedding the same marigolds are hanging in every room.
 *
 * It hangs on a catenary, because a strung garland hangs. A straight row of
 * discs is bunting, and the eye knows the difference immediately even when it
 * cannot say why.
 *
 * Each flower is a rosette from lib/ornament.ts — the same polar modulation the
 * two arches are generated from, swept through a full turn instead of a half
 * one. That is not a saving, it is the point: the petals and the cusps obey one
 * shape rule, so the flowers look like they belong under the arches.
 *
 * They bloom as the strip arrives. Every flower starts at `scale(0)` in CSS
 * rather than only in the timeline (TRAP 15) — between first paint and
 * hydration there is no GSAP, and a garland that flashes in fully strung and
 * then blooms is worse than one that never blooms at all.
 */
const MARIGOLD = ['#f2a007', '#ee7f10', '#e6620d'] as const
const DEEP = '#a83c05'

/** Eight petals, deeply cut. A marigold is not a daisy. */
const PETALS = rosette(8, 0.3)

export default function Garland({ className = '' }: { className?: string }) {
  const blooms = garland(26)

  return (
    <svg
      className={`u-garland ${className}`}
      viewBox="0 0 1000 110"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {/* the thread, drawn first so every flower sits on it */}
      <path
        d={`M${blooms.map((b) => `${(20 + b.cx * 960).toFixed(1)} ${(12 + b.cy * 190).toFixed(1)}`).join(' L')}`}
        fill="none"
        stroke={DEEP}
        strokeOpacity="0.4"
        strokeWidth="2"
      />
      {blooms.map((b, i) => {
        const x = 20 + b.cx * 960
        const y = 12 + b.cy * 190
        const rad = b.r * 440
        return (
          <g key={i} data-bloom>
            <path
              d={PETALS}
              transform={`translate(${(x - rad).toFixed(1)} ${(y - rad).toFixed(1)}) scale(${(rad * 2).toFixed(1)})`}
              fill={MARIGOLD[i % MARIGOLD.length]}
            />
            {/* the packed centre — a marigold is not a plain disc */}
            <circle cx={x} cy={y} r={rad * 0.42} fill={DEEP} fillOpacity="0.26" />
          </g>
        )
      })}
    </svg>
  )
}
