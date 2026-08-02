#!/usr/bin/env node
/**
 * Devanagari → committed outlines.  Run once; the output is committed.
 *
 *     npm run devanagari
 *
 * WHY THIS EXISTS
 * ───────────────
 * No off-the-shelf three.js path can render Devanagari. TextGeometry+FontLoader
 * and troika-three-text both map characters to glyphs 1:1. Devanagari requires
 * *complex shaping*: conjunct formation, matra reordering, and the shirorekha —
 * the headline bar that joins the letters of a word. Feed either of them
 * "ॐ गं गणपतये नमः" and you get mangled, wrong text. It is not a tuning problem,
 * it is structural.
 *
 *     an OFL Devanagari font (Tiro Devanagari Hindi)
 *          │  harfbuzzjs (WASM HarfBuzz) → correct glyph ids, offsets, advances
 *          │  font.glyphToPath()         → outlines, no second library needed
 *          ▼
 *     public/dev/<key>.svg               committed vectors
 *     content/devanagari.generated.json  the same paths, inlined
 *          │  SVGLoader.parse/createShapes → Shapes with their counters as holes
 *          ▼
 *     ExtrudeGeometry with bevels
 *
 * Two consequences, both good: no Devanagari webfont ships at all — and the
 * font-loading race disappears along with it — and the text can never re-shape
 * differently on somebody else's machine.
 *
 * The paths are inlined into JSON as well as written as files so that the
 * opening of the film does not have to wait on a fetch for the very first thing
 * the viewer sees.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as hb from 'harfbuzzjs'

import { bounds, parsePath, serializePath, transformPath } from './svgpath.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')

const FONT_CANDIDATES = [
  'node_modules/@expo-google-fonts/tiro-devanagari-hindi/400Regular/TiroDevanagariHindi_400Regular.ttf',
]

function findFont() {
  for (const rel of FONT_CANDIDATES) {
    const p = path.join(root, rel)
    if (fs.existsSync(p)) return p
  }
  // fall back to scanning, so a version bump that moves the file is survivable
  const base = path.join(root, 'node_modules/@expo-google-fonts/tiro-devanagari-hindi')
  if (fs.existsSync(base)) {
    const stack = [base]
    while (stack.length) {
      const dir = stack.pop()
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name)
        if (e.isDirectory()) stack.push(full)
        else if (e.name.endsWith('.ttf') && !/italic/i.test(e.name)) return full
      }
    }
  }
  throw new Error(
    'Could not find the Tiro Devanagari Hindi TTF. Run:\n' +
      '  npm install -D @expo-google-fonts/tiro-devanagari-hindi',
  )
}

const fontPath = findFont()
const fontData = fs.readFileSync(fontPath)

const blob = new hb.Blob(new Uint8Array(fontData).buffer)
const face = new hb.Face(blob)
const font = new hb.Font(face)
const upem = face.upem

function shapeRun(text) {
  const buffer = new hb.Buffer()
  buffer.addText(text)
  buffer.guessSegmentProperties()
  hb.shape(font, buffer)
  const infos = buffer.getGlyphInfos()
  const positions = buffer.getGlyphPositions()
  const out = infos.map((info, i) => ({
    gid: info.codepoint, // glyph id, despite the property name
    cluster: info.cluster,
    xAdvance: positions[i].xAdvance,
    yAdvance: positions[i].yAdvance,
    xOffset: positions[i].xOffset,
    yOffset: positions[i].yOffset,
  }))
  buffer.destroy?.()
  return out
}

/**
 * The inter-word advance, measured the way a browser measures it.
 *
 * This is not the font's own advance for the space glyph, and the difference is
 * worth writing down because it cost a failed verification run to find.
 *
 *   hmtx advance for the space glyph ............ 260
 *   shaped inside a Devanagari run .............. 260
 *   shaped as a run of its own .................. 220
 *
 * A browser itemises text into runs and a space between two Devanagari words
 * does not inherit Devanagari script, so it picks up the font's default-script
 * adjustment and comes out 40 units narrower. Shaping the whole string as one
 * Deva buffer skips that adjustment and every word after a space lands 40 units
 * to the right of where a browser would put it.
 *
 * Neither number is *wrong*, but the browser is the reference this pipeline is
 * verified against, and "close enough" in a script nobody on the team can
 * proofread is precisely the failure mode this whole approach exists to remove.
 * So: runs are split on spaces, exactly as the browser splits them.
 */
