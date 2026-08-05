'use client'

import { useEffect, useState } from 'react'

import { film } from '@/lib/film'

/**
 * On-screen diagnostics, behind `?diag`.
 *
 * A phone has no console attached, and "nothing is happening" is a symptom with
 * a dozen possible causes — the film's playhead not advancing, the effect
 * throwing before it registers a single trigger, the document having no
 * scrollable height, WebGL refusing a context. Guessing between them from a
 * screenshot wastes a round trip per guess.
 *
 * So the device reports on itself. Everything here is read live, once a second,
 * and never touches anything the film depends on.
 */
export default function Diag() {
  const [on, setOn] = useState(false)
  const [rows, setRows] = useState<[string, string][]>([])

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('diag')) return
    setOn(true)

    const read = (): [string, string][] => {
      const w = window as unknown as Record<string, unknown>
      const canvas = document.querySelector<HTMLCanvasElement>('#stage canvas')
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - window.innerHeight
      const errs = (w.__errs as string[]) ?? []

      let gl = 'no canvas'
      if (canvas) {
        const ctx = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
        gl = ctx ? `ok ${canvas.width}×${canvas.height}` : 'NO CONTEXT'
      }

      return [
        ['errors', errs.length ? `${errs.length}: ${errs.slice(0, 2).join(' | ')}` : 'none'],
        ['film effect', w.__filmReady ? 'ran' : 'DID NOT RUN'],
        ['triggers', String(w.__triggerCount ?? '?')],
        ['smooth scroll', String(w.__lenis ?? '?')],
        ['reduced motion', String(film.reducedMotion)],
        ['film.t', film.t.toFixed(4)],
        ['act', `${film.active} p=${film.p[film.active].toFixed(2)}`],
        ['scrollY', `${Math.round(window.scrollY)} / ${Math.round(scrollable)}`],
        ['doc height', `${doc.scrollHeight}px vs vh ${window.innerHeight}`],
        ['webgl', gl],
        ['dpr / cores', `${window.devicePixelRatio} / ${navigator.hardwareConcurrency ?? '?'}`],
      ]
    }

    setRows(read())
    const id = setInterval(() => setRows(read()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!on) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: 8,
        top: 8,
        zIndex: 9999,
        maxWidth: 'calc(100vw - 16px)',
        background: 'rgba(0,0,0,.92)',
        border: '1px solid #c48b31',
        borderRadius: 4,
        padding: '8px 10px',
        font: '11px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace',
        color: '#f7e3b3',
        pointerEvents: 'none',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {rows.map(([k, v]) => (
        <div key={k}>
          <span style={{ color: '#a46d20' }}>{k.padEnd(15, ' ')}</span>
          {v}
        </div>
      ))}
    </div>
  )
}
