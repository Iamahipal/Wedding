import Devanagari from './Devanagari'
import Countdown from './utsav/Countdown'
import UtsavDefs from './utsav/Defs'
import Frame from './utsav/Frame'
import Gallery from './utsav/Gallery'
import Garland from './utsav/Garland'
import Panel from './utsav/Panel'
import {
  blessings,
  celebrations,
  couple,
  gallery,
  invitation,
  muhurat,
  portraits,
  REGION_OF,
  rsvp,
  site,
  social,
  story,
  travel,
  whatsappHref,
} from '@/lib/content'
import { galleryPhotos, sources } from '@/lib/photos'

/**
 * उत्सव — the celebration.
 *
 * The film is the five elements. This is the days. The gatefold card is the
 * hinge between them: its doors open, the canvas goes dark, and colour floods
 * out — see the handoff in components/Film.tsx, which drives both halves of
 * that on one scrub.
 *
 * Everything here is a Server Component and ships no JavaScript, except the two
 * things that genuinely need a clock or a click: the countdown and the gallery
 * lightbox. Seven full-bleed panels of photographs is exactly the wrong place
 * to be hydrating a component tree.
 *
 * Copy is in lib/content.ts, colour is in app/globals.css keyed on `[data-fn]`,
 * and the reveals are in components/Film.tsx — the same three-way split the film
 * uses, for the same reason.
 */
