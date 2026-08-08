# assets/photos

Drop the photographs here. Any filename — the filename becomes the slug that
`lib/content.ts` refers to, so `haldi.jpg` becomes `haldi`, and
`Bride Portrait.JPG` becomes `bride-portrait`.

```bash
npm run images
```

**Do not compress or resize anything first.** Originals, straight off the camera
or the phone. `scripts/build-images.mjs` produces four widths in AVIF and WebP
plus a blur placeholder, and it can only work with what it is given — a photo
that arrives already squeezed to 800px cannot be un-squeezed for a retina
screen.

Nothing in this folder is committed. The derivatives in `public/img/` and the
manifest in `content/photos.generated.json` are.

| What | How many | Orientation | Slug the site expects |
| --- | --- | --- | --- |
| The two of you | 1 | **vertical** | `hero` |
| Bride portrait | 1 | vertical | `bride` |
| Groom portrait | 1 | vertical | `groom` |
| One per function | up to 7 | vertical preferred | `tilak`, `mehndi`, `haldi`, `sangeet`, `baraat`, `vivah`, `vidaai` |
| Gallery | 8–20 | any mix | `gallery-01`, `gallery-02`, … |

Vertical matters. This is read on a phone held in one hand, and a landscape
photograph in a portrait panel wastes two thirds of the screen.

A function that has not happened yet simply has no file, and its panel draws its
ornament instead. That is a designed state, not a gap — see
`components/utsav/Photo.tsx`.

HEIC straight off an iPhone is not readable here; export as JPEG first. The
script says so rather than failing silently.
