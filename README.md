# पञ्च महाभूत · Panch Mahabhuta

A scroll-driven wedding invitation built as a single continuous WebGL film.

The structure is the five great elements of Vedic cosmology, in their traditional
order of subtlety. A wedding is a creation, so the invitation is a creation myth:
the viewer scrolls from nothing, through the five elements, and arrives at a union.

```
शून्य   Shunya      the void       nothing, then a single point of light
आकाश   Akasha      ether          the 27 nakshatras, and the muhurat
वायु    Vayu        air            silk and marigold petals on one wind
अग्नि   Agni        fire           the sacred fire and the seven steps
जल     Jal         water          kalash, lotus and diya on black water
पृथ्वी   Prithvi     earth          the mandap, mehndi, rangoli, the names
गठबंधन  Gathbandhan the knot       two forms interlock
```

Each act uses a different rendering technique, because each element is a
different physical thing. The scroll never repeats itself.

Then the gatefold card opens, the canvas goes dark, and colour floods out.

```
उत्सव   Utsav       the celebration   seven functions, seven palettes, on colour
```

The film is the five elements. The celebration is the days. They are one idea
rather than two websites stapled together — see **उत्सव** below.

---

## Running it

```bash
npm install
npm run devanagari   # once — shapes the Sanskrit into committed outlines
npm run dev
```

| script | what it does |
| --- | --- |
| `npm run dev` | dev server on :3000 |
| `npm run build` | static export into `out/` |
| `npm run devanagari` | re-shape every Devanagari string (see below) |
| `npm run devanagari:verify` | serve the shaping verification page on :4321 |
| `npm run images` | resize `assets/photos/` into `public/img/` (see below) |
| `npm run shoot` | screenshot the celebration at 390px portrait |
| `npm run typecheck` | `tsc --noEmit` |

---

## Where the copy lives

**`lib/content.ts` is the only file with words in it.** Names, dates, venues, the
seven functions, the blessings, the story, RSVP, travel, the hashtag. Everything
currently marked `«PLACEHOLDER»` is invented and must be replaced. A badge is
shown on the page while `USING_PLACEHOLDERS` is `true`; flip it to `false` once
the real copy is in.

Devanagari strings live in **`content/devanagari.json`** instead, because they are
shaped into outlines at build time rather than rendered with a webfont. **If you
change a string there, re-run `npm run devanagari`.**

### The seven vows

`lib/content.ts` displays only the single Sanskrit word each of the seven steps is
named for — अन्न, बल, धन, सुख, प्रजा, ऋतु, सख्य — which is safe to show.

**Do not add, paraphrase or reconstruct the full Saptapadi mantras.** They are
liturgical text and vary by tradition, region and family. If the family wants the
full Sanskrit, get the exact text from their pandit and paste it in verbatim.
Displaying approximated scripture at a real wedding is worse than displaying none.

---

## Devanagari in 3D

No off-the-shelf three.js path can render Devanagari. `TextGeometry` + `FontLoader`
and `troika-three-text` both map characters to glyphs 1:1, and Devanagari needs
complex shaping — conjunct formation, matra reordering, and the shirorekha that
joins the letters of a word. Feed either of them `ॐ गं गणपतये नमः` and the text
comes out mangled. It is not a tuning problem; it is structural.

```
scripts/build-devanagari.mjs   (run once, output committed)
    Tiro Devanagari Hindi (OFL)
        │  harfbuzzjs (WASM HarfBuzz) → glyph ids, offsets, advances
        │  font.glyphToPath()         → outlines
        ▼
    public/dev/*.svg                    committed vectors
    content/devanagari.generated.json   the same paths, inlined
        │  SVGLoader → ShapePath.toShapes()
        ▼
    ExtrudeGeometry with bevels
```

Two consequences, both good: **no Devanagari webfont ships at all**, and the text
can never re-shape differently on somebody else's machine.

### The verification gate

Wrong shaping in a script you cannot proofread is a silent disaster, so the 3D work
is gated on an objective check rather than on eyeballing it.

```bash
npm run devanagari:verify   # then open http://localhost:4321
```

Each string is rasterised twice at a 900px em — once from the generated outline,
once by the *browser* shaping the same string with the same font at the same
baseline and origin — and the intersection-over-union of the two masks is measured.
Identical shaping leaves only sub-pixel antialiasing to disagree about.