const SPACE_ADVANCE = (() => {
  const g = shapeRun(' ')
  return g.reduce((sum, q) => sum + q.xAdvance, 0)
})()

/** Shape one string and return its outline in SVG (Y-down) coordinates. */
function shapeToOutline(text) {
  let penX = 0
  let penY = 0
  let segs = []
  const glyphs = []
  let missing = 0

  const runs = text.split(' ')
  for (let r = 0; r < runs.length; r++) {
    if (r > 0) penX += SPACE_ADVANCE
    if (runs[r].length === 0) continue

    for (const g of shapeRun(runs[r])) {
      if (g.gid === 0) missing++

      const d = font.glyphToPath(g.gid)
      if (d && d.length > 0) {
        // SVG is Y-down and font units are Y-up, so the outline is mirrored on
        // Y here, once, at build time. Nothing downstream has to think about it
        // — except the extruder, which has its own note about triangle winding.
        segs = segs.concat(transformPath(parsePath(d), 1, -1, penX + g.xOffset, -(penY + g.yOffset)))
      }

      glyphs.push({ ...g, empty: !d || d.length === 0 })
      penX += g.xAdvance
      penY += g.yAdvance
    }
  }

  return { segs, glyphs, advance: penX, missing }
}

const source = JSON.parse(fs.readFileSync(path.join(root, 'content/devanagari.json'), 'utf8'))
const keys = Object.keys(source).filter((k) => !k.startsWith('_'))

const outDir = path.join(root, 'public/dev')
fs.mkdirSync(outDir, { recursive: true })

const PAD = Math.round(upem * 0.04)
const generated = {}
const report = []
let failed = 0

