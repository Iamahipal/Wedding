import { useId } from 'react'

import { outline } from '@/lib/devanagari'

/**
 * Devanagari in the DOM, drawn from the outlines HarfBuzz shaped at build time.
 *
 * No webfont is involved, here or anywhere else in the film — so there is no
 * font-loading race, no flash of unshaped text, and no chance of the string
 * re-shaping differently on a machine with a different text stack.
 *
 * The optional gold gradient is an SVG gradient, deliberately. Filling text
 * with `background-clip: text` would have been the CSS way to do it and is
 * mutually exclusive with splitting the text into per-line or per-glyph spans
 * (TRAP 17) — the children own no background, and transparent fill over no
 * background renders literally nothing. An SVG gradient has no such problem and
 * survives any amount of animation.
 */
export interface DevanagariProps {
  name: string
  /** any CSS length; the width follows from the outline's aspect ratio */
  height?: string
  className?: string
  gradient?: boolean
  style?: React.CSSProperties
}

export default function Devanagari({
  name,
  height = '1em',
  className,
  gradient = false,
  style,
}: DevanagariProps) {
  const o = outline(name)
  const id = useId().replace(/[:]/g, '')
  const gid = `dev-gold-${id}`

  return (
    <svg
      viewBox={`0 0 ${o.width} ${o.height}`}
      role="img"
      aria-label={o.text}
      className={className}
      style={{ height, width: 'auto', display: 'block', overflow: 'visible', ...style }}
      preserveAspectRatio="xMidYMid meet"
    >
      {gradient && (
        <defs>
          {/* the full range, shadow to cream — roughly half of it dark, which
              is what stops flat-filled gold from reading as yellow plastic */}
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fdf4de" />
            <stop offset="28%" stopColor="#ecca80" />
            <stop offset="58%" stopColor="#c48b31" />
            <stop offset="82%" stopColor="#7e5015" />
            <stop offset="100%" stopColor="#c9973f" />
          </linearGradient>
        </defs>
      )}
      <path d={o.d} fillRule="nonzero" fill={gradient ? `url(#${gid})` : 'currentColor'} />
    </svg>
  )
}
