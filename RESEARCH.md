# RESEARCH.md

A record of what has been checked, what it is based on, and how confident it is.

This file exists to be **cross-checked by someone else**. Every claim carries its
sources. Where sources disagree, the disagreement is recorded rather than
resolved by picking a favourite. Where the film knowingly departs from accuracy
for the sake of an image, that is written down too.

**Confidence** is one of:

| | |
|---|---|
| **High** | multiple independent sources agree, or it is uncontested |
| **Medium** | attested, but sources vary or are popular rather than scholarly |
| **Contested** | sources genuinely disagree; the film picks one and says so |
| **Ask the pandit** | not answerable by research — depends on this family |

---

## 1 · फेरे (phere) — how many circuits?

**Contested.** Both four and seven are real, well-attested traditions.

- **Four** — one per पुरुषार्थ: धर्म, अर्थ, काम, मोक्ष. Standard in Gujarati
  weddings and various North Indian communities. Groom leads the first three,
  bride the fourth.
- **Seven** — culturally dominant in North India to the point that *"saat
  phere"* is a synonym for marriage. A Rajasthan-specific ritual guide describes
  seven circuits.
- **Arya Samaj** — explicitly *four or seven*, depending on the officiant.

> Mahipal's father reports **four** for this family. That is the operative
> answer; nothing below overrides it.

One popular article claims four were "originally" the essential circuits and
three were added later. **It gives no textual source and is not relied on here.**