for (const key of keys) {
  const text = source[key]
  const { segs, glyphs, advance, missing } = shapeToOutline(text)

  if (missing > 0) {
    failed++
    report.push({ key, text, glyphs: glyphs.length, status: `MISSING GLYPH ×${missing}` })
    continue
  }
  if (segs.length === 0) {
    failed++
    report.push({ key, text, glyphs: glyphs.length, status: 'NO OUTLINE' })
    continue
  }

  const b = bounds(segs)
  const width = Math.ceil(b.width) + PAD * 2
  const height = Math.ceil(b.height) + PAD * 2
  const placed = transformPath(segs, 1, 1, -b.minX + PAD, -b.minY + PAD)
  const d = serializePath(placed)

  generated[key] = {
    text,
    width,
    height,
    /** where the font baseline sits in this SVG's own coordinates */
    baselineY: Math.round(-b.minY + PAD),
    /** left edge of the shaping origin, same coordinates */
    originX: Math.round(-b.minX + PAD),
    upem,
    advance: Math.round(advance),
    glyphCount: glyphs.length,
    d,
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label=${JSON.stringify(text)}>` +
    `<path fill="currentColor" fill-rule="nonzero" d="${d}"/>` +
    `</svg>\n`
  fs.writeFileSync(path.join(outDir, `${key}.svg`), svg, 'utf8')

  report.push({ key, text, glyphs: glyphs.length, status: `${width}×${height}` })
}

fs.writeFileSync(
  path.join(root, 'content/devanagari.generated.json'),
  JSON.stringify(generated, null, 0) + '\n',
  'utf8',
)

/* ── the verification gate ──────────────────────────────────────────────────
 * Wrong shaping in a script you cannot proofread is a silent disaster, so the
 * 3D work is gated on this passing.
 *
 * Each row draws the generated outline as a black fill and, on top of it, the
 * *browser's* own shaping of the same string with the same font, stroked in
 * magenta — same viewBox, same em size, same baseline, so they are in identical
 * coordinates by construction. If the pipeline shaped anything differently the
 * magenta pulls away from the black and it is impossible to miss.
 * -------------------------------------------------------------------------*/
const verifyDir = path.join(root, 'scripts/.verify')
fs.mkdirSync(verifyDir, { recursive: true })
fs.copyFileSync(fontPath, path.join(verifyDir, 'verify.ttf'))

const rows = Object.entries(generated)
  .map(([key, g]) => {
    const scale = 150 / g.height
    return `<section>
  <h2>${key} <small>${g.glyphCount} glyphs · ${g.width}×${g.height}</small></h2>
  <div class="pair">
    <svg viewBox="0 0 ${g.width} ${g.height}" width="${Math.round(g.width * scale)}" height="150">
      <path fill="#111" fill-rule="nonzero" d="${g.d}"/>
      <text x="${g.originX}" y="${g.baselineY}" font-family="TiroVerify" font-size="${g.upem}"
            fill="none" stroke="#ff2d78" stroke-width="6" xml:lang="hi">${escapeXml(g.text)}</text>
    </svg>
  </div>
  <p class="txt" lang="hi">${escapeXml(g.text)}</p>
  <p class="score" data-score="${key}">measuring…</p>
</section>`
  })
  .join('\n')

function escapeXml(s) {
  return s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c])
}

fs.writeFileSync(
  path.join(verifyDir, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>Devanagari shaping verification</title>
<style>
  @font-face { font-family: TiroVerify; src: url(verify.ttf) format('truetype'); }
  body { font: 14px/1.5 ui-sans-serif, system-ui, sans-serif; background:#fff; color:#111; margin:24px; max-width:1100px }
  h1 { font-size:18px } h2 { font-size:13px; font-weight:600; margin:0 0 6px; color:#555 }
  small { font-weight:400; color:#999 }
  section { border-bottom:1px solid #eee; padding:14px 0 }
  .pair { overflow-x:auto }
  .txt { font-family: TiroVerify; font-size: 34px; margin:8px 0 0; color:#0a7 }
  .legend b { color:#111 } .legend i { color:#ff2d78; font-style:normal }
  .score { font:12px ui-monospace, monospace; margin:6px 0 0 }
  .pass { color:#0a7 } .fail { color:#d00; font-weight:700 }
  #summary { position:sticky; top:0; background:#fff; border-bottom:2px solid #111; padding:10px 0; font:13px ui-monospace, monospace }
</style>
<div id="summary">measuring…</div>
<h1>Devanagari shaping verification</h1>
<p class="legend"><b>Black fill</b> = outlines generated by the build script.
<i>Magenta stroke</i> = the browser's own shaping of the same string, same font, same em, same baseline.
They must coincide everywhere. Any magenta that pulls away from the black is a shaping bug —
check conjuncts, matra placement and the shirorekha in particular.</p>
${rows}
<script>
/**
 * The gate, made objective.
 *
 * Eyeballing 29 strings in a script most of the team cannot read is not a test.
 * So each string is rasterised twice at a large em — once from the generated
 * outline, once by the browser shaping the same string with the same font at
 * the same baseline and origin — and the intersection-over-union of the two
 * coverage masks is measured. Identical shaping leaves only sub-pixel
 * antialiasing to disagree about, which lands well above the threshold; a
 * mis-formed conjunct, a mis-ordered matra or a broken shirorekha moves real
 * area and drops the score immediately.
 */
const THRESHOLD = ${'0.985'};
const EM_PX = 900;
window.__verify = async () => {
  await document.fonts.load('100px TiroVerify');
  await document.fonts.ready;
  const rows = [];
  for (const sec of document.querySelectorAll('section')) {
    const el = sec.querySelector('[data-score]');
    const key = el.dataset.score;
    const svg = sec.querySelector('svg');
    const vb = svg.getAttribute('viewBox').split(/\\s+/).map(Number);
    const d = svg.querySelector('path').getAttribute('d');
    const t = svg.querySelector('text');
    const originX = +t.getAttribute('x'), baselineY = +t.getAttribute('y'), em = +t.getAttribute('font-size');
    const str = t.textContent;
    const scale = EM_PX / em;
    const W = Math.ceil(vb[2] * scale), H = Math.ceil(vb[3] * scale);
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c.getContext('2d', { willReadFrequently: true }); };
    const a = mk(), b = mk();
    a.setTransform(scale, 0, 0, scale, 0, 0); a.fillStyle = '#000'; a.fill(new Path2D(d));
    b.setTransform(scale, 0, 0, scale, 0, 0); b.fillStyle = '#000';
    b.font = em + 'px TiroVerify'; b.textBaseline = 'alphabetic'; b.direction = 'ltr';
    b.fillText(str, originX, baselineY);
    const da = a.getImageData(0, 0, W, H).data, db = b.getImageData(0, 0, W, H).data;
    let both = 0, onlyA = 0, onlyB = 0;
    for (let i = 3; i < da.length; i += 4) {
      const A = da[i] > 127, B = db[i] > 127;
      if (A && B) both++; else if (A) onlyA++; else if (B) onlyB++;
    }
    const iou = both / (both + onlyA + onlyB || 1);
    const ok = iou >= THRESHOLD;
    el.className = 'score ' + (ok ? 'pass' : 'fail');
    el.textContent = (ok ? 'PASS  ' : 'FAIL  ') + 'IoU ' + iou.toFixed(4) +
      '   ours-only ' + onlyA + 'px   browser-only ' + onlyB + 'px';
    rows.push({ key, str, iou: +iou.toFixed(4), onlyA, onlyB, ok });
  }
  const failed = rows.filter(r => !r.ok);
  const min = Math.min(...rows.map(r => r.iou));
  const s = document.getElementById('summary');
  s.className = failed.length ? 'fail' : 'pass';
  s.textContent = failed.length
    ? failed.length + ' of ' + rows.length + ' FAILED  (worst IoU ' + min.toFixed(4) + '): ' + failed.map(r => r.key).join(', ')
    : 'PASS — all ' + rows.length + ' strings match the browser (worst IoU ' + min.toFixed(4) + ', threshold ' + THRESHOLD + ')';
  return { total: rows.length, failed: failed.length, minIoU: min, rows };
};
window.__verifyResult = null;
window.__verify().then(r => { window.__verifyResult = r; });
</script>
`,
  'utf8',
)

/* ── summary ─────────────────────────────────────────────────────────────── */
const pad = (s, n) => String(s).padEnd(n)
console.log(`\nfont   ${path.relative(root, fontPath)}  (upem ${upem})`)
console.log(`out    public/dev/*.svg  +  content/devanagari.generated.json`)
console.log(`verify scripts/.verify/index.html\n`)
console.log(pad('key', 16) + pad('glyphs', 8) + pad('size', 14) + 'text')
console.log('─'.repeat(72))
for (const r of report) {
  console.log(pad(r.key, 16) + pad(r.glyphs, 8) + pad(r.status, 14) + r.text)
}
console.log('')

font.destroy?.()
face.destroy?.()
blob.destroy?.()

if (failed > 0) {
  console.error(`✗ ${failed} string(s) failed to shape. Nothing downstream may be built on this.`)
  process.exit(1)
}
console.log(`✓ ${report.length} strings shaped.`)
console.log(`  Now open scripts/.verify/index.html and confirm the magenta sits on the black.`)
