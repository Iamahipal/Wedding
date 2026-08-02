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
| `npm run typecheck` | `tsc --noEmit` |

---

## Where the copy lives

**`lib/content.ts` is the only file with words in it.** Names, dates, venues,
events, RSVP, travel. Everything currently marked `«PLACEHOLDER»` is invented and
must be replaced. A badge is shown on the page while `USING_PLACEHOLDERS` is
`true`; flip it to `false` once the real copy is in.

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
  acts/              one component per act; markup and meshes, no timing
  scene/             camera rig, lighting rig, backdrop, post, shared effects
lib/
  film.ts            the GSAP ⇄ WebGL bridge, world layout, per-act camera curves
  content.ts         ALL copy
  debug.ts           the scrub-and-capture harness (?debug only)
```

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
__film.sample()                // mean colour, peak luma, lit fraction, warmth
__film.stats()                 // triangles, draw calls, programs, textures
__film.shot('name', 0.42)      // capture the real drawing buffer to a PNG
```

`__film.shot` posts frames to a local sink so they can be inspected as files:

```bash
node scripts/shots.mjs         # writes scripts/.shots/*.png
```

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

Sound never starts on its own. The control is rendered in the first paint, and the
gesture that unlocks audio *is* the bell strike.

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