Sources: [Arya Samaj Foundation](https://aryasamaj.davchennai.org/book-samskaars/vivaah-marriage/) ·
[Magik India — Rajasthan rituals](https://magikindia.com/en/les-rituels-du-mariage-au-rajasthan/) ·
[Lin & Jirsa — Mangal Fera](https://www.linandjirsa.com/mangal-fera-indian-wedding-ceremony/) ·
[TimesLife](https://timeslife.com/relationship/why-some-hindu-weddings-have-four-pheras-instead-of-seven/articleshow/117405199.html) *(unsourced claim, noted only)*

**Ask the pandit:** confirm four, and whether saptapadi is performed as seven
separate steps in addition.

---

## 2 · सप्तपदी vs फेरे — the same rite or two?

**Medium.** Popular writing runs them together; the practice does not.

Wikipedia: *"In some regions, the couple walks around the altar seven times. In
other regions, the couple takes seven steps to complete a single
circumambulation."* Arya Samaj sources describe saptapadi as seven steps taken
**in addition to** the pheras.

**Film state:** the Agni caption previously read *"seven steps **around** the
sacred fire"*, which asserted both the conflation and a phera count. Corrected —
it now claims no count of circuits at all. The seven **vow words** are unaffected,
because saptapadi is seven by definition regardless of how many circuits are
walked.

Source: [Saptapadi — Wikipedia](https://en.wikipedia.org/wiki/Saptapadi)

---

## 3 · The seven vow words

**Medium, and a deliberate choice.**

The film displays अन्न · बल · धन · सुख · प्रजा · ऋतु · सख्य. These are the
commonly cited **themes** of the seven steps, not the literal mantra vocabulary.
The verbatim Sanskrit of the mantras runs इषे · ऊर्जे · रायस्पोषाय ·
मायोभवाय · प्रजाभ्यः · ऋतुभ्यः · सख्य.

Both are defensible. The themes were chosen because the film's standing rule is
never to display approximated scripture — see the note in `lib/content.ts`.

**Ask the pandit:** whether they would prefer the literal mantra words. It is a
one-line change plus `npm run devanagari`.

---

## 4 · गुण मिलान — matching the birth stars

**High.** Genuine and near-universal before an arranged Hindu marriage.

**अष्टकूट**: eight kootas totalling **36 गुण**; eighteen or more is a match.
Crucially, the couple's two **birth nakshatras** carry most of it — Tara (3),
Yoni (4), Gana (6) and Nadi (8) are all derived from them, **21 of the 36
points**. Nadi is treated as decisive: an unfavourable Nadi can veto a match
scoring 28.

**Film state:** Akasha shows the two birth nakshatras brightening in their own
mansions with a line drawn between them.

**Correction on record:** an earlier commit called this invented. That was
wrong. What was invented was only the *merging* — the two stars drifting across
the sky to become one point. The accurate image, a line between two stars that
stay where they are, is what a match actually is.

Sources: [Drik Panchang](https://www.drikpanchang.com/jyotisha/horoscope-match/horoscope-match.html) ·
[mPanchang — Nakshatra matching](https://www.mpanchang.com/astrology/nakshatra-matching/) ·
[AstroSage](https://www.astrosage.com/freechart/matchmaking.asp)

**Ask the pandit / the couple:** Niharika's and Mahipal's actual janma
nakshatras. `lib/content.ts` currently holds placeholders (Anuradha, Mrigashira).

---

## 5 · ध्रुव दर्शन and अरुन्धती दर्शन

**High.** Both are real marriage rites performed by looking at specific stars.

- **ध्रुव** — the groom shows the bride the pole star, the one point that does
  not move. That she should be steadfast like Dhruva.
- **अरुन्धती** — the faint star beside Vasishtha in the सप्तर्षि. Arundhati was
  Vasishtha's wife; the pair are shown as the model of a marriage. In modern
  terms Alcor beside Mizar, a genuine naked-eye double in the handle of the
  Plough.

**Deliberate inaccuracy, flagged:** in the real sky Dhruva sits about *five
pointer-lengths* beyond Dubhe. At that scale it left the frame entirely and the
act showed a line running out of shot toward a star nobody could see. **The
direction is honest; the distance is compressed.**

Sources: [Dhruvadarshana — Wisdom Library](https://www.wisdomlib.org/definition/dhruvadarshana) ·
[Arundhatidarshana — Wisdom Library](https://www.wisdomlib.org/definition/arundhatidarshana) ·
[The Vedic Wedding Ceremony — Ramanuja.org](https://www.ramanuja.org/sri/Web/VedicWeddingCeremony)

---

## 6 · The मण्डप and its four pillars

**Contested — and the film should not assert a single meaning.**

Sources offer at least four readings of the four pillars, and they are not
reconcilable:

1. the four **आश्रम** — ब्रह्मचर्य, गृहस्थ, वानप्रस्थ, संन्यास
2. the four **वेद**
3. the four **पुरुषार्थ** — धर्म, अर्थ, काम, मोक्ष
4. the couple's **four parents**, or the walls of the home they will make

The purushartha reading is attested but is **one of several**, not the meaning.
It is the one that rhymes with this family's four pheras, which is a reason to
favour it in the film — but as a choice, not as a fact.

### The finding that matters more

Several sources describe the mandap's structure as encoding the **five
elements** directly: *stacked pots at the four corners for earth, water, fire
and air — and the canopy above them as the fifth, आकाश.*

This is the entire structure of the film, embodied in its own final act. The
mandap is पञ्च महाभूत. That is worth building.

**Confidence:** Medium on the specific pot-per-element mapping (popular sources,
not a Grihya Sutra citation); High that the mandap is read as a cosmological
model with the canopy as sky.

Sources: [Compare the Mandap — four pillars](https://comparethemandap.com/blog/four-pillars-of-mandap-symbolism) ·
[Manyavar — mandap significance](https://www.manyavar.com/en-in/blog-decoding-spiritual-significance-of-wedding-mandap.html) ·
[Religion World](https://www.religionworld.in/mandap-in-hindu-wedding-elements-and-significance/) ·
[Wedding mandapa — Wikipedia](https://en.wikipedia.org/wiki/Wedding_mandapa)

**Ask the pandit:** which reading of the pillars their tradition uses, if any.

---

## 7 · जाली — the pierced screen, and where it belongs

**High** on what a jaali is. **Medium** on its wedding placement.

A जाली (*jālī*, "net") is a perforated stone or latticed screen — geometric,
floral or calligraphic. Its origins are in Hindu temple architecture; it reached
its height in Rajasthan and under the Mughals, cut from sandstone and marble.

It does three things at once, and all three are practical before they are
decorative:

- **air** — small openings accelerate a breeze through them
- **light** — hard desert sun is broken into a soft dapple, glare cut
- **purdah** — it screens the zenana, so the women inside can look out without
  being looked at. Hawa Mahal is the canonical example.

**Placement — this is the part that changed the build.** A jaali is
*architecture*, not ritual equipment. It is not part of a mandap and never has
been. Where jaali and jharokha appear at a Rajasthani wedding, sources
consistently describe them as a **backdrop set behind the couple** — carved or
cut panels used to put a palace behind the mandap.

So the film builds it as a screen standing behind the mandap rather than
threading a lattice through a structure that has never had one.

It is lit from behind, which is the only way the object makes sense: a jaali
seen flat is a wall with holes; a jaali with light behind it is the thing people
photograph. The first attempt lit the stone faces and left the openings dark,
which was exactly backwards.

Sources: [Jali — Wikipedia](https://en.wikipedia.org/wiki/Jali) ·
[History of Jalis in Indian Architecture — Penn State](https://sites.psu.edu/perforatedscreendesigner/history-of-jalis-in-indian-architecture/) ·
[Jali in Mughal Architecture — DailyArt](https://www.dailyartmagazine.com/jali-in-mughal-architecture-the-most-delicate-stone-curtains/) ·
[Mandap decoration, Rajasthani wedding — Jeeman](https://jeeman.online/blog/mandap-decoration-ideas) ·
[Styl — Rajasthani wedding themes](https://styl-inc.com/blogs/how-to-incorporate-royal-rajasthani-themes-in-your-2025-wedding/)

**Note:** the wedding-placement sources are decor blogs rather than scholarship.
The claim is consistent across them and matches what a jaali structurally is,
but it is not textual authority. Confidence Medium, stated as such.

---

## 8 · हवन कुंड — the fire pit

**High** on shape. **Medium** on material preference.

Square or rectangular, on a square base, with a stepped, tapering body. The
square is read as the four cardinal directions and as stability. Used for
गृह प्रवेश, weddings and homams.

**Material:** brick, clay, or metal — and copper is repeatedly named as *the*
material for fire rites, on grounds of thermal conductivity and ritual purity.

**Film state:** the kund was brick and is now copper. It was also the subject of
three failed fixes, and the record is worth keeping because the lesson is
general:

> The pit kept rendering pale. I blamed the flame twice and moved it — raising
> its origin, then softening its base density. Neither worked. Sampling the kund
> region with the flame **hidden** gave (84,61,46) against (98,71,54) with it:
> the fire was contributing about a seventh of the brightness. The other six
> sevenths were the scene's environment lighting a near-diffuse surface, which
> moving the fire could never have touched.

Copper resolves it as physics rather than as tuning. A metal has no diffuse
response — it shows nothing but its surroundings, and the surroundings here are
a dark warm surround. The vessel now sits dark on its own terms and takes the
fire as a specular highlight rather than as a wash, which is also what copper
next to a fire looks like. Measured after: 59% of the kund is in shadow.

Sources: [Rudraksha Ratna — traditional Vedic havan kund](https://www.rudraksha-ratna.com/buy/traditional-vedic-havan-kund-copper-i) ·
[Giri — copper agni kund](https://giri.in/products/hawan-kund-12-x-12-inches-copper-agni-kund) ·
[Arvachin — copper havan kund](https://arvachin.in/product/copper-havan-kund-yagna-kund-homa-kund-agni-kund-puja-kund-havan-yajna-kund/)

**Note:** these are retailers, not scholarship — they agree on copper but they
also sell copper. The shape claim is better attested than the material
preference. Confidence Medium on the latter, stated as such.

**Ask the pandit:** whether this family's kund is brick-built on site or a metal
vessel.
