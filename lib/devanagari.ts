import raw from '@/content/devanagari.generated.json'

/**
 * The output of `npm run devanagari` — every Devanagari string in the film,
 * already shaped by HarfBuzz and reduced to a single outline.
 *
 * It is inlined rather than fetched. 50KB of path data in the bundle buys the
 * removal of an entire class of failure: no webfont race, no fetch on the
 * critical path of the first thing the viewer sees, no basePath mistake that
 * only shows up in production, and no possibility of the text re-shaping
 * differently on somebody else's machine.
 */
export interface Outline {
  text: string
  /** viewBox width/height, in font units */
  width: number
  height: number
  /** where the font baseline sits, in this outline's own coordinates */
  baselineY: number
  originX: number
  upem: number
  advance: number
  glyphCount: number
  /** a single nonzero-fill path containing every glyph */
  d: string
}

export const outlines = raw as unknown as Record<string, Outline>

export function outline(key: string): Outline {
  const o = outlines[key]
  if (!o) {
    throw new Error(
      `No shaped outline for "${key}". Add the string to content/devanagari.json and run \`npm run devanagari\`.`,
    )
  }
  return o
}

/** A standalone SVG document for this outline — what SVGLoader wants to parse. */
export function outlineSvg(key: string): string {
  const o = outline(key)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${o.width} ${o.height}">` +
    `<path fill="#000000" fill-rule="nonzero" d="${o.d}"/></svg>`
  )
}

/** Aspect ratio, for laying the outline out without measuring the DOM. */
export function outlineAspect(key: string): number {
  const o = outline(key)
  return o.width / o.height
}
