import { garland } from '@/lib/ornament'

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
 */
const MARIGOLD = ['#f2a007', '#ee7f10', '#e6620d'] as const
const DEEP = '#a83c05'

export default function Garland({ className = '' }: { className?: string }) {
  const blooms = garland()

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
        strokeOpacity="0.45"
        strokeWidth="2"
      />
      {blooms.map((b, i) => {
        const x = 20 + b.cx * 960
        const y = 12 + b.cy * 190
        const rad = b.r * 400
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={rad} fill={MARIGOLD[i % MARIGOLD.length]} />
            {/* the packed centre — a marigold is not a plain disc */}
            <circle cx={x} cy={y} r={rad * 0.46} fill={DEEP} fillOpacity="0.28" />
          </g>
        )
      })}
    </svg>
  )
}