> Current state: **30/30 strings pass, worst IoU 0.9999** (threshold 0.985).

The page also draws the browser's shaping in magenta over the generated outline in
black, so any divergence is visible as well as measurable.

---

## उत्सव — the celebration

The second half is the seven functions, each full bleed in its own colour.
North Indian functions are already colour-coded by the families that hold them,
so the palettes are not a mood board — they are the same kind of table the
film's `LOOK` is, and they live next to each other in `app/globals.css` keyed on
`[data-fn]`, because a colour is only ever chosen against its neighbours.

| | | |
|---|---|---|
| **तिलक** | saffron, sandalwood, white | the first colour, kept quiet |
| **मेहंदी** | deep henna green, mirror | the only cool ground |
| **हल्दी** | turmeric | the loudest panel on the site |
| **संगीत** | jewel tones on night | the only dark panel |
| **बारात** | marigold and red | full daylight |
| **विवाह** | red and gold | **the film's palette returns** |
| **विदाई** | dawn, drained | the exhale |

विवाह reaching back into the film's gold is the reason this works: colour
arrives, peaks at हल्दी, and hands one note back to where it came from.

### The handoff

The gatefold card is the hinge. One scrub in `Film.tsx` drives both halves of it:
`film.stage` falls 1 → 0 and `--utsav-in` rises 0 → 1, deliberately offset rather
than crossfaded, so there is a beat of near-black between them and the
celebration lands *out* of the dark rather than through it.

Going dark is not cosmetic. `#stage` is `position: fixed` and mounted forever, so
without this it keeps rendering a full post chain underneath a photo-heavy
scroll it is no longer contributing anything to. Three things happen at the
threshold, and the third is the one that matters:

1. the canvas fades and is then `visibility: hidden`
2. every act's `on` is blanked, so they go invisible and return early
3. **every composer pass is disabled**, which makes `composer.render()` an empty
   loop — zero draw calls, zero fragment work

Only (3) is a real saving. Bloom is a fullscreen convolution and costs the same
over an empty scene as over a full one, so hiding the acts saves the geometry and
none of the expensive part. Nothing here reconfigures the renderer, changes
`frameloop`, or touches React state — TRAP 14 is about a renderer changed
mid-flight, by whatever route.

### The frames are generated, not drawn

`lib/ornament.ts` produces both arches from one function, in a 0..1 unit square:

```
even cusps → a point on the apex  → राजस्थान, the cusped jharokha arch
odd  cusps → a lobe  on the apex  → अवध, the multifoil
```

The same string is used as the `objectBoundingBox` clipPath *and* as the stroked
outline, so the photograph's edge and the gold line around it cannot drift apart.
At विवाह both arches are drawn in the same box, where the eight cusps and the
eleven foils cross along both shoulders — गठबंधन, in 2D.

A function with no photograph yet draws its vocabulary's motif and its own name
instead. That is a designed state, not a hole.

### सारस, and the marigolds

Two pieces of ornament that move, both generated, neither downloaded.

**The cranes.** Sarus — it mates for life, it is the North Indian emblem of
exactly that, and it is the state bird of Uttar Pradesh, which is अवध, which is
the bride's side. Drawn *from below*, which is the whole problem: in profile,
with the wings swept back from the shoulder, this comes out as a delta-wing
aircraft no matter how the curves are tuned. A bird in the sky is seen from
underneath, wings square to the body. The other tell is proportion — the legs
trail 72 units behind the shoulder while the neck reaches 62 in front, and that
inequality is the only thing separating a crane from any other bird.

They fly on **time, not scroll**, which is the same argument `cameraBreath` makes
in `lib/film.ts`: a thing that only moves while a thumb is moving stops dead the
moment somebody pauses to read. No JavaScript — two keyframes and periods that
do not divide into one another.

**The marigolds** are `rosette()` in `lib/ornament.ts`: the same polar modulation
the arches are generated from, swept through a full turn instead of a half one.
They bloom on a stagger as each garland arrives.

