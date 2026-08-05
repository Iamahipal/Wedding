'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import Devanagari from './Devanagari'
import { emitBeat } from '@/lib/film'

/**
 * The पत्रिका — the folded invitation.
 *
 * A gatefold card: two doors hinged on the outer edges, opening on the
 * invocation, with the ceremonies tucked into a pocket inside. Pull one out and
 * the folder closes behind it and hands it to you; put it back and it opens
 * again to take it.
 *
 * ── on React state ────────────────────────────────────────────────────────
 * The film's rule is that React renders once and scroll never touches React
 * state. That rule exists because scroll fires dozens of times a second, and it
 * does not apply here: this is discrete user intent — a hover, a tap, a key —
 * at human frequency. Three renders per interaction is correct, and pretending
 * otherwise would mean hand-rolling a state machine into mutable refs for no
 * benefit at all.
 *
 * Everything that *animates* is still CSS. React only writes `data-state`; the
 * transitions, easings and geometry all live in app/globals.css under `.folio`,
 * which is where they should be edited.
 */

export type FolioState = 'closed' | 'open' | 'presented'

/**
 * Attached to the root element as `__folio` so Film.tsx can drive it from a
 * ScrollTrigger without this component subscribing to scroll itself.
 */
export interface FolioHandle {
  open(): void
  close(): void
  isPresented(): boolean
}

export interface FolioItem {
  id: string
  /** rendered inside the parchment insert */
  content: ReactNode
  /** announced to screen readers on the button that pulls this one out */
  label: string
}

export interface FolioProps {
  /** small caps label printed on the front door */
  label: string
  /** shown as "03 total" — Latin numerals, because this is UI, not liturgy */
  count?: number
  /** a Devanagari key from content/devanagari.json, printed inside the folder */
  invocationKey?: string
  /** the word foiled on the front of the card */
  frontKey?: string
  items: FolioItem[]
  className?: string
}

export default function Folio({
  label,
  count,
  invocationKey = 'invocation',
  frontKey = 'vivah',
  items,
  className = '',
}: FolioProps) {
  const [state, setState] = useState<FolioState>('closed')
  const [active, setActive] = useState<number>(-1)
  /** which insert was last presented — it needs the delayed return transition */
  const lastActive = useRef<number>(-1)
  const root = useRef<HTMLDivElement>(null)

  const open = useCallback(() => {
    setState((s) => {
      if (s === 'closed') emitBeat('folio')
      return s === 'closed' ? 'open' : s
    })
  }, [])

  const close = useCallback(() => {
    setState((s) => (s === 'open' ? 'closed' : s))
  }, [])

  const present = useCallback((i: number) => {
    setActive(i)
    lastActive.current = i
    setState('presented')
    emitBeat('folio-take')
  }, [])

  const putBack = useCallback(() => {
    setState('open')
    setActive(-1)
    emitBeat('folio')
  }, [])

  /** Escape always gets you back out, from either depth. */
  useEffect(() => {
    if (state === 'closed') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (state === 'presented') putBack()
      else close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state, putBack, close])

  /**
   * Scroll opens it, and that is the primary interaction rather than a
   * flourish: half the people who see this will be on a phone, where `hover`
   * does not exist and a card that only opens on hover never opens at all.
   * Film.tsx drives this through the imperative handle below.
   */
  useEffect(() => {
    const el = root.current
    if (!el) return
    const api: FolioHandle = { open, close, isPresented: () => state === 'presented' }
    ;(el as HTMLElement & { __folio?: FolioHandle }).__folio = api
  }, [open, close, state])

  return (
    <div className={`folio-stage ${className}`} data-folio-stage>
      <div ref={root} className="folio" data-folio data-state={state}>
        {/* ── inside ─────────────────────────────────────────────────────── */}
        <div className="folio__wall folio-stock">
          <div className="flex h-[46%] flex-col items-center justify-center px-6 pb-2">
            <div className="text-gold-300/85">
              <Devanagari name={invocationKey} gradient height="clamp(.62rem,2.1vw,.82rem)" />
            </div>
            <span className="mt-3 h-px w-16 bg-gold-700/70" />
          </div>
        </div>

        {/* `inert` while shut. The inserts are only transparent, not gone —
            without this they still hit-test above the open trigger and swallow
            the click meant for it, and a keyboard user tabs into six invisible
            buttons before reaching anything they can see. */}
        <div className="folio__items" inert={state === 'closed'}>
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className="folio__item folio-parchment"
              data-active={state === 'presented' && active === i}
              data-was-active={lastActive.current === i}
              // the fan: authored per index so the stack reads as a stack
              style={
                {
                  '--tuck-rot': `${(i - (items.length - 1) / 2) * 2.4}deg`,
                  '--tuck-y': '34%',
                  '--open-y': `${10 + (items.length - 1 - i) * 1.1}%`,
                  // Real depth between the inserts, not just paint order. Left
                  // coplanar they z-fight and the stack shimmers as it moves.
                  '--item-dz': `${i * 1.6}px`,
                  zIndex: state === 'presented' && active === i ? 30 : 10 + (items.length - i),
                } as React.CSSProperties
              }
              aria-label={
                state === 'presented' && active === i
                  ? `Put ${item.label} back`
                  : `Open ${item.label}`
              }
              onClick={(e) => {
                e.stopPropagation()
                if (state === 'presented' && active === i) putBack()
                else present(i)
              }}
            >
              {item.content}
            </button>
          ))}
        </div>

        <div className="folio__pocket folio-stock" />

        {/* ── the doors ──────────────────────────────────────────────────── */}
        <div className="folio__door folio__door--l">
          <div className="folio__face folio__face--front folio-stock">
            <div className="flex h-full flex-col justify-between p-5">
              <div className="folio-foil folio-mark h-7 w-7" aria-hidden="true" />
              <div>
                <p className="eyebrow" style={{ letterSpacing: '0.24em' }}>
                  {label}
                </p>
                {typeof count === 'number' && (
                  <p className="mt-1 font-[family-name:var(--font-ui)] text-[0.62rem] uppercase tracking-[0.2em] text-gold-500">
                    {String(count).padStart(2, '0')} total
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="folio__face folio__face--back folio-stock" />
          <span className="folio__eyelet" style={{ right: '0.85rem' }} />
        </div>

        <div className="folio__door folio__door--r">
          <div className="folio__face folio__face--front folio-stock">
            <div className="flex h-full items-end justify-end p-5">
              <div className="text-gold-400/80">
                <Devanagari name={frontKey} height="clamp(.9rem,3vw,1.15rem)" />
              </div>
            </div>
          </div>
          <div className="folio__face folio__face--back folio-stock" />
          <span className="folio__eyelet" style={{ left: '0.85rem' }} />
        </div>

        {/* Opens a closed folio. A real button so it is keyboard-reachable and
            announced; it stands down the moment the inserts take over. */}
        <button
          type="button"
          className="folio__trigger"
          aria-expanded={state !== 'closed'}
          aria-label={`Open ${label}`}
          onClick={open}
          onPointerEnter={(e) => {
            // hover is the enhancement, not the interaction
            if (e.pointerType === 'mouse') open()
          }}
        />
      </div>
    </div>
  )
}