export default function Utsav() {
  const photos = galleryPhotos().map(sources)

  return (
    <div data-utsav>
      <UtsavDefs />

      {/* ── the doors open ─────────────────────────────────────────────── */}
      <section className="utsav-section u-open" aria-labelledby="u-names">
        <div className="utsav-inner">
          <div data-reveal className="u-invocation">
            <Devanagari name="ganesha" height="clamp(0.95rem, 3.2vw, 1.25rem)" />
          </div>

          <div data-reveal className="u-hero">
            <Frame
              vocabulary={REGION_OF.bride}
              slug="hero"
              nameKey="utsav"
              alt={`${couple.bride.name} and ${couple.groom.name}`}
              priority
              sizes="(min-width: 34rem) 26rem, 86vw"
            />
          </div>

          <div data-reveal className="u-weds">
            <Devanagari name={couple.bride.devanagariKey} height="clamp(1.8rem, 7vw, 2.6rem)" />
            <span className="u-weds__and">weds</span>
            <Devanagari name={couple.groom.devanagariKey} height="clamp(1.8rem, 7vw, 2.6rem)" />
          </div>

          <h2 id="u-names" data-reveal className="u-display u-open__names">
            {couple.bride.name}
            <span className="u-amp"> &amp; </span>
            {couple.groom.name}
          </h2>

          <p data-reveal className="u-eyebrow u-open__date">
            {invitation.dateLine} · {invitation.cityLine}
          </p>
        </div>
      </section>

      {/* ── आशीर्वाद ───────────────────────────────────────────────────── */}
      <section className="utsav-section" aria-labelledby="u-blessings">
        <div className="utsav-inner">
          <p id="u-blessings" data-reveal className="u-eyebrow">
            {blessings.eyebrow}
          </p>
          <div data-reveal className="u-aashirvad">
            <Devanagari name={blessings.devanagariKey} height="clamp(1.4rem, 5vw, 2rem)" />
          </div>

          <div className="u-households">
            {blessings.sides.map((s) => (
              <div key={s.household} data-reveal className="u-household">
                <p className="u-eyebrow">{s.household}</p>
                {s.grandparents.map((g) => (
                  <p key={g} className="u-elder">
                    {g}
                  </p>
                ))}
                <p className="u-parents">{s.parents}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── the seven functions ────────────────────────────────────────────
          Each in its own colour, full bleed, with a garland strung between one
          and the next. Seven saturated fields laid edge to edge is seven
          fields nobody can look at; the strip between them is what lets each
          one be as loud as it ought to be.
          ------------------------------------------------------------------ */}
      <div className="u-divider" aria-hidden="true">
        <Garland />
      </div>

      {celebrations.map((c, i) => (
        <div key={c.key}>
          <Panel c={c} index={i + 1} total={celebrations.length} />
          {i < celebrations.length - 1 && (
            <div className="u-divider" aria-hidden="true">
              <Garland />
            </div>
          )}
        </div>
      ))}

      <div className="u-divider" aria-hidden="true">
        <Garland />
      </div>

      {/* ── our story ──────────────────────────────────────────────────── */}
      <section className="utsav-section" aria-labelledby="u-story">
        <div className="utsav-inner u-prose">
          <p id="u-story" data-reveal className="u-eyebrow">
            {story.eyebrow}
          </p>
          {story.paragraphs.map((p, i) => (
            <p key={i} data-reveal className="u-para">
              {p}
            </p>
          ))}
        </div>
      </section>

      {/* ── meet the two of them ───────────────────────────────────────── */}
      <section className="utsav-section" aria-labelledby="u-portraits">
        <div className="utsav-inner u-wide">
          <p id="u-portraits" data-reveal className="u-eyebrow">
            {portraits.eyebrow}
          </p>

          <div className="u-pair">
            {[
              { ...portraits.bride, vocabulary: REGION_OF.bride, name: couple.bride.name },
              { ...portraits.groom, vocabulary: REGION_OF.groom, name: couple.groom.name },
            ].map((p) => (
              <div key={p.heading} data-reveal className="u-portrait">
                <Frame
                  vocabulary={p.vocabulary}
                  slug={p.photo}
                  nameKey={p.photo === 'bride' ? couple.bride.devanagariKey : couple.groom.devanagariKey}
                  alt={p.name}
                  sizes="(min-width: 34rem) 16rem, 74vw"
                />
                <h3 className="u-portrait__name">{p.name}</h3>
                <p className="u-eyebrow">{p.heading}</p>
                <p className="u-para">{p.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── the gallery ────────────────────────────────────────────────────
          Rendered only when there are photographs. An empty grid with a note
          explaining how to fill it belongs in a README, not on a card being
          forwarded to somebody's grandmother.
          ------------------------------------------------------------------ */}
      {photos.length > 0 && (
        <section className="utsav-section" aria-labelledby="u-gallery">
          <div className="utsav-inner u-wide">
            <p id="u-gallery" data-reveal className="u-eyebrow">
              {gallery.eyebrow}
            </p>
            <div data-reveal>
              <Gallery items={photos} alt={`${couple.bride.name} and ${couple.groom.name}`} />
            </div>
          </div>
        </section>
      )}

      {/* ── getting there ──────────────────────────────────────────────── */}
      <section className="utsav-section" aria-labelledby="u-travel">
        <div className="utsav-inner u-wide">
          <p id="u-travel" data-reveal className="u-eyebrow">
            {travel.headline}
          </p>
          <div className="u-trio">
            {travel.items.map((t) => (
              <div key={t.title} data-reveal>
                <h3 className="u-trio__title">{t.title}</h3>
                <p className="u-para">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── the reply ──────────────────────────────────────────────────── */}
      <section className="utsav-section u-rsvp" aria-labelledby="u-rsvp">
        <div className="utsav-inner">
          <h2 id="u-rsvp" data-reveal className="u-display">
            {rsvp.headline}
          </h2>
          <p data-reveal className="u-lede u-rsvp__line">
            {rsvp.line}
          </p>

          <p data-reveal className="u-cta">
            <a className="u-link" href={whatsappHref()} target="_blank" rel="noopener noreferrer">
              {rsvp.cta}
            </a>
          </p>

          <div data-reveal className="u-contacts">
            {rsvp.contacts.map((c) => (
              <p key={c.name}>
                <span className="u-contacts__name">{c.name}</span>
                <span className="u-dot">·</span>
                {c.role}
                <span className="u-dot">·</span>
                <a href={`tel:${c.tel.replace(/\s/g, '')}`}>{c.tel}</a>
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ── the countdown ──────────────────────────────────────────────── */}
      <section className="utsav-section u-countdown" aria-label={muhurat.label}>
        <div className="utsav-inner">
          <p data-reveal className="u-eyebrow">
            {muhurat.label}
          </p>
          <div data-reveal>
            <Countdown />
          </div>
        </div>
      </section>

      {/* ── the hashtag ────────────────────────────────────────────────── */}
      <section className="utsav-section" aria-labelledby="u-social">
        <div className="utsav-inner">
          <h2 id="u-social" data-reveal className="u-hashtag">
            {social.hashtag}
          </h2>
          <p data-reveal className="u-lede">
            {social.line}
          </p>
          <p data-reveal className="u-handles">
            {social.handles.map((h) => (
              <a
                key={h.handle + h.label}
                href={`https://instagram.com/${h.handle}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                @{h.handle}
              </a>
            ))}
          </p>
        </div>
      </section>

      {/* ── and back to where it started ───────────────────────────────── */}
      <footer className="utsav-section u-close">
        <div className="utsav-inner">
          <div data-reveal className="u-close__mark">
            <Devanagari name={site.closingKey} height="clamp(1.4rem, 4vw, 2rem)" />
          </div>
          <p data-reveal className="u-eyebrow">
            {site.closingRoman}
          </p>
        </div>
      </footer>
    </div>
  )
}
