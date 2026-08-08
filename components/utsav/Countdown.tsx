'use client'

import { useEffect, useState } from 'react'

import { muhurat } from '@/lib/content'

/**
 * DD : HH : MM : SS to the muhurat.
 *
 * Three things here are easy to get wrong and all three are load-bearing.
 *
 * **It does not render on the server.** A countdown computed during the build
 * is stale before the file is uploaded, and computing it during SSR hands React
 * two different numbers to reconcile — a hydration mismatch that blows away the
 * subtree. So the first paint is the frame with no numerals in it, and the
 * numbers arrive on mount. The section is far below the fold; nobody sees the
 * gap.
 *
 * **The muhurat carries its own offset.** `lib/content.ts` states it as
 * `+05:30` rather than as a local time, so a cousin opening this in Toronto
 * counts down to the same instant as an aunt in Udaipur rather than to 7:42 pm
 * in their own city.
 *
 * **The numerals are hidden from assistive tech.** A live region ticking once a
 * second is unusable; a screen reader gets one sentence saying when the wedding
 * is, which is the information the numerals are only decorating.
 */
interface Remaining {
  d: number
  h: number
  m: number
  s: number
  past: boolean
}

function remaining(target: number): Remaining {
  const ms = target - Date.now()
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0, past: true }
  const s = Math.floor(ms / 1000)
  return {
    d: Math.floor(s / 86400),
    h: Math.floor(s / 3600) % 24,
    m: Math.floor(s / 60) % 60,
    s: s % 60,
    past: false,
  }
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

export default function Countdown() {
  const [now, setNow] = useState<Remaining | null>(null)

  useEffect(() => {
    const target = new Date(muhurat.iso).getTime()
    if (Number.isNaN(target)) return
    setNow(remaining(target))
    const id = window.setInterval(() => setNow(remaining(target)), 1000)
    return () => window.clearInterval(id)
  }, [])

  if (now?.past) {
    return <p className="u-lede">{muhurat.passed}</p>
  }

  const cells: [string, string][] = [
    [now ? pad(now.d, 2) : '––', 'days'],
    [now ? pad(now.h) : '––', 'hours'],
    [now ? pad(now.m) : '––', 'minutes'],
    [now ? pad(now.s) : '––', 'seconds'],
  ]

  return (
    <div className="u-count">
      <div className="u-count__row" aria-hidden="true">
        {cells.map(([value, label], i) => (
          <div key={label} className="u-count__cell">
            <span className="u-count__n">{value}</span>
            <span className="u-count__l">{label}</span>
            {i < cells.length - 1 && <span className="u-count__sep">:</span>}
          </div>
        ))}
      </div>
      <p className="u-count__spoken">{muhurat.spoken}</p>
    </div>
  )
}
