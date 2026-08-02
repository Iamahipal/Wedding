/**
 * A very small absolute-path transformer.
 *
 * HarfBuzz's glyphToPath emits only M / L / Q / C / Z, all absolute. We still
 * parse a slightly wider grammar and *throw* on anything outside it, because
 * the entire point of this pipeline is that nobody downstream can proofread the
 * result: a silently mis-transformed glyph would ship.
 */

const NUM = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g

export function parsePath(d) {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? []
  const segs = []
  let i = 0
  let cmd = null
  let cx = 0
  let cy = 0
  let sx = 0
  let sy = 0
  let prevCtrl = null

  const num = () => {
    const t = tokens[i++]
    const v = Number(t)
    if (!Number.isFinite(v)) throw new Error(`svgpath: expected a number, got ${JSON.stringify(t)}`)
    return v
  }

  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++]
    if (cmd === null) throw new Error('svgpath: path data does not start with a command')
    const rel = cmd === cmd.toLowerCase() && cmd !== 'Z' && cmd !== 'z'
    const C = cmd.toUpperCase()

    if (C === 'Z') {
      segs.push({ c: 'Z' })
      cx = sx
      cy = sy
      prevCtrl = null
      continue
    }

    const ox = rel ? cx : 0
    const oy = rel ? cy : 0

    switch (C) {
      case 'M': {
        const x = num() + ox
        const y = num() + oy
        segs.push({ c: 'M', p: [x, y] })
        cx = sx = x
        cy = sy = y
        // subsequent implicit pairs after M are lineto
        cmd = rel ? 'l' : 'L'
        prevCtrl = null
        break
      }
      case 'L': {
        const x = num() + ox
        const y = num() + oy
        segs.push({ c: 'L', p: [x, y] })
        cx = x
        cy = y
        prevCtrl = null
        break
      }
      case 'H': {
        const x = num() + ox
        segs.push({ c: 'L', p: [x, cy] })
        cx = x
        prevCtrl = null
        break
      }
      case 'V': {
        const y = num() + oy
        segs.push({ c: 'L', p: [cx, y] })
        cy = y
        prevCtrl = null
        break
      }
      case 'Q': {
        const x1 = num() + ox
        const y1 = num() + oy
        const x = num() + ox
        const y = num() + oy
        segs.push({ c: 'Q', p: [x1, y1, x, y] })
        prevCtrl = ['Q', x1, y1]
        cx = x
        cy = y
        break
      }
      case 'T': {
        let x1 = cx
        let y1 = cy
        if (prevCtrl && prevCtrl[0] === 'Q') {
          x1 = 2 * cx - prevCtrl[1]
          y1 = 2 * cy - prevCtrl[2]
        }
        const x = num() + ox
        const y = num() + oy
        segs.push({ c: 'Q', p: [x1, y1, x, y] })
        prevCtrl = ['Q', x1, y1]
        cx = x
        cy = y
        break
      }
      case 'C': {
        const x1 = num() + ox
        const y1 = num() + oy
        const x2 = num() + ox
        const y2 = num() + oy
        const x = num() + ox
        const y = num() + oy
        segs.push({ c: 'C', p: [x1, y1, x2, y2, x, y] })
        prevCtrl = ['C', x2, y2]
        cx = x
        cy = y
        break
      }
      case 'S': {
        let x1 = cx
        let y1 = cy
        if (prevCtrl && prevCtrl[0] === 'C') {
          x1 = 2 * cx - prevCtrl[1]
          y1 = 2 * cy - prevCtrl[2]
        }
        const x2 = num() + ox
        const y2 = num() + oy
        const x = num() + ox
        const y = num() + oy
        segs.push({ c: 'C', p: [x1, y1, x2, y2, x, y] })
        prevCtrl = ['C', x2, y2]
        cx = x
        cy = y
        break
      }
      default:
        throw new Error(
          `svgpath: unsupported command "${cmd}". Arcs and anything else are refused on purpose — ` +
            `a silently mishandled segment in a script you cannot proofread is exactly the failure ` +
            `this pipeline exists to prevent.`,
        )
    }
  }
  return segs
}

/** Apply x' = sx*x + tx, y' = sy*y + ty to every coordinate. */
export function transformPath(segs, sx, sy, tx, ty) {
  const fx = (x) => sx * x + tx
  const fy = (y) => sy * y + ty
  return segs.map((s) => {
    if (s.c === 'Z') return s
    const p = s.p.slice()
    for (let k = 0; k < p.length; k += 2) {
      p[k] = fx(p[k])
      p[k + 1] = fy(p[k + 1])
    }
    return { c: s.c, p }
  })
}

const r = (v, digits = 2) => {
  const n = Number(v.toFixed(digits))
  return Object.is(n, -0) ? 0 : n
}

export function serializePath(segs, digits = 2) {
  let out = ''
  for (const s of segs) {
    if (s.c === 'Z') {
      out += 'Z'
      continue
    }
    out += s.c + s.p.map((v) => r(v, digits)).join(' ')
  }
  return out
}

/**
 * Tight bounds. Curves are flattened rather than bounded by their control
 * points — a control-point box on Devanagari is noticeably loose around the
 * shirorekha and would leave the viewBox padded on one side only.
 */
export function bounds(segs, samples = 12) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let cx = 0
  let cy = 0
  let startX = 0
  let startY = 0

  const hit = (x, y) => {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }

  for (const s of segs) {
    if (s.c === 'M') {
      ;[cx, cy] = s.p
      startX = cx
      startY = cy
      hit(cx, cy)
    } else if (s.c === 'L') {
      ;[cx, cy] = s.p
      hit(cx, cy)
    } else if (s.c === 'Q') {
      const [x1, y1, x, y] = s.p
      for (let k = 1; k <= samples; k++) {
        const t = k / samples
        const u = 1 - t
        hit(u * u * cx + 2 * u * t * x1 + t * t * x, u * u * cy + 2 * u * t * y1 + t * t * y)
      }
      cx = x
      cy = y
    } else if (s.c === 'C') {
      const [x1, y1, x2, y2, x, y] = s.p
      for (let k = 1; k <= samples; k++) {
        const t = k / samples
        const u = 1 - t
        hit(
          u * u * u * cx + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x,
          u * u * u * cy + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y,
        )
      }
      cx = x
      cy = y
    } else if (s.c === 'Z') {
      cx = startX
      cy = startY
    }
  }

  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

export { NUM }