One trap worth writing down. The initial state is `opacity: 0` and deliberately
*not* `transform: scale(0)` — a CSS transform on an SVG group resolves against
the viewBox rather than the group's own bounding box, so `scale(0)` collapsed
all twenty-six marigolds onto the corner of a 1000×110 viewBox as a single
orange speck, while GSAP scaled about the bbox centre and disagreed about what
the shape even was. Opacity has no origin to disagree about.

### Photographs

Static export means no `next/image` server, so this is decided at build time and
committed, exactly like the Devanagari outlines:

```
assets/photos/<anything>.jpg          originals, never committed
     │  sharp → AVIF + WebP at 480/768/1080/1440, never upscaled
     ▼
public/img/<slug>-<w>.{avif,webp}     committed derivatives
content/photos.generated.json         real dimensions, and a 20px blur
```

**This is the single decision that makes the celebration fast or slow.** The real
dimensions matter as much as the bytes: without them every `<img>` starts at zero
height and the whole page reflows under the reader's thumb as each photograph
lands. See `assets/photos/README.md` for what to drop in and what to call it.

---

## Architecture

> **React renders the scene once. Scroll never touches React state.**

```
ScrollTrigger ──writes──▶ lib/film.ts ──reads──▶ useFrame
```

Scroll fires dozens of times a second. Anything on that path living in React state
re-renders the tree every frame and the canvas stutters. There is no `setState`
anywhere downstream of scroll.

```
app/layout.tsx       one fixed <canvas>, mounted once, never unmounted
components/
  Stage.tsx          <Canvas> + the post chain
  Film.tsx           the whole shot list — every ScrollTrigger, in scene order
                     …including the handoff into उत्सव
  acts/              one component per act; markup and meshes, no timing
  scene/             camera rig, lighting rig, backdrop, post, shared effects
  Utsav.tsx          the celebration, in section order
  utsav/             panels, frames, photographs, gallery, countdown
lib/
  film.ts            the GSAP ⇄ WebGL bridge, world layout, per-act camera curves
  content.ts         ALL copy
  ornament.ts        the arches and the garland, generated
  photos.ts          the image manifest
  debug.ts           the scrub-and-capture harness (?debug only)
```

The celebration keeps the same three-way split: `lib/content.ts` says *what*,
`app/globals.css` says *what colour*, `components/Film.tsx` says *when*. Nothing
in `components/utsav/` decides any of the three.

Acts stay dumb, so the film can be re-timed without touching a visual and
re-art-directed without touching a timing.

**Every act is mounted once and never unmounted.** The obvious alternative — load
and dispose around the playhead — means re-rendering the `<Canvas>` subtree, which
races the `Environment` portal and the loader Suspense boundaries into an
intermittent crash. Acts stay cheap instead: inactive acts set `visible = false`
and return early from `useFrame`.

### Lenis ⇄ GSAP

1. `autoRaf: false`, Lenis ticked from `gsap.ticker` — one clock, so scroll
   interpolation and every ScrollTrigger resolve in the same frame.
2. `gsap.ticker.lagSmoothing(0)` — a heavy frame must not rewind GSAP's clock.
3. `lenis.on('scroll', ScrollTrigger.update)` — no `scrollerProxy` needed.

---

## The verification harness

Open any page with `?debug` and the film exposes itself:

```js
__film.seek(0.42)              // scrub to exact progress, like a video
__film.act('agni', 0.5)        // or to a named act
__film.to(12000)               // anywhere on the page, past the end of the film
__film.top('[data-fn=haldi]')  // …aimed by selector rather than by pixel
__film.sample()                // mean colour, peak luma, lit fraction, warmth
__film.stats()                 // triangles, draw calls, programs, textures
__film.shot('name', 0.42)      // capture the real drawing buffer to a PNG
```

`__film.shot` posts frames to a local sink so they can be inspected as files:

```bash
node scripts/shots.mjs         # writes scripts/.shots/*.png
```

### …and the half that is not WebGL

उत्सव is ordinary DOM, so it needs an ordinary screenshot, at the only viewport
this is really designed for:

```bash
npm run build && node scripts/serve.mjs out 4322
npm run shoot                                    # all thirteen, 390×844
npm run shoot -- --reduced
npm run shoot -- --probe="__film.state.stage" u-haldi="[data-fn='haldi']"
```

