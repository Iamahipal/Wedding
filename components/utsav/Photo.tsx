import { photo, photoFallback, photoSrcSet } from '@/lib/photos'

/**
 * A photograph, at the size the screen actually needs it.
 *
 * A static export has no image server, so everything here is decided at build
 * time by scripts/build-images.mjs and simply declared: four widths in AVIF
 * with a WebP fallback, the real pixel dimensions so the browser can reserve
 * the space before the bytes arrive, and the blur placeholder painted behind
 * the image so a panel is never an empty rectangle on a slow connection.
 *
 * Returns null when there is no photograph for this slug yet. Callers draw
 * their ornament instead — see components/utsav/Frame.tsx.
 */
export interface PhotoProps {
  slug: string
  alt: string
  /**
   * The rendered width, so the browser can pick from the srcset before layout.
   * The default is the frame in a function panel: a single column that stops
   * growing at the measure.
   */
  sizes?: string
  /** the one photograph above the fold of the celebration — everything else is lazy */
  priority?: boolean
  className?: string
}

export default function Photo({
  slug,
  alt,
  sizes = '(min-width: 34rem) 22rem, 78vw',
  priority = false,
  className = '',
}: PhotoProps) {
  const p = photo(slug)
  if (!p) return null

  return (
    <picture className="u-picture">
      <source type="image/avif" srcSet={photoSrcSet(p, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={photoSrcSet(p, 'webp')} sizes={sizes} />
      <img
        src={photoFallback(p)}
        width={p.w}
        height={p.h}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className={`u-photo ${className}`}
        style={{ backgroundImage: `url("${p.lqip}")` }}
      />
    </picture>
  )
}
