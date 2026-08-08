import raw from '@/content/photos.generated.json'

import { asset } from './basePath'

/**
 * The output of `npm run images` — every photograph, already resized into four
 * widths of AVIF and WebP under public/img/, with its real pixel dimensions and
 * a 20px blur placeholder inlined here.
 *
 * The dimensions are the load-bearing part. A static export has no image server
 * to ask, so without them every `<img>` starts at zero height and the entire
 * celebration reflows underneath the reader's thumb as each photograph lands.
 * Declaring them lets the browser reserve the space before the first byte of
 * the image arrives.
 */
export interface PhotoMeta {
  /** the original filename, so the manifest can be traced back to a source */
  src: string
  mtime: number
  /** source pixel dimensions, after EXIF orientation has been applied */
  w: number
  h: number
  /** the derivative widths that actually exist in public/img/ */
  widths: number[]
  /** a base64 WebP data URI, ~100–600 bytes */
  lqip: string
}

export interface Photograph extends PhotoMeta {
  slug: string
}

const manifest = raw as unknown as Record<string, unknown>

/**
 * A photograph, or null if nobody has added one for this slug yet.
 *
 * Null is a designed state rather than an error: a function that has not
 * happened cannot have a photograph of it, and its panel draws its ornament
 * instead. Throwing here — which is what lib/devanagari.ts does for a missing
 * outline, correctly — would mean the site could not be built until the wedding
 * was over.
 */
export function photo(slug: string): Photograph | null {
  if (!slug || slug.startsWith('_')) return null
  const p = manifest[slug]
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null
  const meta = p as PhotoMeta
  if (!meta.widths?.length || !meta.w || !meta.h) return null
  return { slug, ...meta }
}

/** Every gallery-NN in the manifest, in filename order. */
export function galleryPhotos(): Photograph[] {
  return Object.keys(manifest)
    .filter((k) => k.startsWith('gallery'))
    .sort()
    .map((k) => photo(k))
    .filter((p): p is Photograph => p !== null)
}

/** TRAP 24 — every public/ path goes through asset(), or it 404s under a basePath. */
export function photoSrcSet(p: Photograph, ext: 'avif' | 'webp'): string {
  return p.widths.map((w) => `${asset(`/img/${p.slug}-${w}.${ext}`)} ${w}w`).join(', ')
}

/** The widest derivative, used as the plain `src` for anything that ignores srcset. */
export function photoFallback(p: Photograph): string {
  return asset(`/img/${p.slug}-${p.widths[p.widths.length - 1]}.webp`)
}

/**
 * A photograph flattened to the four strings an `<img>` actually needs.
 *
 * This exists so the *client* half of the gallery can be handed finished URLs
 * instead of importing this module. The manifest carries a base64 blur for
 * every photograph on the site; pulling it into a client bundle to look up
 * twelve of them would ship all of it to every visitor.
 */
export interface PhotoSources {
  slug: string
  w: number
  h: number
  lqip: string
  avif: string
  webp: string
  src: string
}

export function sources(p: Photograph): PhotoSources {
  return {
    slug: p.slug,
    w: p.w,
    h: p.h,
    lqip: p.lqip,
    avif: photoSrcSet(p, 'avif'),
    webp: photoSrcSet(p, 'webp'),
    src: photoFallback(p),
  }
}
