# उत्सव — the celebration

**Built.** Phases 0–5 are done and verified. What is left is not code — it is
the photographs and the words, listed in §5.

The film is the five elements. The celebration is the days. The gatefold card is
the hinge: its doors open and colour floods out.

---

## 1 · The spine — built

North Indian functions already come with their own codified colour, so the
celebration gets the same discipline the film's `LOOK` table has — each panel
owns a palette, and the palette is not decoration, it is the function.

| Panel | Palette | Notes |
|---|---|---|
| **तिलक** Tilak | saffron, sandalwood, white | first colour after the gold — kept quiet |
| **मेहंदी** Mehndi | deep henna green, mirror-work glint | |
| **हल्दी** Haldi | turmeric | the loudest panel on the site, deliberately |
| **संगीत** Sangeet | jewel tones on night, lamplight | the only dark panel in the bright half |
| **बारात** Baraat | marigold and red, full daylight | |
| **विवाह** Vivah | red and gold | **the film's gold returns here** — the two halves rhyme |
| **विदाई** Vidaai | dawn, drained, soft | the exhale |

All seven live together in `app/globals.css` keyed on `[data-fn]`, because a
colour is only ever chosen against its neighbours.

## 2 · The frames are not stock art — built

Both arches come out of one function in `lib/ornament.ts`, as a polar modulation
of an elliptical arch — the same trick the jaali shader uses for its
eight-pointed void. The parity of the lobe count decides the whole character:

```
even cusps → a point on the apex  → राजस्थान, the cusped jharokha arch
odd  cusps → a lobe  on the apex  → अवध, the multifoil
```

The *same string* is used as the `objectBoundingBox` clipPath and as the stroked
outline, so the photograph's edge and the gold line around it cannot drift apart.

Panels take the vocabulary of whoever's function it actually is — `side` in
`lib/content.ts`, not alternated for rhythm. At विवाह both arches are drawn in
the same box, where eight cusps and eleven foils cross along both shoulders.
That is गठबंधन, in 2D, and it is the only panel that gets it.

The textile behind each panel (लहरिया and बंधनी, or बूटी on its zari lattice) is a
CSS **mask** rather than a background image, so one authored motif takes each
panel's own colour instead of needing seven encoded copies.

## 3 · Sections, in order — built

```
[ film: शून्य → … → गठबंधन ]     dark, gold, WebGL
[ Folio gatefold ]               the doors open ─────┐
                                                     ↓
[ ॐ श्री गणेशाय नमः ]            invocation, on colour
[ hero photograph ]              in the bride's multifoil
[ names + "weds" ]               script + serif display
[ आशीर्वाद ]                     grandparents and parents, both sides
[ 7 × function panels ]          the table above — photo, date, venue, map
                                 with a marigold garland strung between each
[ our story ]                    long-form, one column
[ meet the two of them ]         two portraits, two short bios
[ gallery ]                      grid → full-screen lightbox
[ getting there ]
[ RSVP ]                         WhatsApp deep link
[ countdown ]                    DD : HH : MM : SS to the muhurat
[ #hashtag + instagram ]
[ पञ्च महाभूत ]                  back into the film's black and gold
```

The whole celebration is Server Components and ships no JavaScript, except the
two things that genuinely need a clock or a click: the countdown and the
lightbox.

## 4 · What was built, and the things that turned out to matter

**The handoff.** One scrub drives both halves: `film.stage` 1 → 0 and
`--utsav-in` 0 → 1, offset rather than crossfaded so there is a beat of
near-black between them. Two details are load-bearing:

- The fade is **perceptual, not linear**. The film's last shot is a bloomed gold
  knot, and a bloom at 30% opacity is still plainly a bloom.
- Going dark means **disabling every composer pass**, which makes
  `composer.render()` an empty loop. Hiding the acts saves the geometry and none
  of the expensive part — bloom is a fullscreen convolution and costs the same
  over an empty scene. Nothing touches `frameloop` or React state (Trap 14).

**The film's chrome and its sound leave with it.** The sound control fades and
stops being clickable; the drone rides a second gain node downstream of the mute,
so the listener's intent and the film's presence never overwrite each other.

**The image pipeline.** `npm run images` → four widths of AVIF and WebP plus real
dimensions and a 20px blur, committed like the Devanagari outlines. The
dimensions matter as much as the bytes: without them the whole page reflows under
the reader's thumb as each photograph lands.

