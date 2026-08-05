import Devanagari from './Devanagari'
import Folio from './Folio'
import { couple, events, invitation, rsvp, site, travel, USING_PLACEHOLDERS } from '@/lib/content'

/**
 * The invitation proper.
 *
 * After seven acts of film, the information should feel like a calm exhale:
 * plain vertical scroll, generous space, no camera, no effects. The gold field
 * behind it is still the same canvas, so the material never changes — only the
 * pace does.
 */

function Rule() {
  return <div className="rule mx-auto my-14 w-40" />
}

export default function Invitation() {
  return (
    <section data-invite className="relative z-10 px-6 pb-32 pt-[22vh]">
      <div className="mx-auto max-w-3xl text-center">
        {/* ── the names ─────────────────────────────────────────────────── */}
        <p data-reveal className="eyebrow">
          {invitation.eyebrow}
        </p>

        <div data-reveal className="mt-10 flex items-center justify-center gap-5 text-gold-200">
          <Devanagari name={couple.bride.devanagariKey} gradient height="clamp(2rem,6vw,3.4rem)" />
          <span className="text-[clamp(1.4rem,4vw,2.2rem)] font-light text-gold-500">·</span>
          <Devanagari name={couple.groom.devanagariKey} gradient height="clamp(2rem,6vw,3.4rem)" />
        </div>

        <h1
          data-reveal
          className="mt-6 text-[clamp(2.6rem,9vw,5rem)] font-light leading-[1.05] tracking-[0.02em] text-gold-100"
        >
          {couple.bride.name}
          <span className="mx-3 align-middle text-[0.5em] text-gold-500">&</span>
          {couple.groom.name}
        </h1>

        <p
          data-reveal
          className="mx-auto mt-7 max-w-xl text-[clamp(1rem,2.5vw,1.25rem)] font-light leading-relaxed text-gold-100/75"
        >
          {invitation.headline}
        </p>

        <Rule />

        <p data-reveal className="text-[clamp(1.1rem,3vw,1.6rem)] font-light text-gold-200">
          {invitation.dateLine}
        </p>
        <p data-reveal className="eyebrow mt-4">
          {invitation.cityLine}
        </p>
        <p data-reveal className="mt-6 text-[0.95rem] font-light italic text-gold-300/70">
          {invitation.muhuratLine}
        </p>

        <Rule />

        {/* ── the celebrations, in the folio ────────────────────────────── */}
        <h2 data-reveal className="eyebrow mb-4">
          The celebrations
        </h2>
        <p data-reveal className="mb-2 text-[0.85rem] font-light text-gold-100/45">
          Open the card, and take out a day.
        </p>

        {/* The reveal wrapper sits *above* .folio-stage, which is where the
            perspective is established — so its opacity and will-change cannot
            flatten the 3D scene inside it. Putting data-reveal any lower would. */}
        <div data-reveal>
        <Folio
          label="The celebrations"
          count={events.length}
          invocationKey="invocation"
          frontKey="vivah"
          items={events.map((e) => ({
            id: e.key,
            label: e.name,
            content: (
              <div className="px-5 py-6 text-void">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[1.35rem] font-light leading-none text-[#2a1806]">{e.name}</h3>
                  {e.devanagariKey && (
                    <span className="text-[#6b4a16]">
                      <Devanagari name={e.devanagariKey} height="0.9rem" />
                    </span>
                  )}
                </div>

                <div className="my-4 h-px w-full bg-[#2a1806]/20" />

                <p className="font-[family-name:var(--font-ui)] text-[0.6rem] uppercase tracking-[0.2em] text-[#7a5a22]">
                  {e.time}
                </p>
                <p className="mt-3 text-[0.95rem] font-light leading-snug text-[#3a2409]">
                  {e.date}
                </p>
                <p className="mt-2 text-[0.95rem] font-light leading-snug text-[#3a2409]">
                  {e.venue}
                </p>
                <p className="mt-1 text-[0.82rem] font-light leading-snug text-[#3a2409]/65">
                  {e.address}
                </p>
                {e.dress && (
                  <p className="mt-4 text-[0.8rem] italic text-[#6b4a16]">{e.dress}</p>
                )}
                {e.note && <p className="mt-2 text-[0.8rem] text-[#6b4a16]">{e.note}</p>}
              </div>
            ),
          }))}
        />
        </div>

        <Rule />

        {/* ── travel ────────────────────────────────────────────────────── */}
        <h2 data-reveal className="eyebrow mb-12">
          {travel.headline}
        </h2>
        <div className="grid gap-10 text-left sm:grid-cols-3">
          {travel.items.map((t) => (
            <div key={t.title} data-reveal>
              <h3 className="text-[1.15rem] font-light text-gold-200">{t.title}</h3>
              <p className="mt-3 text-[0.95rem] font-light leading-relaxed text-gold-100/70">
                {t.body}
              </p>
            </div>
          ))}
        </div>

        <Rule />

        {/* ── rsvp ──────────────────────────────────────────────────────── */}
        <h2 data-reveal className="text-[clamp(1.8rem,5vw,2.6rem)] font-light text-gold-100">
          {rsvp.headline}
        </h2>
        <p data-reveal className="mt-5 font-light text-gold-100/75">
          {rsvp.line}
        </p>

        <p data-reveal className="mt-10">
          <a
            href={rsvp.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block border border-gold-500/70 px-12 py-4 font-[family-name:var(--font-ui)] text-[0.72rem] uppercase tracking-[0.32em] text-gold-200 transition-colors duration-500 hover:border-gold-300 hover:bg-gold-900/60 hover:text-gold-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-300"
          >
            {rsvp.cta}
          </a>
        </p>

        <div data-reveal className="mt-12 flex flex-wrap justify-center gap-x-12 gap-y-4">
          {rsvp.contacts.map((c) => (
            <p key={c.name} className="text-[0.9rem] font-light text-gold-100/60">
              <span className="text-gold-200">{c.name}</span>
              <span className="mx-2 text-gold-600">·</span>
              {c.role}
              <span className="mx-2 text-gold-600">·</span>
              <a className="hover:text-gold-200" href={`tel:${c.tel.replace(/\s/g, '')}`}>
                {c.tel}
              </a>
            </p>
          ))}
        </div>

        <Rule />

        {/* ── closing ───────────────────────────────────────────────────── */}
        <div data-reveal className="flex justify-center text-gold-300/80">
          <Devanagari name={site.closingKey} gradient height="clamp(1.5rem,4vw,2.2rem)" />
        </div>
        <p data-reveal className="eyebrow mt-5">
          {site.closingRoman}
        </p>
      </div>

      {USING_PLACEHOLDERS && (
        <div className="pointer-events-none fixed bottom-3 left-3 z-40 rounded-sm border border-gold-700/60 bg-void/85 px-3 py-1.5 font-[family-name:var(--font-ui)] text-[0.6rem] uppercase tracking-[0.18em] text-gold-400/90 backdrop-blur-sm">
          Placeholder copy — see lib/content.ts
        </div>
      )}
    </section>
  )
}
