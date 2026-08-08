import Devanagari from '../Devanagari'
import Photo from './Photo'
import { ARCH, buttiMotif, jaaliStar, type Vocabulary } from '@/lib/ornament'
import { photo } from '@/lib/photos'

/**
 * A photograph inside an arch, in one of the two regional vocabularies.
 *
 * The clip and the line are the *same path* — lib/ornament.ts hands out one
 * string per arch and it is used both as the objectBoundingBox clipPath and as
 * the stroked outline. Drawing a border that merely resembles the mask is how
 * you end up with a hairline of unclipped photograph showing through one cusp
 * on one browser.
 *
 * `preserveAspectRatio="none"` on a 0..1 viewBox means the path always fills
 * the frame exactly however the frame is proportioned, and
 * `vector-effect: non-scaling-stroke` keeps the line an even weight while it
 * does — without that, a frame wider than it is tall draws a stroke thicker on
 * the verticals than on the horizontals.
 */
export interface FrameProps {
  vocabulary: Vocabulary
  /** the photograph's slug in assets/photos — may not exist yet */
  slug: string
  alt: string
  /**
   * The second arch, drawn inside the first so the two profiles cross.
   *
   * विवाह is the only panel that gets one: it is the same argument गठबंधन makes
   * in gold at the end of the film, which is the whole reason the two halves
   * rhyme rather than merely follow one another.
   */
  interlock?: Vocabulary
  /** Devanagari key drawn on the empty plate when there is no photograph */
  nameKey?: string
  priority?: boolean
  sizes?: string
  className?: string
}

export default function Frame({
  vocabulary,
  slug,
  alt,
  interlock,
  nameKey,
  priority = false,
  sizes,
  className = '',
}: FrameProps) {
  const clip = `url(#u-arch-${vocabulary})`
  const has = photo(slug) !== null

  return (
    <figure className={`u-frame ${className}`} data-vocab={vocabulary}>
      <div className="u-frame__plate" style={{ clipPath: clip, WebkitClipPath: clip }}>
        {has ? (
          <Photo slug={slug} alt={alt} sizes={sizes} priority={priority} />
        ) : (
          <EmptyPlate slug={slug} vocabulary={vocabulary} nameKey={nameKey} />
        )}
      </div>

      {/* the arch itself */}
      <svg className="u-frame__line" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
        <path d={ARCH[vocabulary]} />
      </svg>

      {/* the moulding: the same arch again, a little outside the opening */}
      <svg
        className="u-frame__line u-frame__line--out"
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={ARCH[vocabulary]} />
      </svg>

      {/* विवाह only. Drawn in the *same* box, not inset — nesting one arch
          inside the other makes a double border, and a double border is not an
          interlock. At identical size the eight cusps and the eleven foils
          spring from different heights and cross each other along both
          shoulders, which is the thing the panel is claiming. */}
      {interlock && (
        <svg
          className="u-frame__line u-frame__line--in"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={ARCH[interlock]} />
        </svg>
      )}
    </figure>
  )
}

/**
 * What an arch holds before there is a photograph to put in it.
 *
 * Some of these functions have not happened yet, and several never will be
 * photographed — so "no photo" is a state this has to be *designed* for rather
 * than a hole to be apologised for. The plate fills with the vocabulary's own
 * motif and the function's name in Devanagari, which reads as an ornamented
 * panel rather than as a missing image.
 *
 * The pattern is defined inside this SVG rather than in the shared defs, and
 * that is deliberate: `var(--accent)` inside a `<pattern>` resolves against the
 * pattern element's own cascade, so a definition parked at the document root
 * would paint every panel the same colour instead of its own.
 */
function EmptyPlate({
  slug,
  vocabulary,
  nameKey,
}: {
  slug: string
  vocabulary: Vocabulary
  nameKey?: string
}) {
  const id = `u-motif-${slug}`
  const jaali = vocabulary === 'rajasthan'
  const cell = jaali ? 54 : 46

  return (
    <div className="u-plate">
      <svg className="u-plate__fill" aria-hidden="true">
        <defs>
          <pattern id={id} width={cell} height={cell} patternUnits="userSpaceOnUse">
            {jaali ? (
              /* जाली is a *pierced screen*, so what gets painted is the stone
                 and the star is the hole in it. Filling the star instead —
                 which is the obvious way round, and wrong — draws a lattice of
                 flowers: pretty, and not a screen. `evenodd` over the cell plus
                 the star does it in one path. */
              <path
                d={`M0 0H1V1H0Z ${jaaliStar()}`}
                transform={`scale(${cell})`}
                fillRule="evenodd"
                fill="var(--accent)"
                fillOpacity="0.16"
              />
            ) : (
              <>
                {/* the zari ground the butti sits on — a fine diagonal lattice
                    of gold thread, then the figure worked on top of it */}
                <path
                  d={`M0 ${cell} L${cell} 0 M${-cell / 2} ${cell / 2} L${cell / 2} ${-cell / 2} M${cell / 2} ${cell * 1.5} L${cell * 1.5} ${cell / 2}`}
                  stroke="var(--accent)"
                  strokeOpacity="0.1"
                  strokeWidth="1"
                  fill="none"
                />
                <path
                  d={buttiMotif()}
                  transform={`scale(${cell})`}
                  fill="var(--accent)"
                  fillOpacity="0.2"
                />
              </>
            )}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>

      {nameKey && (
        <span className="u-plate__name">
          <Devanagari name={nameKey} height="clamp(1.9rem, 8vw, 2.8rem)" />
        </span>
      )}
    </div>
  )
}
