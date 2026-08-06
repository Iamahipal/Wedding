import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'

import { outline, outlineSvg } from './devanagari'
import { mulberry32 } from './math'

/**
 * Scatter N points evenly *inside* a shaped Devanagari string.
 *
 * Used by Vayu to give every particle somewhere to land when the two breaths
 * resolve into प्राण. The letterform is the same committed outline the rest of
 * the film draws from, so the word the particles assemble is the same word,
 * shaped once by HarfBuzz, that appears everywhere else.
 *
 * Sampling is **area-weighted across the triangulation**, which is the whole
 * trick. Rejection-sampling a bounding box wastes most of its attempts on a
 * script this open, and — worse — sampling triangles uniformly rather than by
 * area piles points into the many tiny slivers a curve tessellates into and
 * leaves the thick strokes and the shirorekha visibly starved.
 */
export function sampleOutlinePoints(key: string, count: number, seed = 0x7a11): Float32Array {
  const o = outline(key)
  const parsed = new SVGLoader().parse(outlineSvg(key))

  const shapes: THREE.Shape[] = []
  for (const path of parsed.paths) shapes.push(...path.toShapes())
  if (!shapes.length) throw new Error(`sampleOutlinePoints("${key}"): no shapes`)

  const geo = new THREE.ShapeGeometry(shapes, 8)
  const pos = geo.attributes.position
  const index = geo.getIndex()
  const triCount = index ? index.count / 3 : pos.count / 3

  // cumulative area, so a triangle is chosen in proportion to how much of the
  // letterform it actually covers
  const cumulative = new Float64Array(triCount)
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const ab = new THREE.Vector3()
  const ac = new THREE.Vector3()
  let total = 0

  const vert = (t: number, k: number, out: THREE.Vector3) => {
    const i = index ? index.getX(t * 3 + k) : t * 3 + k
    out.set(pos.getX(i), pos.getY(i), 0)
  }

  for (let t = 0; t < triCount; t++) {
    vert(t, 0, a)
    vert(t, 1, b)
    vert(t, 2, c)
    ab.subVectors(b, a)
    ac.subVectors(c, a)
    total += ab.cross(ac).length() * 0.5
    cumulative[t] = total
  }

  const rand = mulberry32(seed)
  const out = new Float32Array(count * 3)

  // normalise to a height of exactly 1, centred — same convention as
  // devanagariGeometry, so callers scale both the same way
  const s = 1 / o.height
  const cx = o.width * 0.5
  const cy = o.height * 0.5

  for (let i = 0; i < count; i++) {
    // binary search the cumulative area for this sample
    const target = rand() * total
    let lo = 0
    let hi = triCount - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cumulative[mid] < target) lo = mid + 1
      else hi = mid
    }

    vert(lo, 0, a)
    vert(lo, 1, b)
    vert(lo, 2, c)

    // uniform barycentric point in the triangle
    let u = rand()
    let v = rand()
    if (u + v > 1) {
      u = 1 - u
      v = 1 - v
    }

    const x = a.x + (b.x - a.x) * u + (c.x - a.x) * v
    const y = a.y + (b.y - a.y) * u + (c.y - a.y) * v

    out[i * 3] = (x - cx) * s
    // SVG is Y-down and three is Y-up
    out[i * 3 + 1] = -(y - cy) * s
    out[i * 3 + 2] = 0
  }

  geo.dispose()
  return out
}

/** Width of the normalised sample cloud, in the same units (height = 1). */
export function outlineAspectRatio(key: string) {
  const o = outline(key)
  return o.width / o.height
}
