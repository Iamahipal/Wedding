#!/usr/bin/env node
/**
 * The share card.  `npm run og`
 *
 * This invitation will not mostly be opened from a browser bar. It will be
 * forwarded on WhatsApp, and what a family actually sees first is the preview
 * card — an image, a title, one line of text. Without an og:image that preview
 * is a grey rectangle with a URL in it, which is a poor thing to receive
 * instead of a wedding invitation.
 *
 * The card is composed from the *same committed Devanagari outlines* the film
 * uses, so the names on the preview and the names in the film are the identical
 * vectors — and, as everywhere else here, no font is needed at render time.
 * That matters more than usual: this runs through librsvg inside sharp, which
 * has no access to the webfonts the site ships and would silently substitute
 * something else for any real <text> element.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outlines = JSON.parse(
  fs.readFileSync(path.join(root, 'content/devanagari.generated.json'), 'utf8'),
)

const W = 1200
const H = 630

/** Place a committed outline centred on (cx, cy) at a given cap height. */
function glyphs(key, cx, cy, height, fill) {
  const o = outlines[key]
  if (!o) throw new Error(`build-og: no outline for "${key}" — run npm run devanagari`)
  const s = height / o.height
  const x = cx - (o.width * s) / 2
  const y = cy - height / 2
  return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(5)})"><path d="${o.d}" fill="${fill}" fill-rule="nonzero"/></g>`
}

/** A leheriya band — the same diagonal wave the film weaves into Vayu's silk. */
function leheriyaBand(y, height) {
  const lines = []
  for (let i = -8; i < 42; i++) {
    const x = i * 34
    lines.push(
      `<path d="M${x} ${y + height} L${x + height * 0.55} ${y}" stroke="url(#foil)" stroke-width="3" opacity="0.5" fill="none"/>`,
    )
  }
  return `<g clip-path="url(#bandClip)">${lines.join('')}</g>`
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="78%">
      <stop offset="0%"   stop-color="#140d06"/>
      <stop offset="55%"  stop-color="#0a0603"/>
      <stop offset="100%" stop-color="#050301"/>
    </radialGradient>
    <linearGradient id="foil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#fdf4de"/>
      <stop offset="28%"  stop-color="#ecca80"/>
      <stop offset="58%"  stop-color="#c48b31"/>
      <stop offset="82%"  stop-color="#7e5015"/>
      <stop offset="100%" stop-color="#c9973f"/>
    </linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#c48b31" stop-opacity="0"/>
      <stop offset="50%"  stop-color="#c48b31" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#c48b31" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="bandClip"><rect x="0" y="${H - 46}" width="${W}" height="46"/></clipPath>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="none"
        stroke="#7e5015" stroke-opacity="0.55" stroke-width="1.5"/>

  ${glyphs('invocation', W / 2, 118, 30, '#a46d20')}

  <rect x="${W / 2 - 190}" y="176" width="380" height="1.5" fill="url(#rule)"/>

  ${glyphs('brideName', W / 2 - 232, 320, 118, 'url(#foil)')}
  <circle cx="${W / 2}" cy="320" r="7" fill="#a46d20"/>
  ${glyphs('groomName', W / 2 + 232, 320, 118, 'url(#foil)')}

  <rect x="${W / 2 - 190}" y="452" width="380" height="1.5" fill="url(#rule)"/>

  ${glyphs('panchMahabhuta', W / 2, 520, 40, '#c48b31')}

  ${leheriyaBand(H - 46, 46)}
</svg>`

const outDir = path.join(root, 'public')
fs.mkdirSync(outDir, { recursive: true })

// PNG, not the SVG itself: WhatsApp, iMessage and most crawlers will not render
// an SVG og:image at all, and a share card that silently fails to appear is
// worse than one that is merely large.
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(outDir, 'og.png'))

const bytes = fs.statSync(path.join(outDir, 'og.png')).size
console.log(`public/og.png  ${W}×${H}  ${(bytes / 1024).toFixed(0)} KB`)
if (bytes > 5_000_000) console.warn('  ⚠ over 5MB — WhatsApp will refuse to fetch it')
