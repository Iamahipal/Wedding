'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { PhotoSources } from '@/lib/photos'

/**
 * The gallery, and the full-screen view behind it.
 *
 * Takes finished URLs rather than slugs: the manifest in lib/photos.ts carries
 * a base64 blur for every photograph on the site, and importing it here would
 * ship all of them to every visitor in order to look up twelve.
 *
 * ── on not locking the page scroll ────────────────────────────────────────
 * Every lightbox on the internet sets `overflow: hidden` on the body while it
 * is open, and this one deliberately does not. On WebKit that turns the body
 * into a scroll container and moves the document's scrolling element out from
 * under Lenis and ScrollTrigger — the exact failure app/globals.css already
 * documents at `body { overflow-x: clip }`, where it presents as a film stuck
 * on its first frame. The overlay is opaque and covers the viewport, so the
 * worst a stray scroll does is move a page nobody can see; that is a much
 * smaller problem than breaking the scroll engine on the way back out.
 */
export interface GalleryProps {
  items: PhotoSources[]
  alt: string
}

export default function Gallery({ items, alt }: GalleryProps) {
  const [open, setOpen] = useState<number | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  /** where focus was before the overlay took it */
  const restore = useRef<HTMLElement | null>(null)

  const show = useCallback((i: number) => {
    restore.current = document.activeElement as HTMLElement | null
    setOpen(i)
  }, [])

  const close = useCallback(() => {
    setOpen(null)
    restore.current?.focus()
  }, [])

  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? null : (i + d + items.length) % items.length)),
    [items.length],
  )

  useEffect(() => {
    if (open === null) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close, step])

  if (!items.length) return null

  const current = open === null ? null : items[open]

  return (
    <>
      <ul className="u-grid">
        {items.map((p, i) => (
          <li key={p.slug}>
            <button
              type="button"
              className="u-grid__cell"
              onClick={() => show(i)}
              aria-label={`${alt} ${i + 1} of ${items.length} — open full screen`}
            >
              <picture>
                <source
                  type="image/avif"
                  srcSet={p.avif}
                  sizes="(min-width: 34rem) 16rem, 46vw"
                />
                <source
                  type="image/webp"
                  srcSet={p.webp}
                  sizes="(min-width: 34rem) 16rem, 46vw"
                />
                <img
                  src={p.src}
                  width={p.w}
                  height={p.h}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="u-photo"
                  style={{ backgroundImage: `url("${p.lqip}")` }}
                />
              </picture>
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <div className="u-lightbox" role="dialog" aria-modal="true" aria-label={alt}>
          {/* the backdrop is the dismiss target; the buttons above it stop the
              click, so tapping the photograph itself does not close it */}
          <button
            type="button"
            className="u-lightbox__scrim"
            aria-label="Close"
            tabIndex={-1}
            onClick={close}
          />

          <figure className="u-lightbox__figure">
            <picture>
              <source type="image/avif" srcSet={current.avif} sizes="100vw" />
              <source type="image/webp" srcSet={current.webp} sizes="100vw" />
              <img
                src={current.src}
                width={current.w}
                height={current.h}
                alt={`${alt} ${(open ?? 0) + 1} of ${items.length}`}
                decoding="async"
              />
            </picture>
          </figure>

          <div className="u-lightbox__bar">
            <button type="button" className="u-round" onClick={() => step(-1)} aria-label="Previous">
              ‹
            </button>
            <span className="u-lightbox__count">
              {(open ?? 0) + 1} / {items.length}
            </span>
            <button type="button" className="u-round" onClick={() => step(1)} aria-label="Next">
              ›
            </button>
          </div>

          <button ref={closeRef} type="button" className="u-round u-lightbox__x" onClick={close} aria-label="Close">
            ×
          </button>
        </div>
      )}
    </>
  )
}