It drives Chrome over CDP rather than using `chrome --screenshot`, and the reason
is the same lesson again: `--screenshot` fires on the load event, which on this
page is the film's opening — *held black*. Every shot comes back black, and a
black shot of a page that is supposed to be black looks exactly like a pass. So
the page is driven instead: wait until `__filmReady`, aim it with the harness,
wait for the reveals, then capture. It reports console errors and any response
over 400 while it is in there, because "the production console is clean" is worth
measuring rather than remembering.

`?at=<selector>` does the same aiming from a plain URL, and it runs
*synchronously* after `ScrollTrigger.refresh()` — a tab that is not being
composited never runs a `requestAnimationFrame` callback, so the deferred version
silently did nothing.

Three things make this work, and all three are easy to get wrong:

- **`preserveDrawingBuffer`** is enabled under `?debug`. Without it
  `canvas.toBlob()` on a WebGL canvas returns a blank image and any measurement
  built on it reports confident zeros.
- **A polling ResizeObserver** replaces the real one under `?debug`. R3F will not
  create the renderer until a ResizeObserver callback reports a size, and a tab
  that is not being composited never delivers one.
- **Frames are scrubbed, not sampled.** A three-second opening cannot be caught on
  a wall clock; you will photograph either side of the explosion and conclude it
  never happened.

### What it currently measures

| | |
| --- | --- |
| peak triangles | 23,593 |
| peak draw calls | 37 |
| cold frames across the whole film | 0 (warmth > 0 at all 41 samples) |
| production console | clean |

Triangle and draw-call counts are hardware-independent; frame timings on a dev
machine are not.

---

## Accessibility

`prefers-reduced-motion` is a first-class branch, not a switch that freezes things.

- The camera is pinned to each act's most legible pose (`HERO_P`).
- Content progress is remapped onto the stretch of each act where there is
  something to see (`REDUCED_CONTENT`), because most of this film's motion belongs
  to the subjects rather than to the lens — pinning the camera alone left the
  viewer scrolling through a black screen.
- Captions and the seven vows switch discretely rather than fading, and one at a
  time: they share absolutely-positioned boxes, so revealing them all at once
  stacks seven captions on top of each other.

In the celebration the same rule holds: reduced motion still *presents* every
block, and the countdown's numerals are `aria-hidden` behind one spoken sentence
saying when the wedding is — a live region ticking once a second is unusable, and
the numerals are only decorating information that can be stated once.

Sound never starts on its own. The control is rendered in the first paint, and the
gesture that unlocks audio *is* the bell strike. It also *stops* on its own: the
drone is the one thing that never runs out, so the handoff rides a second gain
node downstream of the mute — the listener's intent and the film's presence are
separate decisions and must not overwrite each other.

---

## Deploying

Static export — `out/` is a folder of files, no server.

For a GitHub **project** page (served from `/<repo>/`):

```bash
NEXT_PUBLIC_BASE_PATH=/your-repo npm run build
```

Next rewrites its own URLs but not yours. Every reference to anything in `public/`
must go through `asset()` in `lib/basePath.ts`, or it will work locally and 404 in
production.

---

## Look notes

- **AgX tone mapping, not ACES.** ACES desaturates blown highlights toward white,
  so gold stops being gold at exactly the moment it gets bright.
- **The environment is a few very bright, very small shapes against a dark warm
  surround.** A broad even environment lights every face to the same value and
  metal becomes a flat glowing blob. The surround is warm, not black — black drains
  the colour out of the shadows and gold turns to gunmetal.
- **The rig moves.** The baked cubemap rotates and two punctual lights orbit, so
  highlights travel across the bevels forever. Biggest "alive" factor, and free.
- **Emissive reaches zero.** Glow makes a distant object read as a jewel and
  destroys a near one — the curve is driven by apparent size, not by scroll.
- **Chromatic aberration is exactly zero at rest**, and snapped to zero below a
  floor. A sub-pixel offset speckles 1px particles magenta and green.
- **Grain is premultiplied.** Post-tone-map effects work in display-linear and the
  sRGB curve is applied after, so an additive grain of 0.022 lands at 40/255 and
  lifts the whole void to flat grey.
- **No vignette.** The backdrop does the falloff, in the world, so it has parallax.