**A screenshot harness for the half that is not WebGL.** `npm run shoot` drives
Chrome over CDP. `chrome --screenshot` fires on the load event — which on this
page is the film's *held black* — so every shot came back black, and a black shot
of a page that is meant to be black looks exactly like a pass. Same lesson as
Trap 18.

### Verified

| | |
|---|---|
| Devanagari shaping | **40/40 strings pass**, worst IoU 0.9999 |
| console, production build | clean, and no response over 400 |
| canvas at the celebration | `stage 0`, `visibility: hidden`, **0 of 7 acts live** |
| the film after the changes | गठबंधन renders unchanged |
| reduced motion | every block presented; countdown spoken, not ticked |
| lightbox | opens at the clicked index, arrows step, Escape closes, focus returns |
| 390 × 844 portrait | all thirteen sections shot and read |

### Not built, on purpose

**The marigold petals.** §6 offers them as what I would spend the references'
confetti interaction on — but the confetti is not being built either, the build
phases never listed them, and they were not in the feature set you picked. A
second particle system is not a footnote. Say the word and it is a small,
self-contained addition.

---

## 5 · WHAT I NEED FROM YOU

Everything below is the only thing standing between this and finished.

### Photographs — the big one

Drop them in `assets/photos/` and run `npm run images`. Originals, straight off
the camera or phone. **Do not compress or resize them first** — the build script
does that, and it can only work with what it is given.

| What | How many | Orientation | Call it |
|---|---|---|---|
| Hero — the two of you | 1 | **vertical** | `hero` |
| Bride portrait | 1 | vertical | `bride` |
| Groom portrait | 1 | vertical | `groom` |
| One per function | up to 7 | vertical preferred | `tilak`, `mehndi`, `haldi`, `sangeet`, `baraat`, `vivah`, `vidaai` |
| Gallery | 8–20 | any mix | `gallery-01`, `gallery-02`, … |

Vertical matters: this is read on a phone in portrait, and a landscape photo in a
portrait panel wastes two thirds of the screen.

You do not need to tell me which functions have not happened yet. A function with
no file draws its vocabulary's motif and its own name instead, and it already
looks deliberate — see the विवाह panel with no photograph in it.

HEIC straight off an iPhone cannot be read; export as JPEG first. The script says
so rather than failing quietly.

### Text — everything currently marked «PLACEHOLDER»

All of it is in `lib/content.ts`.

- **Grandparents**, both sides, exact spelling and honorifics
- **Parents**, both sides, same
- **Which functions are actually happening** — the current seven are invented.
  Add मायरा / भात, सेहरा बंदी, a reception; delete what this family does not hold.
  Deleting an entry deletes its panel.
- For each: **date, time, venue name, full address, dress code**
- **A Google Maps link per venue** (share → copy link). No link, no button — a
  "View location" that opens an empty map is worse than nothing.
- **The muhurat — exact date AND time.** The countdown is arithmetic; it is
  stated as `2027-02-12T19:42:00+05:30` and the `+05:30` is not optional.
- **WhatsApp number** for RSVP, with country code, no `+`, no spaces
- **Instagram handles** — both, or one shared
- **The hashtag**
- **Your story** — a paragraph or two. Send me rough notes and I'll draft it for
  you to correct; that's usually faster than staring at a blank page.
- **A line each for the two of you**, in your own words rather than your
  families'

Then flip `USING_PLACEHOLDERS` to `false`.

### Still outstanding from the film itself

- **Phera count** — your father said four. Worth one confirmation with the pandit.
- **Janma nakshatras** for both of you — Akasha currently uses placeholders
  (Anuradha and Mrigashira) and this is the one thing on the site that is
  *about* the two of you specifically.
- Whether the pandit wants the **literal Saptapadi mantra words** (इषे · ऊर्जे ·
  …) instead of the themes. One-line change plus `npm run devanagari`.

**Still standing:** no approximated Saptapadi mantras. If the family wants the
full Sanskrit, it comes from your pandit verbatim or not at all.

---

## 6 · Two things I did not copy from the references

**The rainbow gradient buttons** (`45deg, #FFBE0B → #FB5607 → #FF006E → #8338EC`)
are a Framer default. Next to our gold they read as a template. Ours is gold foil
on the panel's own colour, one shape, `.u-link`.

**"Touch here for Magic"** is a confetti burst, and it is not here. See "Not
built, on purpose" above for what I would put in its place instead.

**And one more:** no second typeface. The celebration is set in the same
Cormorant the film is, because it is the same invitation — the difference between
the halves is meant to be colour and pace, not a second designer's taste.
