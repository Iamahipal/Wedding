import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'

import { outline, outlineSvg } from './devanagari'

export interface ExtrudeOptions {
  /** extrusion depth, as a fraction of the text's height */
  depth?: number
  bevel?: number
  bevelSegments?: number
  curveSegments?: number
}

/**
 * SVG is Y-down. three is Y-up. Mirroring on Y **reverses triangle winding**,
 * so every face ends up back-facing and `computeVertexNormals` points every
 * normal into the solid — the text then lights as though it were inside-out,
 * which looks like a broken material rather than like a broken transform and
 * costs an hour before anyone suspects the axis flip.
 *
 * So the winding is flipped back, explicitly, before normals are computed.
 * ExtrudeGeometry hands back non-indexed geometry, but this handles both.
 */
function flipWinding(geometry: THREE.BufferGeometry) {
  const index = geometry.getIndex()
  if (index) {
    const a = index.array as Uint16Array | Uint32Array
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i + 1]
      a[i + 1] = a[i + 2]
      a[i + 2] = t
    }
    index.needsUpdate = true
    return
  }
  for (const name of Object.keys(geometry.attributes)) {
    const attr = geometry.attributes[name] as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    const n = attr.itemSize
    for (let i = 0; i + n * 3 <= arr.length; i += n * 3) {
      for (let k = 0; k < n; k++) {
        const p = i + n + k
        const q = i + n * 2 + k
        const t = arr[p]
        arr[p] = arr[q]
        arr[q] = t
      }
    }
    attr.needsUpdate = true
  }
}

/**
 * Build extruded, bevelled 3D geometry for one of the shaped Devanagari
 * strings. The result is normalised to exactly 1 world unit tall and centred on
 * its own bounding box, so callers can scale it to whatever fraction of the
 * viewport the shot calls for without knowing anything about font units.
 */
export function devanagariGeometry(key: string, opts: ExtrudeOptions = {}) {
  const o = outline(key)
  const { depth = 0.22, bevel = 0.022, bevelSegments = 3, curveSegments = 6 } = opts

  const parsed = new SVGLoader().parse(outlineSvg(key))
  const shapes: THREE.Shape[] = []
  for (const path of parsed.paths) {
    // toShapes resolves the counters — the holes in ठ, ढ, फ and the rest —
    // into Shape holes rather than leaving them as separate filled contours.
    // (SVGLoader.createShapes is the same thing, deprecated in three r185.)
    shapes.push(...path.toShapes())
  }
  if (shapes.length === 0) throw new Error(`devanagariGeometry("${key}"): no shapes`)

  // extrusion parameters are given as fractions of the height, so convert them
  // into the font units the shapes are still in
  const u = o.height
  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: depth * u,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel * u,
    bevelSize: bevel * u * 0.85,
    bevelOffset: 0,
    bevelSegments,
    curveSegments,
    steps: 1,
  })

  const s = 1 / u
  geometry.scale(s, -s, s) // font units → world units, and Y-down → Y-up
  flipWinding(geometry)
  geometry.computeVertexNormals()
  geometry.center()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  return geometry
}

/** Width of the normalised geometry, in world units (its height is 1). */
export function devanagariAspect(key: string) {
  const o = outline(key)
  return o.width / o.height
}
