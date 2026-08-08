import Devanagari from '../Devanagari'
import Birds from './Birds'
import Frame from './Frame'
import { REGION_OF, type Celebration } from '@/lib/content'

/**
 * One function, full bleed, in its own colour.
 *
 * Everything here is inert markup with `data-*` hooks on it, exactly like the
 * film's captions: the palette is in app/globals.css keyed on `[data-fn]`, the
 * reveals are in components/Film.tsx, and this file decides only what is said
 * and in what order. Re-colouring a function means opening one file;
 * re-timing its arrival means opening a different one.
 *
 * `data-vocab` carries the regional vocabulary down to two separate consumers —
 * the arch that frames the photograph, and the textile washed behind the whole
 * panel — so the two can never disagree about whose function this is.
 */
export interface PanelProps {
  c: Celebration
  /** 1-based, shown as 01 / 07 */
  index: number
  total: number
}

export default function Panel({ c, index, total }: PanelProps) {
  /**
   * विवाह is the only function that belongs to both households, and it is the
   * only frame where the two arches cross. That is गठबंधन stated in 2D — the
   * same argument the film ends on, which is why the second half rhymes with
   * the first rather than merely following it.
   */
  const vocabulary = c.side === 'both' ? REGION_OF.bride : REGION_OF[c.side]
  const interlock = c.side === 'both' ? REGION_OF.groom : undefined

  return (
    <section
      className="utsav-panel"
      data-fn={c.key}
      data-vocab={vocabulary}
      aria-labelledby={`fn-${c.key}`}
    >
      <div className="u-texture" aria-hidden="true" />

      {/* विदाई only. The bride leaves her parents' house at first light, and a
          flight of cranes going with her is the one place on this site where an
          ornament is doing the panel's actual work rather than decorating it.
          Anywhere else it would be a bird on a wedding website. */}
      {c.key === 'vidaai' && <Birds count={7} duration={46} className="u-birds--vidaai" />}

      <div className="utsav-inner">
        {/* Latin numerals: this is UI, not liturgy — the same call the folio
            makes when it prints "03 total" on the front of the card. */}
        <p data-reveal className="u-eyebrow u-index">
          {String(index).padStart(2, '0')} <span aria-hidden="true">/</span>{' '}
          {String(total).padStart(2, '0')}
        </p>

        <div data-reveal className="u-fn-name">
          <Devanagari name={c.devanagariKey} height="clamp(2.3rem, 10vw, 3.2rem)" />
        </div>

        <h3 data-reveal id={`fn-${c.key}`} className="u-fn-roman">
          {c.name}
        </h3>

        <p data-reveal className="u-fn-line">
          {c.line}
        </p>

        <div data-reveal className="u-fn-frame">
          <Frame
            vocabulary={vocabulary}
            interlock={interlock}
            slug={c.photo}
            nameKey={c.devanagariKey}
            alt={`A photograph from the ${c.name}`}
          />
        </div>

        <dl data-reveal className="u-facts">
          <div>
            <dt>When</dt>
            <dd>
              {c.date}
              <span className="u-facts__second">{c.time}</span>
            </dd>
          </div>
          <div>
            <dt>Where</dt>
            <dd>
              {c.venue}
              <span className="u-facts__second">{c.address}</span>
            </dd>
          </div>
          {c.dress && (
            <div>
              <dt>Wear</dt>
              <dd>{c.dress}</dd>
            </div>
          )}
        </dl>

        {c.note && (
          <p data-reveal className="u-note">
            {c.note}
          </p>
        )}

        {/* Only when there is somewhere to send them. A "View location" that
            opens an empty map is worse than no link at all — someone will tap
            it while parked outside the wrong gate. */}
        {c.map && (
          <p data-reveal className="u-cta">
            <a className="u-link" href={c.map} target="_blank" rel="noopener noreferrer">
              View location
            </a>
          </p>
        )}
      </div>
    </section>
  )
}
